// File: src/user/user_tab.js

// Impor fungsi-fungsi komponen UI dari file terpisah
import { renderUserProfileCard } from "./user_profile_card.js";
import { renderReferralDetails } from "./user_referral_section.js";
import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../lib/crypto-utils.js';

// Re-export for backward compatibility
export { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL };

/**
 * Fungsi utilitas untuk menampilkan notifikasi kustom.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} isError - True jika pesan adalah error, false jika notifikasi biasa.
 */
export function showCustomNotification(message, isError = false) {
  let notificationDiv = document.getElementById("custom-notification");
  if (!notificationDiv) {
    notificationDiv = document.createElement("div");
    notificationDiv.id = "custom-notification";
    document.body.appendChild(notificationDiv);
  }

  notificationDiv.textContent = message;
  notificationDiv.style.backgroundColor = isError ? "#d32f2f" : "#6c4cb3"; // Merah untuk error, ungu untuk sukses
  notificationDiv.style.display = "block";
  notificationDiv.style.position = "fixed";
  notificationDiv.style.bottom = "20px";
  notificationDiv.style.left = "50%";
  notificationDiv.style.transform = "translateX(-50%)";
  notificationDiv.style.padding = "10px 20px";
  notificationDiv.style.borderRadius = "8px";
  notificationDiv.style.color = "#ffffff";
  notificationDiv.style.zIndex = "1000";
  notificationDiv.style.textAlign = "center";
  notificationDiv.style.opacity = "0";
  notificationDiv.style.transition = "opacity 0.3s ease-in-out";

  setTimeout(() => {
    notificationDiv.style.opacity = "1";
  }, 10);

  setTimeout(
    () => {
      notificationDiv.style.opacity = "0";
      setTimeout(() => {
        notificationDiv.style.display = "none";
      }, 300);
    },
    isError ? 5000 : 3000
  );
}

/**
 * Merender bagian Referral Section di dalam <div id="referral-section">.
 * Menampilkan tombol login atau data referral jika sudah login.
 * @param {boolean} forceRefresh - Force refresh data from API even if already loaded
 */
export async function renderReferralSection(forceRefresh = false) {
  const container = document.getElementById("referral-section");
  if (!container) return;

  // Prevent multiple simultaneous renders with timeout
  if (container.dataset.rendering === 'true') {
    console.log("[UserTab] Already rendering, skipping...");
    return;
  }
  
  // Set timeout to clear rendering flag if stuck
  const renderTimeout = setTimeout(() => {
    if (container.dataset.rendering === 'true') {
      console.log("[UserTab] Rendering timeout, clearing flag");
      container.dataset.rendering = 'false';
    }
  }, 10000); // 10 second timeout
  
  container.dataset.rendering = 'true';
  container.innerHTML = ""; // Bersihkan konten sebelumnya

  const storedData = await chrome.storage.local.get([
    "accessToken",
    "id",
    "twitterId",
    "googleId",
    "expiresAt",
    "loginType",
  ]);

  if (storedData.accessToken) {
    // User sudah login: tampilkan loading state
    container.innerHTML = `
      <div class="loading-container">
        <div class="shimmer avatar" style="width:60px;height:60px;margin-bottom:15px;"></div>
        <div class="shimmer text-line" style="width:80%;height:16px;margin-bottom:10px;"></div>
        <div class="shimmer small-line" style="width:50%;height:12px;"></div>
        <p class="loading-text">Loading fresh user data...</p>
      </div>
    `;

    let userProfileData = null;
    try {
      console.log("[UserTab] Fetching fresh /user/me data...");
      const currentTimestamp = Date.now().toString();
      const signature = generateForuSignature("GET", "", currentTimestamp);

      const meResponse = await fetch(
        `${API_BASE_URL}/v1/user/me`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            Authorization: `Bearer ${storedData.accessToken}`,
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
          },
        }
      );

      // Tangani 401 Unauthorized: auto logout dan tampilkan login
      if (meResponse.status === 401) {
        await chrome.storage.local.remove([
          "accessToken",
          "id",
          "twitterId",
          "googleId",
          "expiresAt",
          "loginType",
        ]);
        showCustomNotification("Session expired, please log in again", true);
        container.innerHTML = "";
        clearTimeout(renderTimeout);
        container.dataset.rendering = 'false';
        // Prevent recursive call by using a small delay
        setTimeout(() => {
          renderReferralSection();
        }, 100);
        return;
      }

      if (!meResponse.ok) {
        const errorBody = await meResponse.text();
        throw new Error(
          `HTTP error! status: ${meResponse.status}. Response: ${errorBody}`
        );
      }

      const meData = await meResponse.json();
      if (meData?.code === 200 && meData.data) {
        userProfileData = meData.data;
        console.log("[UserTab] /user/me data fetched successfully");
      } else {
        console.error("Invalid /user/me response:", meData);
      }
    } catch (error) {
      console.error("Error fetching user profile data:", error);
      // Clear rendering flag on error
      container.dataset.rendering = 'false';
      clearTimeout(renderTimeout);
      // Show error state instead of stuck loading
      container.innerHTML = `
        <div class="error-container">
          <p class="error-text">Failed to load user data</p>
          <button class="retry-button" onclick="window.Foru.forceRefreshUserTab()">
            Retry
          </button>
        </div>
      `;
      return;
    }

    // Check user onboarding flow based on /v1/user/me response
    container.innerHTML = "";

    // Check if name is empty - show name input form
    if (!userProfileData?.name || userProfileData.name.trim() === "") {
      await renderNameInputForm(container, storedData, userProfileData);
      return;
    }

    // Check if referral is not used - show referral form
    if (userProfileData?.referral?.used === false) {
      await renderReferralInputForm(container, storedData, userProfileData);
      return;
    }

    // Normal flow - show full user profile
    // Clear container first to prevent duplication
    container.innerHTML = "";
    
    // Render profile card first
    await renderUserProfileCard(
      userProfileData,
      storedData,
      renderReferralSection,
      forceRefresh
    );

    // Then render invitation codes after profile card
    await renderReferralDetails(userProfileData, forceRefresh);

    // Add logout button at the bottom (check if it doesn't exist first)
    if (!document.getElementById("logout-container")) {
      const logoutContainer = document.createElement("div");
      logoutContainer.id = "logout-container";
      logoutContainer.innerHTML = `
        <div class="version-container">
          <p class="version-text">v.1.0.0-alpha</p>
        </div>
        <button id="logout-btn" class="logout-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16,17 21,12 16,7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      `;
      container.appendChild(logoutContainer);
    }

    // Clear rendering flag and timeout
    container.dataset.rendering = 'false';
    clearTimeout(renderTimeout);

    // Add logout confirmation popup (check if it doesn't exist first)
    if (!document.getElementById("logout-confirmation")) {
      const confirmationPopup = document.createElement("div");
      confirmationPopup.id = "logout-confirmation";
      confirmationPopup.innerHTML = `
        <div class="popup-overlay">
          <div class="popup-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout from your account?</p>
            <div class="popup-buttons">
              <button id="confirm-logout-btn" class="confirm-btn">Yes, Logout</button>
              <button id="cancel-logout-btn" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      `;
      confirmationPopup.style.display = "none";
      document.body.appendChild(confirmationPopup);
    }

    // Event listeners for logout
    const logoutBtn = document.getElementById("logout-btn");
    const cancelBtn = document.getElementById("cancel-logout-btn");
    const confirmBtn = document.getElementById("confirm-logout-btn");
    const popupOverlay = document.querySelector(
      "#logout-confirmation .popup-overlay"
    );

    if (logoutBtn && !logoutBtn.hasAttribute("data-listener-added")) {
      logoutBtn.addEventListener("click", () => {
        document.getElementById("logout-confirmation").style.display = "flex";
      });
      logoutBtn.setAttribute("data-listener-added", "true");
    }

    if (cancelBtn && !cancelBtn.hasAttribute("data-listener-added")) {
      cancelBtn.addEventListener("click", () => {
        document.getElementById("logout-confirmation").style.display = "none";
      });
      cancelBtn.setAttribute("data-listener-added", "true");
    }

    if (confirmBtn && !confirmBtn.hasAttribute("data-listener-added")) {
      confirmBtn.addEventListener("click", async () => {
        try {
          await chrome.storage.local.remove([
            "accessToken",
            "id",
            "twitterId",
            "googleId",
            "expiresAt",
            "loginType",
            "email",
          ]);

          showCustomNotification("Successfully logged out");
          document.getElementById("logout-confirmation").style.display = "none";

          // Reload the referral section to show login buttons
          setTimeout(() => {
            renderReferralSection();
          }, 500);
        } catch (error) {
          console.error("Error during logout:", error);
          showCustomNotification("Error occurred during logout", true);
        }
      });
      confirmBtn.setAttribute("data-listener-added", "true");
    }

    // Close popup when clicking overlay
    if (popupOverlay && !popupOverlay.hasAttribute("data-listener-added")) {
      popupOverlay.addEventListener("click", (e) => {
        if (e.target.classList.contains("popup-overlay")) {
          document.getElementById("logout-confirmation").style.display = "none";
        }
      });
      popupOverlay.setAttribute("data-listener-added", "true");
    }
  } else {
    // User belum login: tampilkan tombol login
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
        <img src="${chrome.runtime.getURL(
          "icons/icon128.png"
        )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;filter:grayscale(100%);opacity:0.7;">
        <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;line-height:1.5;">Please log in to get your social profile data.</p>
        <button id="login-twitter-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 25px;background-color:#1DA1F2;color:#ffffff;border:none;border-radius:9999px;cursor:pointer;font-size:15px;font-weight:bold;min-width:200px;box-sizing:border-box;margin-bottom:10px;">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.21-6.914L4.93 21.75H1.625l7.844-8.914L0 2.25h8.08L12 10.74 18.244 2.25zm-1.54 1.3L8.14 19.5h2.917l7.585-16.25h-2.916z"></path></g></svg>
          Login with Twitter
        </button>

        <button id="login-email-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 25px;background-color:#28a745;color:#ffffff;border:none;border-radius:9999px;cursor:pointer;font-size:15px;font-weight:bold;min-width:200px;box-sizing:border-box;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          Login with Email
        </button>
      </div>
      <div id="email-login-form" style="display:none;padding:20px;box-sizing:border-box;">
        <h3 style="color:#ececf1;margin-bottom:15px;text-align:center;">Login with Email</h3>
        <div style="display:flex;justify-content:center;margin-bottom:20px;">
          <img src="${chrome.runtime.getURL(
            "images/sms_icon.svg"
          )}" alt="Email" style="width:64px;height:64px;" />
        </div>
        <div style="margin-bottom:15px;">
          <input id="email-input" type="email" placeholder="Enter your email address" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        <button id="email-login-submit-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Send OTP
        </button>
        <button id="back-to-login-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Login Method
        </button>
      </div>
      <div id="otp-verification-form" style="display:none;padding:20px;box-sizing:border-box;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
          <!-- 1. Logo email (on black background) -->
          <img src="${chrome.runtime.getURL(
            "images/sms_icon.svg"
          )}" alt="Email Icon" style="width:60px;height:60px;margin-bottom:15px;">
          
          <!-- 2. Text check your email (on black background) -->
          <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Check your email</h3>
          
          <!-- 3. Text we've sent... (on black background) -->
          <p id="otp-message" style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">We've sent a secure link to your email</p>
          
          <!-- Dark gray container for interactive elements -->
          <div style="background:#20232d;border-radius:32px;padding:24px;width:100%;max-width:300px;">
            <!-- 4. 6 input digit -->
            <div style="margin-bottom:15px;">
              <div style="display:flex;gap:8px;justify-content:center;margin-bottom:15px;">
                <input id="otp-input-1" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
                <input id="otp-input-2" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
                <input id="otp-input-3" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
                <input id="otp-input-4" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
                <input id="otp-input-5" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
                <input id="otp-input-6" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
              </div>
            </div>
            
            <!-- 5. Tombol submit OTP -->
            <button id="otp-verify-btn" style="width:100%;padding:8px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:15px;">
              Submit OTP
            </button>
            
            <!-- 6. Tulisan didn't receive it... -->
            <div style="text-align:center;margin-bottom:10px;">
              <p style="color:#aeb0b6;font-size:12px;margin:0 0 4px 0;">Didn't receive it?</p>
              <p style="color:#aeb0b6;font-size:12px;margin:0 0 4px 0;">Check your spam or promotions folder</p>
              <p style="color:#aeb0b6;font-size:12px;margin:0;">or</p>
            </div>
            
            <!-- 7. Tombol resend OTP -->
            <button id="resend-otp-btn" style="width:100%;padding:8px;background:#6b7280;color:#9ca3af;border:1px solid rgba(0,0,0,0.25);border-radius:8px;cursor:not-allowed;font-size:14px;margin-bottom:10px;" disabled>
              <span id="resend-text">Resend OTP</span> <span id="countdown-text">(60s)</span>
            </button>
            
            <!-- 8. Tombol back to email input -->
            <button id="back-to-email-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
              Back to Email Input
            </button>
          </div>
        </div>
      </div>
    `;

    // Clear rendering flag for non-logged in users
    container.dataset.rendering = 'false';
    clearTimeout(renderTimeout);

    // Tambahkan handlers untuk tombol login
    document
      .getElementById("login-twitter-btn")
      .addEventListener("click", async () => {
        try {
          const backendUrl =
            `${API_BASE_URL}/v1/user-auth/twitter`;
          const redirectUrlParam = encodeURIComponent(
            "https://x.com/4UAICrypto"
          );
          const fetchUrl = `${backendUrl}?redirect_uri=${redirectUrlParam}`;

          console.log("Fetching Twitter login URL from backend:", fetchUrl);

          const response = await fetch(fetchUrl);
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
              `HTTP error! status: ${response.status}. Response: ${errorBody}`
            );
          }
          const data = await response.json();

          if (
            data &&
            data.code === 200 &&
            typeof data.data === "string" &&
            data.data.startsWith("http")
          ) {
            chrome.tabs.create({ url: data.data });
          } else {
            console.error("Invalid backend response:", data);
            const errorMessage = data.message || "Unknown error format.";
            showCustomNotification(
              `Failed to get authentication URL: ${errorMessage}`,
              true
            );
          }
        } catch (error) {
          console.error("Error during Twitter login initiation:", error);
          showCustomNotification(
            `Failed to start Twitter login process. Error: ${
              error.message || "Unknown error"
            }. Please try again.`,
            true
          );
        }
      });

    // State variables for email login
    let currentEmail = "";

    // State management functions
    function saveLoginState(state, email = "") {
      localStorage.setItem('foru_login_state', state);
      if (email) {
        localStorage.setItem('foru_current_email', email);
      }
      console.log('[ForU] State saved:', state, 'Email:', email);
    }

    function saveCountdownTime(remainingTime) {
      localStorage.setItem('foru_countdown_time', remainingTime.toString());
      localStorage.setItem('foru_countdown_start', Date.now().toString());
      console.log('[ForU] Countdown saved:', remainingTime, 'seconds');
    }

    function getCountdownTime() {
      const savedTime = localStorage.getItem('foru_countdown_time');
      const savedStart = localStorage.getItem('foru_countdown_start');
      
      if (savedTime && savedStart) {
        const startTime = parseInt(savedStart);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, parseInt(savedTime) - elapsed);
        console.log('[ForU] Countdown calculation - saved:', savedTime, 'elapsed:', elapsed, 'remaining:', remaining);
        return remaining;
      }
      return 0;
    }

    function clearCountdownTime() {
      localStorage.removeItem('foru_countdown_time');
      localStorage.removeItem('foru_countdown_start');
      console.log('[ForU] Countdown cleared');
    }

    function getLoginState() {
      return localStorage.getItem('foru_login_state') || 'login_buttons';
    }

    function getCurrentEmail() {
      return localStorage.getItem('foru_current_email') || "";
    }

    function clearLoginState() {
      localStorage.removeItem('foru_login_state');
      localStorage.removeItem('foru_current_email');
      clearCountdownTime();
    }

    // Helper functions to show/hide forms
    function showLoginButtons() {
      document.getElementById("login-twitter-btn").parentElement.style.display =
        "flex";
      document.getElementById("email-login-form").style.display = "none";
      document.getElementById("otp-verification-form").style.display = "none";
      saveLoginState('login_buttons');
    }

    function showEmailForm() {
      console.log('[ForU] Showing email form');
      document.getElementById("login-twitter-btn").parentElement.style.display =
        "none";
      document.getElementById("email-login-form").style.display = "block";
      document.getElementById("otp-verification-form").style.display = "none";
      saveLoginState('email_form');
    }

    function showOtpForm() {
      console.log('[ForU] Showing OTP form');
      document.getElementById("login-twitter-btn").parentElement.style.display =
        "none";
      document.getElementById("email-login-form").style.display = "none";
      document.getElementById("otp-verification-form").style.display = "block";
      saveLoginState('otp_form');
    }

    // Restore state on page load
    function restoreLoginState() {
      const savedState = getLoginState();
      const savedEmail = getCurrentEmail();
      
      console.log('[ForU] Saved state:', savedState);
      console.log('[ForU] Saved email:', savedEmail);
      
      if (savedEmail) {
        currentEmail = savedEmail;
      }

      switch (savedState) {
        case 'email_form':
          console.log('[ForU] Restoring to email form');
          showEmailForm();
          if (savedEmail) {
            const emailInput = document.getElementById("email-input");
            if (emailInput) {
              emailInput.value = savedEmail;
              console.log('[ForU] Email input restored:', savedEmail);
            }
          }
          break;
        case 'otp_form':
          console.log('[ForU] Restoring to OTP form');
          showOtpForm();
          clearOTPInputs(); // Clear any existing OTP inputs
          if (savedEmail) {
            const otpMessage = document.getElementById("otp-message");
            if (otpMessage) {
              otpMessage.innerHTML = `We've sent a secure link to <strong>${savedEmail}</strong>`;
              console.log('[ForU] OTP message restored for:', savedEmail);
            }
            // Restore countdown with remaining time
            const remainingTime = getCountdownTime();
            if (remainingTime > 0) {
              console.log('[ForU] Restoring countdown with', remainingTime, 'seconds remaining');
              startResendCountdown(remainingTime);
            } else {
              console.log('[ForU] No active countdown to restore');
            }
          }
          break;
        default:
          console.log('[ForU] Restoring to login buttons (default)');
          showLoginButtons();
          break;
      }
    }

    // Email login button handler
    document.getElementById("login-email-btn").addEventListener("click", () => {
      console.log('[ForU] Login with email clicked');
      showEmailForm();
      document.getElementById("email-input").focus();
    });

    // Back to login options handler
    document
      .getElementById("back-to-login-btn")
      .addEventListener("click", () => {
        showLoginButtons();
        document.getElementById("email-input").value = "";
        clearLoginState();
      });

    // Back to email input handler
    document
      .getElementById("back-to-email-btn")
      .addEventListener("click", () => {
        showEmailForm();
        clearOTPInputs();
        saveLoginState('email_form', currentEmail);
      });

    // Email form submission handler
    document
      .getElementById("email-login-submit-btn")
      .addEventListener("click", async () => {
        const emailInput = document.getElementById("email-input");
        const email = emailInput.value.trim();

        if (!email) {
          showCustomNotification("Please enter your email address", true);
          return;
        }

        if (!isValidEmail(email)) {
          showCustomNotification("Please enter a valid email address", true);
          return;
        }

        currentEmail = email;
        saveLoginState('email_form', email);
        console.log('[ForU] Email submitted:', email);
        const submitBtn = document.getElementById("email-login-submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending...";
        submitBtn.disabled = true;

        try {
          const currentTimestamp = Date.now().toString();
          const payload = { email: email };
          const signature = generateForuSignature(
            "POST",
            payload,
            currentTimestamp
          );

          const response = await fetch(
            `${API_BASE_URL}/v1/user-auth/otp/request`,
            {
              method: "POST",
              headers: {
                accept: "application/json",
                "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
                "Content-Type": "application/json",
                "x-foru-timestamp": currentTimestamp,
                "x-foru-signature": signature,
              },
              body: JSON.stringify(payload),
            }
          );

          const data = await response.json();

          if (response.status === 404) {
            // first show empty notification to create container
            showCustomNotification("", true);
            setTimeout(() => {
              const notification = document.getElementById(
                "custom-notification"
              );
              if (notification) {
                notification.innerHTML = "";
                const textPart1 = document.createTextNode(
                  "This email is not registered yet, please register on our "
                );
                const linkPart = document.createElement("span");
                linkPart.textContent = "website";
                linkPart.style.textDecoration = "underline";
                linkPart.style.cursor = "pointer";
                linkPart.addEventListener("click", () => {
                  chrome.tabs.create({
                    url: "https://social.foruai.io/register",
                  });
                });
                notification.appendChild(textPart1);
                notification.appendChild(linkPart);
              }
            }, 10);
          } else if (response.status === 201 && data.code === 201) {
            showCustomNotification("We sent you an OTP code on your email");
            document.getElementById(
              "otp-message"
            ).innerHTML = `We've sent a secure link to <strong>${email}</strong>`;
            showOtpForm();
            saveLoginState('otp_form', email);
            console.log('[ForU] OTP sent successfully, state saved as otp_form');
            // Only start new countdown if no active countdown exists
            const existingCountdown = getCountdownTime();
            if (existingCountdown <= 0) {
              startResendCountdown();
            } else {
              console.log('[ForU] Using existing countdown:', existingCountdown, 'seconds');
              startResendCountdown(existingCountdown);
            }
            const firstOtpInput = document.getElementById("otp-input-1");
            if (firstOtpInput) {
              firstOtpInput.focus();
            }
          } else {
            throw new Error(data.message || "Failed to send OTP");
          }
        } catch (error) {
          console.error("Error during OTP request:", error);
          showCustomNotification(
            `Failed to send OTP. Error: ${error.message || "Unknown error"}`,
            true
          );
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });

    // OTP verification handler
    document
      .getElementById("otp-verify-btn")
      .addEventListener("click", async () => {
        const otp = getOTPValue();

        if (!otp || otp.length !== 6) {
          showCustomNotification("Please enter a valid 6-digit OTP code", true);
          return;
        }

        if (!currentEmail) {
          showCustomNotification("Session expired, please start again", true);
          clearLoginState();
          showLoginButtons();
          return;
        }

        const verifyBtn = document.getElementById("otp-verify-btn");
        const originalText = verifyBtn.textContent;
        verifyBtn.textContent = "Verifying...";
        verifyBtn.disabled = true;

        try {
          const currentTimestamp = Date.now().toString();
          const payload = { email: currentEmail, otp: otp };
          const signature = generateForuSignature(
            "POST",
            payload,
            currentTimestamp
          );

          const response = await fetch(
            `${API_BASE_URL}/v1/user-auth/otp/verify`,
            {
              method: "POST",
              headers: {
                accept: "application/json",
                "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
                "Content-Type": "application/json",
                "x-foru-timestamp": currentTimestamp,
                "x-foru-signature": signature,
              },
              body: JSON.stringify(payload),
            }
          );

          const data = await response.json();

          if (response.status === 201 && data.code === 201 && data.data) {
            // Save login data like other login methods
            await chrome.storage.local.set({
              accessToken: data.data.token,
              expiresAt: data.data.expires_at,
              loginType: "email",
              email: currentEmail,
            });

            showCustomNotification("Login successful!");

            // Trigger auth refresh message
            chrome.runtime.sendMessage({
              action: "authSuccessRefreshReferral",
            });

            // Reset forms and reload
            currentEmail = "";
            document.getElementById("email-input").value = "";
            clearOTPInputs();
            clearLoginState();
            showLoginButtons();

            // Reload the referral section
            setTimeout(() => {
              renderReferralSection();
            }, 1000);
          } else {
            throw new Error(data.message || "Invalid OTP code");
          }
        } catch (error) {
          console.error("Error during OTP verification:", error);
          showCustomNotification(
            `Failed to verify OTP. Error: ${error.message || "Unknown error"}`,
            true
          );
        } finally {
          verifyBtn.textContent = originalText;
          verifyBtn.disabled = false;
        }
      });

    // Allow Enter key submission for email input
    document.getElementById("email-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        document.getElementById("email-login-submit-btn").click();
      }
    });

    // OTP input management functions
    function getOTPValue() {
      let otp = '';
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp-input-${i}`);
        if (input) {
          otp += input.value;
        }
      }
      return otp;
    }

    function setOTPValue(otp) {
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp-input-${i}`);
        if (input) {
          input.value = otp.charAt(i - 1) || '';
        }
      }
    }

    function clearOTPInputs() {
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp-input-${i}`);
        if (input) {
          input.value = '';
        }
      }
    }

    // Setup OTP input event listeners
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`otp-input-${i}`);
      if (input) {
        // Keypress validation - only allow numbers
        input.addEventListener("keypress", (e) => {
          // Allow only numeric keys (0-9)
          if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
            return;
          }
        });

        // Input event - move to next field
        input.addEventListener("input", (e) => {
          const value = e.target.value;
          
          // Remove any non-numeric characters
          const numericOnly = value.replace(/[^0-9]/g, '');
          
          // Limit to 1 digit
          const limitedValue = numericOnly.substring(0, 1);
          
          // Update the input value if it changed
          if (value !== limitedValue) {
            e.target.value = limitedValue;
          }

          // Move to next field if value is entered
          if (limitedValue && i < 6) {
            const nextInput = document.getElementById(`otp-input-${i + 1}`);
            if (nextInput) {
              nextInput.focus();
            }
          }

          // Auto-submit if all 6 digits are entered
          if (i === 6 && limitedValue) {
            const fullOTP = getOTPValue();
            if (fullOTP.length === 6) {
              setTimeout(() => {
                document.getElementById("otp-verify-btn").click();
              }, 100);
            }
          }
        });

        // Backspace handling
        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !e.target.value && i > 1) {
            const prevInput = document.getElementById(`otp-input-${i - 1}`);
            if (prevInput) {
              prevInput.focus();
            }
          }
        });

        // Paste handling
        input.addEventListener("paste", (e) => {
          e.preventDefault();
          const pastedText = (e.clipboardData || window.clipboardData).getData('text');
          const numericOnly = pastedText.replace(/[^0-9]/g, '');
          
          if (numericOnly.length > 0) {
            // Distribute pasted numbers across all fields
            for (let j = 1; j <= 6; j++) {
              const fieldInput = document.getElementById(`otp-input-${j}`);
              if (fieldInput) {
                fieldInput.value = numericOnly.charAt(j - 1) || '';
              }
            }
            
            // Focus on the last filled field or first empty field
            const lastFilledIndex = Math.min(numericOnly.length, 6);
            const focusInput = document.getElementById(`otp-input-${lastFilledIndex}`);
            if (focusInput) {
              focusInput.focus();
            }
          }
        });

        // Prevent drop
        input.addEventListener("drop", (e) => {
          e.preventDefault();
        });
      }
    }

    // Allow Enter key submission for any OTP input
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`otp-input-${i}`);
      if (input) {
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            document.getElementById("otp-verify-btn").click();
          }
        });
      }
    }

    // Countdown for resend button
    function startResendCountdown(initialCountdown = null) {
      let countdown = initialCountdown !== null ? initialCountdown : 60;
      const resendBtn = document.getElementById("resend-otp-btn");
      const countdownText = document.getElementById("countdown-text");

      if (!resendBtn || !countdownText) {
        console.log('[ForU] Countdown elements not found');
        return;
      }

      resendBtn.disabled = true;
      // Set gray color when disabled
      resendBtn.style.background = "#6b7280";
      resendBtn.style.color = "#9ca3af";
      resendBtn.style.cursor = "not-allowed";

      // Update display immediately
      countdownText.textContent = `(${countdown}s)`;

      const interval = setInterval(() => {
        countdown--;
        countdownText.textContent = `(${countdown}s)`;
        
        // Save current countdown time
        saveCountdownTime(countdown);

        if (countdown <= 0) {
          clearInterval(interval);
          resendBtn.disabled = false;
          countdownText.textContent = "";
          // Reset to purple color when enabled (same as Send OTP button)
          resendBtn.style.background = "#6c4cb3";
          resendBtn.style.color = "#ffffff";
          resendBtn.style.cursor = "pointer";
          // Clear saved countdown
          clearCountdownTime();
        }
      }, 1000);

      console.log('[ForU] Countdown started with', countdown, 'seconds');
    }

    // Resend OTP handler
    document
      .getElementById("resend-otp-btn")
      .addEventListener("click", async () => {
        // Check if button is disabled (countdown active)
        const resendBtn = document.getElementById("resend-otp-btn");
        if (resendBtn.disabled) {
          const countdownText = document.getElementById("countdown-text");
          const remainingTime = countdownText.textContent.replace(/[()]/g, ''); // Remove parentheses
          showCustomNotification(`Please wait until ${remainingTime} to resend`, true);
          return;
        }

        if (!currentEmail) {
          showCustomNotification("Session expired, please start again", true);
          clearLoginState();
          showLoginButtons();
          return;
        }
        const originalText = resendBtn.textContent;
        resendBtn.textContent = "Sending...";
        resendBtn.disabled = true;
        // Set gray color when sending
        resendBtn.style.background = "#6b7280";
        resendBtn.style.color = "#9ca3af";
        resendBtn.style.cursor = "not-allowed";

        try {
          const currentTimestamp = Date.now().toString();
          const payload = { email: currentEmail };
          const signature = generateForuSignature(
            "POST",
            payload,
            currentTimestamp
          );

          const response = await fetch(
            `${API_BASE_URL}/v1/user-auth/otp/request`,
            {
              method: "POST",
              headers: {
                accept: "application/json",
                "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
                "Content-Type": "application/json",
                "x-foru-timestamp": currentTimestamp,
                "x-foru-signature": signature,
              },
              body: JSON.stringify(payload),
            }
          );

          if (response.status === 201) {
            showCustomNotification("OTP resent successfully");
            // Reset countdown to 60 seconds when resending
            clearCountdownTime();
            startResendCountdown(60);
          } else {
            throw new Error("Failed to resend OTP");
          }
        } catch (error) {
          console.error("Error resending OTP:", error);
          showCustomNotification("Failed to resend OTP", true);
        } finally {
          resendBtn.innerHTML =
            '<span id="resend-text">Resend OTP</span> <span id="countdown-text">(60s)</span>';
          // If button is still disabled (countdown active), keep gray color
          if (resendBtn.disabled) {
            resendBtn.style.background = "#6b7280";
            resendBtn.style.color = "#9ca3af";
            resendBtn.style.cursor = "not-allowed";
          } else {
            // If countdown finished, set to purple (enabled state)
            resendBtn.style.background = "#6c4cb3";
            resendBtn.style.color = "#ffffff";
            resendBtn.style.cursor = "pointer";
          }
        }
      });

    // Helper function to validate email
    function isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    // Restore login state after all event listeners are set up
    setTimeout(() => {
      console.log('[ForU] Restoring login state after setup...');
      restoreLoginState();
    }, 300);
  }
}

/**
 * Force refresh function to clear stuck states
 */
export function forceRefreshUserTab() {
  const container = document.getElementById("referral-section");
  if (container) {
    // Clear any stuck rendering flags
    container.dataset.rendering = 'false';
    // Force a fresh render
    renderReferralSection(true);
  }
}

/**
 * Handle tab switching to clear stuck states
 */
export function handleTabSwitch() {
  const container = document.getElementById("referral-section");
  if (container && container.dataset.rendering === 'true') {
    console.log("[UserTab] Tab switch detected, clearing stuck rendering");
    container.dataset.rendering = 'false';
    // Small delay to ensure clean state
    setTimeout(() => {
      renderReferralSection(false);
    }, 100);
  }
}

// Expose everything under window.Foru
window.Foru = window.Foru || {};
Object.assign(window.Foru, {
  generateForuSignature,
  showCustomNotification,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  forceRefreshUserTab,
  handleTabSwitch,
});

/**
 * Render form untuk input nama user
 */
async function renderNameInputForm(container, storedData, userProfileData) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icons/icon128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Complete Your Profile</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">Please enter your name to continue</p>
      
      <div style="width:100%;max-width:300px;">
        <div style="margin-bottom:15px;">
          <input id="name-input" type="text" placeholder="Enter your full name" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        <button id="save-name-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Save Name
        </button>
        <button id="back-to-login-name-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to login method
        </button>
      </div>
    </div>
  `;

  // Event listener untuk save name
  document
    .getElementById("save-name-btn")
    .addEventListener("click", async () => {
      const nameInput = document.getElementById("name-input");
      const name = nameInput.value.trim();

      if (!name) {
        showCustomNotification("Please enter your name", true);
        return;
      }

      const saveBtn = document.getElementById("save-name-btn");
      const originalText = saveBtn.textContent;
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { name: name };
        const signature = generateForuSignature(
          "PUT",
          payload,
          currentTimestamp
        );

        const response = await fetch(
          `${API_BASE_URL}/v1/user/profile`,
          {
            method: "PUT",
            headers: {
              accept: "application/json",
              "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
              Authorization: `Bearer ${storedData.accessToken}`,
              "Content-Type": "application/json",
              "x-foru-timestamp": currentTimestamp,
              "x-foru-signature": signature,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (response.status === 200 && data.code === 200) {
          showCustomNotification("Name saved successfully!");

          // Re-check /v1/user/me to get updated data and continue flow
          try {
            const recheckTimestamp = Date.now().toString();
            const recheckSignature = generateForuSignature(
              "GET",
              "",
              recheckTimestamp
            );

            const recheckResponse = await fetch(
              `${API_BASE_URL}/v1/user/me`,
              {
                method: "GET",
                headers: {
                  accept: "application/json",
                  "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
                  Authorization: `Bearer ${storedData.accessToken}`,
                  "x-foru-timestamp": recheckTimestamp,
                  "x-foru-signature": recheckSignature,
                },
              }
            );

            if (recheckResponse.ok) {
              const recheckData = await recheckResponse.json();
              if (recheckData?.code === 200 && recheckData.data) {
                const updatedUserData = recheckData.data;

                // Check if name is now available and check referral status
                if (
                  updatedUserData.name &&
                  updatedUserData.name.trim() !== ""
                ) {
                  if (updatedUserData?.referral?.used === false) {
                    // Name saved, but referral not used - show referral form
                    setTimeout(() => {
                      renderReferralInputForm(
                        container,
                        storedData,
                        updatedUserData
                      );
                    }, 1000);
                  } else {
                    // Name saved and referral used - show normal UI
                    setTimeout(() => {
                      renderReferralSection(true);
                    }, 1000);
                  }
                } else {
                  // Name still empty, refresh current form
                  setTimeout(() => {
                    renderReferralSection(true);
                  }, 1000);
                }
              } else {
                // Fallback to normal refresh
                setTimeout(() => {
                  renderReferralSection(true);
                }, 1000);
              }
            } else {
              // Fallback to normal refresh
              setTimeout(() => {
                renderReferralSection(true);
              }, 1000);
            }
          } catch (recheckError) {
            console.error("Error rechecking user data:", recheckError);
            // Fallback to normal refresh
            setTimeout(() => {
              renderReferralSection(true);
            }, 1000);
          }
        } else {
          throw new Error(data.message || "Failed to save name");
        }
      } catch (error) {
        console.error("Error saving name:", error);
        showCustomNotification(
          `Failed to save name. Error: ${error.message || "Unknown error"}`,
          true
        );
      } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }
    });

  // Event listener untuk "Back to login method"
  document
    .getElementById("back-to-login-name-btn")
    .addEventListener("click", async () => {
      // Logout current session and return to login methods
      try {
        await chrome.storage.local.remove([
          "accessToken",
          "id",
          "twitterId",
          "googleId",
          "expiresAt",
          "loginType",
          "email",
        ]);

        showCustomNotification("Returning to sign in options");

        // Return to login screen
        setTimeout(() => {
          renderReferralSection();
        }, 500);
      } catch (error) {
        console.error("Error during logout:", error);
        showCustomNotification("Error occurred, please try again", true);
      }
    });

  // Allow Enter key submission
  document.getElementById("name-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("save-name-btn").click();
    }
  });
}

/**
 * Render form untuk input referral code
 */
async function renderReferralInputForm(container, storedData, userProfileData) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icons/icon128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Enter Referral Code</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">Do you have a referral code from a friend?</p>
      
      <div style="width:100%;max-width:300px;">
        <div style="margin-bottom:15px;">
          <input id="referral-input" type="text" placeholder="Enter referral code" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;text-transform:uppercase;" />
        </div>
        <button id="continue-referral-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Continue
        </button>
        <button id="no-code-btn" style="width:100%;padding:10px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:10px;">
          I don't have the code
        </button>
        <button id="back-to-signin-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to sign in method
        </button>
      </div>
    </div>
  `;

  // Event listener untuk continue dengan referral code
  document
    .getElementById("continue-referral-btn")
    .addEventListener("click", async () => {
      const referralInput = document.getElementById("referral-input");
      const code = referralInput.value.trim().toUpperCase();

      if (!code) {
        showCustomNotification("Please enter a referral code", true);
        return;
      }

      const continueBtn = document.getElementById("continue-referral-btn");
      const originalText = continueBtn.textContent;
      continueBtn.textContent = "Verifying...";
      continueBtn.disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { code: code };
        const signature = generateForuSignature(
          "POST",
          payload,
          currentTimestamp
        );

        const response = await fetch(
          `${API_BASE_URL}/v1/referral/use`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
              Authorization: `Bearer ${storedData.accessToken}`,
              "Content-Type": "application/json",
              "x-foru-timestamp": currentTimestamp,
              "x-foru-signature": signature,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (response.status === 200 || response.status === 201) {
          showCustomNotification("Referral code verified successfully!");
          // Refresh to continue to normal flow
          setTimeout(() => {
            renderReferralSection(true);
          }, 1000);
        } else {
          showCustomNotification(
            "Invalid referral code, please try again",
            true
          );
        }
      } catch (error) {
        console.error("Error verifying referral code:", error);
        showCustomNotification("Invalid referral code, please try again", true);
      } finally {
        continueBtn.textContent = originalText;
        continueBtn.disabled = false;
      }
    });

  // Event listener untuk "I don't have the code"
  document.getElementById("no-code-btn").addEventListener("click", async () => {
    // Cek email di /v1/user/me terlebih dahulu
    try {
      const currentTimestamp = Date.now().toString();
      const signature = generateForuSignature("GET", "", currentTimestamp);

      const meResponse = await fetch(
        `${API_BASE_URL}/v1/user/me`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            Authorization: `Bearer ${storedData.accessToken}`,
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
          },
        }
      );

      if (meResponse.ok) {
        const meData = await meResponse.json();
        if (meData?.code === 200 && meData.data && meData.data.email) {
          // Email sudah terisi, langsung ke Thanks for Joining
          renderWaitlistSuccessMessage(container);
          return;
        }
      }
    } catch (error) {
      console.error("Error checking user email:", error);
    }

    // Jika email belum terisi atau error, lanjut ke waitlist form
    renderWaitlistForm(container, storedData, userProfileData);
  });

  // Event listener untuk "Back to sign in method"
  document
    .getElementById("back-to-signin-btn")
    .addEventListener("click", async () => {
      // Logout current session and return to login methods
      try {
        await chrome.storage.local.remove([
          "accessToken",
          "id",
          "twitterId",
          "googleId",
          "expiresAt",
          "loginType",
          "email",
        ]);

        showCustomNotification("Returning to sign in options");

        // Return to login screen
        setTimeout(() => {
          renderReferralSection();
        }, 500);
      } catch (error) {
        console.error("Error during logout:", error);
        showCustomNotification("Error occurred, please try again", true);
      }
    });

  // Allow Enter key submission
  document
    .getElementById("referral-input")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        document.getElementById("continue-referral-btn").click();
      }
    });
}

/**
 * Render form untuk join waitlist
 */
async function renderWaitlistForm(container, storedData, userProfileData) {
  const needsName =
    !userProfileData?.name || userProfileData.name.trim() === "";

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icons/icon128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Join Our Waitlist</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">We'll notify you when it's your turn to access the platform</p>
      
      <div style="width:100%;max-width:300px;">
        ${
          needsName
            ? `
        <div style="margin-bottom:15px;">
          <input id="waitlist-name-input" type="text" placeholder="Enter your full name" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        `
            : ""
        }
        <div style="margin-bottom:15px;">
          <input id="waitlist-email-input" type="email" placeholder="Enter your email address" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        <button id="join-waitlist-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Join Wait List
        </button>
        <button id="back-to-referral-btn" style="width:100%;padding:10px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:10px;">
          Back to Referral Code
        </button>
        <button id="back-to-login-waitlist-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Login Method
        </button>
      </div>
    </div>
  `;

  // Event listener untuk join waitlist
  document
    .getElementById("join-waitlist-btn")
    .addEventListener("click", async () => {
      const emailInput = document.getElementById("waitlist-email-input");
      const email = emailInput.value.trim();

      let name = userProfileData?.name || "";
      if (needsName) {
        const nameInput = document.getElementById("waitlist-name-input");
        name = nameInput.value.trim();
        if (!name) {
          showCustomNotification("Please enter your name", true);
          return;
        }
      }

      if (!email) {
        showCustomNotification("Please enter your email address", true);
        return;
      }

      if (!isValidEmail(email)) {
        showCustomNotification("Please enter a valid email address", true);
        return;
      }

      const joinBtn = document.getElementById("join-waitlist-btn");
      const originalText = joinBtn.textContent;
      joinBtn.textContent = "Joining...";
      joinBtn.disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { name: name, email: email };
        const signature = generateForuSignature(
          "PUT",
          payload,
          currentTimestamp
        );

        const response = await fetch(
          `${API_BASE_URL}/v1/user/profile`,
          {
            method: "PUT",
            headers: {
              accept: "application/json",
              "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
              Authorization: `Bearer ${storedData.accessToken}`,
              "Content-Type": "application/json",
              "x-foru-timestamp": currentTimestamp,
              "x-foru-signature": signature,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (response.status === 200 && data.code === 200) {
          showCustomNotification("Successfully joined the waitlist!");
          // Show waitlist success message
          renderWaitlistSuccessMessage(container);
        } else {
          throw new Error(data.message || "Failed to join waitlist");
        }
      } catch (error) {
        console.error("Error joining waitlist:", error);
        showCustomNotification(
          `Failed to join waitlist. Error: ${error.message || "Unknown error"}`,
          true
        );
      } finally {
        joinBtn.textContent = originalText;
        joinBtn.disabled = false;
      }
    });

  // Event listener untuk back to referral
  document
    .getElementById("back-to-referral-btn")
    .addEventListener("click", () => {
      renderReferralInputForm(container, storedData, userProfileData);
    });

  // Event listener untuk back to login method
  document
    .getElementById("back-to-login-waitlist-btn")
    .addEventListener("click", async () => {
      try {
        await chrome.storage.local.remove([
          "accessToken",
          "id",
          "twitterId",
          "googleId",
          "expiresAt",
          "loginType",
          "email",
        ]);

        showCustomNotification("Returning to sign in options");

        setTimeout(() => {
          renderReferralSection();
        }, 500);
      } catch (error) {
        console.error("Error during logout:", error);
        showCustomNotification("Error occurred, please try again", true);
      }
    });

  // Helper function to validate email
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Render success message setelah join waitlist
 */
function renderWaitlistSuccessMessage(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icons/icon128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:20px;border-radius:50%;">
      
      <h2 style="color:#ececf1;margin-bottom:15px;text-align:center;font-size:18px;font-weight:600;">Thanks for Joining the Waitlist!</h2>
      
      <div style="background-color:#20232d;border-radius:16px;padding:16px;margin-bottom:24px;width:100%;max-width:350px;">
        <p style="color:#ffffff;font-size:12px;line-height:16px;text-align:center;margin:0;font-family:'Plus Jakarta Sans', sans-serif;">
          We respect your privacy. Your email will only be used to notify you when your access is ready — no spam, ever.
        </p>
      </div>
      
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:24px;text-align:center;line-height:1.5;">
        We'll email you when it's your time to unlock your AI-DID. In the meantime, here's how to stay connected and prepare for launch.
      </p>
      
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
        <p style="color:#ffffff;font-size:14px;font-weight:500;margin:0;font-family:'Plus Jakarta Sans', sans-serif;">
          Don't Miss out on our Updates
        </p>
        
        <div style="display:flex;gap:32px;align-items:center;">
          <!-- Discord -->
          <a href="https://discord.gg/foruai" target="_blank" style="text-decoration:none;position:relative;display:block;width:42px;height:42px;">
            <img src="${chrome.runtime.getURL(
              "images/social_bg_circle.svg"
            )}" alt="" style="width:42px;height:42px;" />
            <div style="position:absolute;top:6px;left:6px;width:30px;height:30px;overflow:hidden;">
              <img src="${chrome.runtime.getURL(
                "images/discord_icon_1.svg"
              )}" alt="" style="position:absolute;top:1.875px;left:1.875px;width:26.25px;height:26.25px;" />
              <img src="${chrome.runtime.getURL(
                "images/discord_icon_2.svg"
              )}" alt="" style="position:absolute;top:7.5px;left:4.6875px;width:20.625px;height:15px;" />
            </div>
          </a>
          
          <!-- Twitter X -->
          <a href="https://x.com/4UAICrypto" target="_blank" style="text-decoration:none;position:relative;display:block;width:42px;height:42px;">
            <img src="${chrome.runtime.getURL(
              "images/social_bg_circle.svg"
            )}" alt="" style="width:42px;height:42px;" />
            <div style="position:absolute;top:11px;left:11px;width:20px;height:20px;overflow:hidden;">
              <img src="${chrome.runtime.getURL(
                "images/twitter_x_icon.svg"
              )}" alt="" style="position:absolute;top:1.875px;left:1.25px;width:17.5px;height:16.25px;" />
            </div>
          </a>
          
          <!-- Telegram -->
          <a href="https://t.me/foruai" target="_blank" style="text-decoration:none;position:relative;display:block;width:42px;height:42px;">
            <img src="${chrome.runtime.getURL(
              "images/social_bg_circle.svg"
            )}" alt="" style="width:42px;height:42px;" />
            <div style="position:absolute;top:6px;left:6px;width:30px;height:30px;overflow:hidden;">
              <img src="${chrome.runtime.getURL(
                "images/telegram_icon_1.svg"
              )}" alt="" style="position:absolute;top:1.875px;left:1.875px;width:26.25px;height:26.25px;" />
              <img src="${chrome.runtime.getURL(
                "images/telegram_icon_2.svg"
              )}" alt="" style="position:absolute;top:8.4375px;left:6.5625px;width:14.0625px;height:12.9375px;" />
            </div>
          </a>
        </div>
      </div>
      
      <div style="margin-top:24px;max-width:350px;">
        <button id="back-to-waitlist-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:10px;">
          I have the code
        </button>
        <button id="back-to-login-thanks-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Login Method
        </button>
      </div>
    </div>
  `;

  // Event listeners untuk thanks message buttons
  setTimeout(() => {
    // Back button (kembali ke referral form)
    const backToWaitlistBtn = document.getElementById("back-to-waitlist-btn");
    if (backToWaitlistBtn) {
      backToWaitlistBtn.addEventListener("click", () => {
        // Find the stored data and user profile data to pass to renderReferralInputForm
        chrome.storage.local
          .get([
            "accessToken",
            "id",
            "twitterId",
            "googleId",
            "expiresAt",
            "loginType",
          ])
          .then((storedData) => {
            // Since we don't have the userProfileData here, we'll just go back to the main flow
            renderReferralSection();
          });
      });
    }

    // Back to login method button
    const backToLoginBtn = document.getElementById("back-to-login-thanks-btn");
    if (backToLoginBtn) {
      backToLoginBtn.addEventListener("click", async () => {
        try {
          await chrome.storage.local.remove([
            "accessToken",
            "id",
            "twitterId",
            "googleId",
            "expiresAt",
            "loginType",
            "email",
          ]);

          showCustomNotification("Returning to sign in options");

          setTimeout(() => {
            renderReferralSection();
          }, 500);
        } catch (error) {
          console.error("Error during logout:", error);
          showCustomNotification("Error occurred, please try again", true);
        }
      });
    }
  }, 100);


}

// expose the user-tab renderer for the sidepanel
window.renderReferralSection = renderReferralSection;
