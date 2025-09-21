// src/user/user_tab/index.ts

// Impor fungsi-fungsi komponen UI dari file terpisah
import { renderUserProfileCard } from "../user_profile_card/index.js";
import { renderReferralDetails } from "../user_referral_section/index.js";
import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

// Re-export for backward compatibility
export { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL };

/**
 * Fungsi utilitas untuk menampilkan notifikasi kustom.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} isError - True jika pesan adalah error, false jika notifikasi biasa.
 */
export function showCustomNotification(message: string, isError = false): void {
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
    notificationDiv!.style.opacity = "1";
  }, 10);

  setTimeout(
    () => {
      notificationDiv!.style.opacity = "0";
      setTimeout(() => {
        notificationDiv!.style.display = "none";
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
async function renderReferralSection(forceRefresh = false): Promise<void> {
  const container = document.getElementById("referral-section");
  if (!container) return;

  // Prevent multiple simultaneous renders with timeout
  if ((container as any).dataset.rendering === 'true') {
    console.log("[UserTab] Already rendering, skipping...");
    return;
  }
  
  // Set timeout to clear rendering flag if stuck
  const renderTimeout = setTimeout(() => {
    if ((container as any).dataset.rendering === 'true') {
      console.log("[UserTab] Rendering timeout, clearing flag");
      (container as any).dataset.rendering = 'false';
    }
  }, 10000); // 10 second timeout
  
  (container as any).dataset.rendering = 'true';
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

    let userProfileData: any = null;
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
        (container as any).dataset.rendering = 'false';
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
      (container as any).dataset.rendering = 'false';
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
      // Clear rendering flag after showing name form
      (container as any).dataset.rendering = 'false';
      clearTimeout(renderTimeout);
      return;
    }

    // Check if referral is not used - show referral form
    if (userProfileData?.referral?.used === false) {
      await renderReferralInputForm(container, storedData, userProfileData);
      // Clear rendering flag after showing referral form
      (container as any).dataset.rendering = 'false';
      clearTimeout(renderTimeout);
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
    (container as any).dataset.rendering = 'false';
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
        const logoutConfirmation = document.getElementById("logout-confirmation");
        if (logoutConfirmation) {
          logoutConfirmation.style.display = "flex";
        }
      });
      logoutBtn.setAttribute("data-listener-added", "true");
    }

    if (cancelBtn && !cancelBtn.hasAttribute("data-listener-added")) {
      cancelBtn.addEventListener("click", () => {
        const logoutConfirmation = document.getElementById("logout-confirmation");
        if (logoutConfirmation) {
          logoutConfirmation.style.display = "none";
        }
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
          const logoutConfirmation = document.getElementById("logout-confirmation");
          if (logoutConfirmation) {
            logoutConfirmation.style.display = "none";
          }

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
        if ((e.target as HTMLElement).classList.contains("popup-overlay")) {
          const logoutConfirmation = document.getElementById("logout-confirmation");
          if (logoutConfirmation) {
            logoutConfirmation.style.display = "none";
          }
        }
      });
      popupOverlay.setAttribute("data-listener-added", "true");
    }
  } else {
    // User belum login: tampilkan tombol login
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
        <img src="${chrome.runtime.getURL(
          "icon-128.png"
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
        <!-- 1. Logo email (on black background) -->
        <img src="${chrome.runtime.getURL(
          "images/sms_icon.svg"
        )}" alt="Email Icon" style="width:60px;height:60px;margin-bottom:15px;display:block;margin-left:auto;margin-right:auto;">
        
        <!-- 2. Text check your email (on black background) -->
        <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Check your email</h3>
        
        <!-- 3. Text we've sent... (on black background) -->
        <p id="otp-message" style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">We've sent a secure link to your email</p>
        
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
        <button id="resend-otp-btn" style="width:100%;padding:8px;background:transparent;color:#9ca3af;border:1px solid #343541;border-radius:8px;cursor:not-allowed;font-size:14px;margin-bottom:10px;" disabled>
          <span id="resend-text">Resend OTP</span> <span id="countdown-text">(60s)</span>
        </button>
        
        <!-- 8. Tombol back to email input -->
        <button id="back-to-email-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Email Input
        </button>
      </div>
    `;

    // Clear rendering flag for non-logged in users
    (container as any).dataset.rendering = 'false';
    clearTimeout(renderTimeout);

    // Add login handlers and other functionality...
    setupLoginHandlers(container);
  }
}

/**
 * Setup login handlers for email and Twitter login
 */
function setupLoginHandlers(container: HTMLElement): void {
  // Tambahkan handlers untuk tombol login
  const twitterBtn = document.getElementById("login-twitter-btn");
  if (twitterBtn) {
    twitterBtn.addEventListener("click", async () => {
      try {
        const backendUrl = `${API_BASE_URL}/v1/user-auth/twitter`;
        const redirectUrlParam = encodeURIComponent("https://x.com/4UAICrypto");
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
            (error as Error).message || "Unknown error"
          }. Please try again.`,
          true
        );
      }
    });
  }

  // State variables for email login
  let currentEmail = "";

  // State management functions
  function saveLoginState(state: string, email = "") {
    localStorage.setItem('foru_login_state', state);
    if (email) {
      localStorage.setItem('foru_current_email', email);
    }
    console.log('[ForU] State saved:', state, 'Email:', email);
  }

  function saveCountdownTime(remainingTime: number) {
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

  function clearOTPInputs() {
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    }
  }

  // Helper functions to show/hide forms
  function showLoginButtons() {
    const loginBtns = document.getElementById("login-twitter-btn")?.parentElement;
    const emailForm = document.getElementById("email-login-form");
    const otpForm = document.getElementById("otp-verification-form");
    
    if (loginBtns) loginBtns.style.display = "flex";
    if (emailForm) emailForm.style.display = "none";
    if (otpForm) otpForm.style.display = "none";
    saveLoginState('login_buttons');
  }

  function showEmailForm() {
    console.log('[ForU] Showing email form');
    const loginBtns = document.getElementById("login-twitter-btn")?.parentElement;
    const emailForm = document.getElementById("email-login-form");
    const otpForm = document.getElementById("otp-verification-form");
    
    if (loginBtns) loginBtns.style.display = "none";
    if (emailForm) emailForm.style.display = "block";
    if (otpForm) otpForm.style.display = "none";
    saveLoginState('email_form');
  }

  function showOtpForm() {
    console.log('[ForU] Showing OTP form');
    const loginBtns = document.getElementById("login-twitter-btn")?.parentElement;
    const emailForm = document.getElementById("email-login-form");
    const otpForm = document.getElementById("otp-verification-form");
    
    if (loginBtns) loginBtns.style.display = "none";
    if (emailForm) emailForm.style.display = "none";
    if (otpForm) otpForm.style.display = "block";
    saveLoginState('otp_form');
  }

  // Email login button handler
  const emailBtn = document.getElementById("login-email-btn");
  if (emailBtn) {
    emailBtn.addEventListener("click", () => {
      console.log('[ForU] Login with email clicked');
      showEmailForm();
      const emailInput = document.getElementById("email-input") as HTMLInputElement;
      if (emailInput) emailInput.focus();
    });
  }

  // Back to login options handler
  const backToLoginBtn = document.getElementById("back-to-login-btn");
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", () => {
      showLoginButtons();
      const emailInput = document.getElementById("email-input") as HTMLInputElement;
      if (emailInput) emailInput.value = "";
      clearLoginState();
    });
  }

  // Email form submit handler
  const emailSubmitBtn = document.getElementById("email-login-submit-btn");
  if (emailSubmitBtn) {
    emailSubmitBtn.addEventListener("click", async () => {
      const emailInput = document.getElementById("email-input") as HTMLInputElement;
      if (!emailInput) return;

      const email = emailInput.value.trim();
      if (!email) {
        showCustomNotification("Please enter your email address", true);
        return;
      }

      if (!isValidEmail(email)) {
        showCustomNotification("Please enter a valid email address", true);
        return;
      }

      try {
        emailSubmitBtn.textContent = "Sending...";
        emailSubmitBtn.style.pointerEvents = "none";

        const timestamp = Date.now().toString();
        const payload = { email };
        const signature = generateForuSignature("POST", payload, timestamp);

        const response = await fetch(`${API_BASE_URL}/v1/user-auth/otp/request`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            "Content-Type": "application/json",
            "x-foru-timestamp": timestamp,
            "x-foru-signature": signature,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.status === 404) {
          // Email not registered yet
          showCustomNotification("", true);
          setTimeout(() => {
            const notification = document.getElementById("custom-notification");
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
              const textPart2 = document.createTextNode(" first.");
              
              notification.appendChild(textPart1);
              notification.appendChild(linkPart);
              notification.appendChild(textPart2);
            }
          }, 100);
        } else if (response.status === 201 && data.code === 201) {
          // OTP sent successfully
          currentEmail = email;
          showCustomNotification("We sent you an OTP code on your email");
          const otpMessage = document.getElementById("otp-message");
          if (otpMessage) {
            otpMessage.innerHTML = `We've sent a secure link to <strong>${email}</strong>`;
          }
          showOtpForm();
          saveLoginState('otp_form', email);
          console.log('[ForU] OTP sent successfully, state saved as otp_form');
          
          // Only start new countdown if no active countdown exists
          const existingCountdown = getCountdownTime();
          if (existingCountdown <= 0) {
            startCountdown(60);
          } else {
            console.log('[ForU] Using existing countdown:', existingCountdown, 'seconds');
            startCountdown(existingCountdown);
          }
        } else {
          console.error("Send OTP failed:", data);
          showCustomNotification(data.message || "Failed to send OTP", true);
        }
      } catch (error) {
        console.error("Send OTP error:", error);
        showCustomNotification("Failed to send OTP. Please try again.", true);
      } finally {
        emailSubmitBtn.textContent = "Send OTP";
        emailSubmitBtn.style.pointerEvents = "auto";
      }
    });
  }

  // OTP verification handlers
  setupOtpHandlers();
  
  // Helper function for email validation
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Countdown functionality
  let countdownInterval: NodeJS.Timeout | null = null;

  function startCountdown(initialCountdown: number = 60) {
    const countdownTextElement = document.getElementById("countdown-text");
    const resendBtn = document.getElementById("resend-otp-btn") as HTMLButtonElement;
    
    if (!countdownTextElement || !resendBtn) {
      console.log('[ForU] Countdown elements not found');
      return;
    }

    let countdown = initialCountdown;
    resendBtn.disabled = true;
    // Set transparent background with gray text when disabled
    resendBtn.style.background = "transparent";
    resendBtn.style.color = "#9ca3af";
    resendBtn.style.cursor = "not-allowed";

    // Update display immediately
    countdownTextElement.textContent = `(${countdown}s)`;

    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
      countdown--;
      countdownTextElement.textContent = `(${countdown}s)`;
      
      // Save current countdown time
      saveCountdownTime(countdown);

      if (countdown <= 0) {
        clearInterval(countdownInterval!);
        resendBtn.disabled = false;
        countdownTextElement.textContent = "";
        // Reset to transparent background with normal text color when enabled
        resendBtn.style.background = "transparent";
        resendBtn.style.color = "#aeb0b6";
        resendBtn.style.cursor = "pointer";
        // Clear saved countdown
        clearCountdownTime();
      }
    }, 1000);

    console.log('[ForU] Countdown started with', countdown, 'seconds');
  }

  function setupOtpHandlers() {
    // OTP input handlers for auto-focus
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) {
        input.addEventListener("input", (e) => {
          const target = e.target as HTMLInputElement;
          if (target.value.length === 1 && i < 6) {
            const nextInput = document.getElementById(`otp-input-${i + 1}`) as HTMLInputElement;
            if (nextInput) nextInput.focus();
          }
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && input.value === "" && i > 1) {
            const prevInput = document.getElementById(`otp-input-${i - 1}`) as HTMLInputElement;
            if (prevInput) prevInput.focus();
          }
        });
      }
    }

    // OTP verify button handler
    const otpVerifyBtn = document.getElementById("otp-verify-btn");
    if (otpVerifyBtn) {
      otpVerifyBtn.addEventListener("click", async () => {
        const otpCode = Array.from({length: 6}, (_, i) => {
          const input = document.getElementById(`otp-input-${i + 1}`) as HTMLInputElement;
          return input ? input.value : "";
        }).join("");

        if (otpCode.length !== 6) {
          showCustomNotification("Please enter the complete 6-digit OTP", true);
          return;
        }

        try {
          otpVerifyBtn.textContent = "Verifying...";
          otpVerifyBtn.style.pointerEvents = "none";

          const timestamp = Date.now().toString();
          const payload = { email: currentEmail, otp: otpCode };
          const signature = generateForuSignature("POST", payload, timestamp);

          const response = await fetch(`${API_BASE_URL}/v1/user-auth/otp/verify`, {
            method: "POST",
            headers: {
              "accept": "application/json",
              "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
              "Content-Type": "application/json",
              "x-foru-timestamp": timestamp,
              "x-foru-signature": signature,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (response.ok && data.code === 201 && data.data) {
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
            const emailInput = document.getElementById("email-input") as HTMLInputElement;
            if (emailInput) emailInput.value = "";
            clearOTPInputs();
            clearLoginState();
            showLoginButtons();

            // Reload the referral section
            setTimeout(() => {
              renderReferralSection();
            }, 1000);
          } else {
            console.error("OTP verification failed:", data);
            showCustomNotification(data.message || "Invalid OTP", true);
          }
        } catch (error) {
          console.error("OTP verification error:", error);
          showCustomNotification("Failed to verify OTP. Please try again.", true);
        } finally {
          otpVerifyBtn.textContent = "Submit OTP";
          otpVerifyBtn.style.pointerEvents = "auto";
        }
      });
    }

    // Resend OTP button handler
    const resendBtn = document.getElementById("resend-otp-btn");
    if (resendBtn) {
      resendBtn.addEventListener("click", async () => {
        if (!currentEmail) return;

        try {
          resendBtn.textContent = "Sending...";
          resendBtn.style.pointerEvents = "none";

          const timestamp = Date.now().toString();
          const payload = { email: currentEmail };
          const signature = generateForuSignature("POST", payload, timestamp);

          const response = await fetch(`${API_BASE_URL}/v1/user-auth/otp/request`, {
            method: "POST",
            headers: {
              "accept": "application/json",
              "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
              "Content-Type": "application/json",
              "x-foru-timestamp": timestamp,
              "x-foru-signature": signature,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (response.status === 201) {
            showCustomNotification("OTP resent successfully");
            // Reset countdown to 60 seconds when resending
            clearCountdownTime();
            startCountdown(60);
          } else {
            console.error("Resend OTP failed:", data);
            showCustomNotification(data.message || "Failed to resend OTP", true);
          }
        } catch (error) {
          console.error("Resend OTP error:", error);
          showCustomNotification("Failed to resend OTP. Please try again.", true);
        } finally {
          resendBtn.innerHTML =
            '<span id="resend-text">Resend OTP</span> <span id="countdown-text">(60s)</span>';
          // If button is still disabled (countdown active), keep transparent with gray text
          if ((resendBtn as HTMLButtonElement).disabled) {
            resendBtn.style.background = "transparent";
            resendBtn.style.color = "#9ca3af";
            resendBtn.style.cursor = "not-allowed";
          } else {
            // If countdown finished, set to transparent with normal text color (enabled state)
            resendBtn.style.background = "transparent";
            resendBtn.style.color = "#aeb0b6";
            resendBtn.style.cursor = "pointer";
          }
          resendBtn.style.pointerEvents = "auto";
        }
      });
    }

    // Back to email input handler
    const backToEmailBtn = document.getElementById("back-to-email-btn");
    if (backToEmailBtn) {
      backToEmailBtn.addEventListener("click", () => {
        showEmailForm();
        clearOTPInputs();
        saveLoginState('email_form', currentEmail);
        if (countdownInterval) {
          clearInterval(countdownInterval);
        }
        clearCountdownTime();
      });
    }
  }

  // Restore state on page load
  function restoreLoginState() {
    const savedState = getLoginState();
    const savedEmail = getCurrentEmail();
    
    console.log('[ForU] Restoring login state:', savedState, 'Email:', savedEmail);
    
    switch (savedState) {
      case 'email_form':
        showEmailForm();
        if (savedEmail) {
          const emailInput = document.getElementById("email-input") as HTMLInputElement;
          if (emailInput) emailInput.value = savedEmail;
        }
        break;
      case 'otp_form':
        console.log('[ForU] Restoring to OTP form');
        showOtpForm();
        clearOTPInputs(); // Clear any existing OTP inputs
        if (savedEmail) {
          currentEmail = savedEmail;
          const otpMessage = document.getElementById("otp-message");
          if (otpMessage) {
            otpMessage.innerHTML = `We've sent a secure link to <strong>${savedEmail}</strong>`;
            console.log('[ForU] OTP message restored for:', savedEmail);
          }
          
          // Restore countdown with remaining time
          const remainingTime = getCountdownTime();
          if (remainingTime > 0) {
            console.log('[ForU] Restoring countdown with', remainingTime, 'seconds remaining');
            startCountdown(remainingTime);
          } else {
            console.log('[ForU] No active countdown to restore');
            const resendBtn = document.getElementById("resend-otp-btn") as HTMLButtonElement;
            const countdownText = document.getElementById("countdown-text");
            if (resendBtn && countdownText) {
              resendBtn.disabled = false;
              resendBtn.style.background = "transparent";
              resendBtn.style.color = "#aeb0b6";
              resendBtn.style.cursor = "pointer";
              countdownText.textContent = "";
            }
          }
        } else {
          showLoginButtons();
        }
        break;
      default:
        showLoginButtons();
        break;
    }
  }

  // Restore state after a short delay to ensure DOM is ready
  setTimeout(restoreLoginState, 100);
}

/**
 * Render form untuk input nama user
 */
async function renderNameInputForm(container: HTMLElement, storedData: any, userProfileData: any): Promise<void> {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
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
  const saveNameBtn = document.getElementById("save-name-btn");
  if (saveNameBtn) {
    saveNameBtn.addEventListener("click", async () => {
      const nameInput = document.getElementById("name-input") as HTMLInputElement;
      const name = nameInput?.value.trim();

      if (!name) {
        showCustomNotification("Please enter your name", true);
        return;
      }

      const originalText = saveNameBtn.textContent;
      saveNameBtn.textContent = "Saving...";
      (saveNameBtn as HTMLButtonElement).disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { name: name };
        const signature = generateForuSignature("PUT", payload, currentTimestamp);

        const response = await fetch(`${API_BASE_URL}/v1/user/profile`, {
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
        });

        const data = await response.json();

        if (response.status === 200 && data.code === 200) {
          showCustomNotification("Name saved successfully!");

          // Re-check /v1/user/me to get updated data and continue flow
          try {
            const recheckTimestamp = Date.now().toString();
            const recheckSignature = generateForuSignature("GET", "", recheckTimestamp);

            const recheckResponse = await fetch(`${API_BASE_URL}/v1/user/me`, {
              method: "GET",
              headers: {
                accept: "application/json",
                "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
                Authorization: `Bearer ${storedData.accessToken}`,
                "x-foru-timestamp": recheckTimestamp,
                "x-foru-signature": recheckSignature,
              },
            });

            if (recheckResponse.ok) {
              const recheckData = await recheckResponse.json();
              if (recheckData?.code === 200 && recheckData.data) {
                const updatedUserData = recheckData.data;

                // Check if name is now available and check referral status
                if (updatedUserData.name && updatedUserData.name.trim() !== "") {
                  if (updatedUserData?.referral?.used === false) {
                    // Name saved, but referral not used - show referral form
                    setTimeout(() => {
                      renderReferralInputForm(container, storedData, updatedUserData);
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
          `Failed to save name. Error: ${(error as Error).message || "Unknown error"}`,
          true
        );
      } finally {
        saveNameBtn.textContent = originalText;
        (saveNameBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  // Event listener untuk "Back to login method"
  const backToLoginNameBtn = document.getElementById("back-to-login-name-btn");
  if (backToLoginNameBtn) {
    backToLoginNameBtn.addEventListener("click", async () => {
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
  }

  // Allow Enter key submission
  const nameInput = document.getElementById("name-input");
  if (nameInput) {
    nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const saveBtn = document.getElementById("save-name-btn");
        if (saveBtn) saveBtn.click();
      }
    });
  }
}

/**
 * Render form untuk input referral code
 */
async function renderReferralInputForm(container: HTMLElement, storedData: any, userProfileData: any): Promise<void> {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
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
  const continueReferralBtn = document.getElementById("continue-referral-btn");
  if (continueReferralBtn) {
    continueReferralBtn.addEventListener("click", async () => {
      const referralInput = document.getElementById("referral-input") as HTMLInputElement;
      const code = referralInput?.value.trim().toUpperCase();

      if (!code) {
        showCustomNotification("Please enter a referral code", true);
        return;
      }

      const originalText = continueReferralBtn.textContent;
      continueReferralBtn.textContent = "Verifying...";
      (continueReferralBtn as HTMLButtonElement).disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { code: code };
        const signature = generateForuSignature("POST", payload, currentTimestamp);

        const response = await fetch(`${API_BASE_URL}/v1/referral/use`, {
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
        });

        const data = await response.json();

        if (response.status === 200 || response.status === 201) {
          showCustomNotification("Referral code verified successfully!");
          // Refresh to continue to normal flow
          setTimeout(() => {
            renderReferralSection(true);
          }, 1000);
        } else {
          showCustomNotification("Invalid referral code, please try again", true);
        }
      } catch (error) {
        console.error("Error verifying referral code:", error);
        showCustomNotification("Invalid referral code, please try again", true);
      } finally {
        continueReferralBtn.textContent = originalText;
        (continueReferralBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  // Event listener untuk "I don't have the code"
  const noCodeBtn = document.getElementById("no-code-btn");
  if (noCodeBtn) {
    noCodeBtn.addEventListener("click", async () => {
      // Cek email di /v1/user/me terlebih dahulu
      try {
        const currentTimestamp = Date.now().toString();
        const signature = generateForuSignature("GET", "", currentTimestamp);

        const meResponse = await fetch(`${API_BASE_URL}/v1/user/me`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            Authorization: `Bearer ${storedData.accessToken}`,
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
          },
        });

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
  }

  // Event listener untuk "Back to sign in method"
  const backToSigninBtn = document.getElementById("back-to-signin-btn");
  if (backToSigninBtn) {
    backToSigninBtn.addEventListener("click", async () => {
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
  }

  // Allow Enter key submission
  const referralInput = document.getElementById("referral-input");
  if (referralInput) {
    referralInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const continueBtn = document.getElementById("continue-referral-btn");
        if (continueBtn) continueBtn.click();
      }
    });
  }
}

/**
 * Render form untuk join waitlist
 */
async function renderWaitlistForm(container: HTMLElement, storedData: any, userProfileData: any): Promise<void> {
  const needsName = !userProfileData?.name || userProfileData.name.trim() === "";

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Join Our Waitlist</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">We'll notify you when it's your turn to access the platform</p>
      
      <div style="width:100%;max-width:300px;">
        ${needsName ? `
        <div style="margin-bottom:15px;">
          <input id="waitlist-name-input" type="text" placeholder="Enter your full name" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        ` : ""}
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

  // Helper function to validate email
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Event listener untuk join waitlist
  const joinWaitlistBtn = document.getElementById("join-waitlist-btn");
  if (joinWaitlistBtn) {
    joinWaitlistBtn.addEventListener("click", async () => {
      const emailInput = document.getElementById("waitlist-email-input") as HTMLInputElement;
      const email = emailInput?.value.trim();

      let name = userProfileData?.name || "";
      if (needsName) {
        const nameInput = document.getElementById("waitlist-name-input") as HTMLInputElement;
        name = nameInput?.value.trim();
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

      const originalText = joinWaitlistBtn.textContent;
      joinWaitlistBtn.textContent = "Joining...";
      (joinWaitlistBtn as HTMLButtonElement).disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { name: name, email: email };
        const signature = generateForuSignature("PUT", payload, currentTimestamp);

        const response = await fetch(`${API_BASE_URL}/v1/user/profile`, {
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
        });

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
          `Failed to join waitlist. Error: ${(error as Error).message || "Unknown error"}`,
          true
        );
      } finally {
        joinWaitlistBtn.textContent = originalText;
        (joinWaitlistBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  // Event listener untuk back to referral
  const backToReferralBtn = document.getElementById("back-to-referral-btn");
  if (backToReferralBtn) {
    backToReferralBtn.addEventListener("click", () => {
      renderReferralInputForm(container, storedData, userProfileData);
    });
  }

  // Event listener untuk back to login method
  const backToLoginWaitlistBtn = document.getElementById("back-to-login-waitlist-btn");
  if (backToLoginWaitlistBtn) {
    backToLoginWaitlistBtn.addEventListener("click", async () => {
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
}

/**
 * Render success message setelah join waitlist
 */
function renderWaitlistSuccessMessage(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
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
    const backToLoginThanksBtn = document.getElementById("back-to-login-thanks-btn");
    if (backToLoginThanksBtn) {
      backToLoginThanksBtn.addEventListener("click", async () => {
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

/**
 * Force refresh function to clear stuck states
 */
export function forceRefreshUserTab(): void {
  const container = document.getElementById("referral-section");
  if (container) {
    // Clear any stuck rendering flags
    (container as any).dataset.rendering = 'false';
    // Force a fresh render
    renderReferralSection(true);
  }
}

/**
 * Handle tab switching to clear stuck states
 */
export function handleTabSwitch(): void {
  const container = document.getElementById("referral-section");
  if (container && (container as any).dataset.rendering === 'true') {
    console.log("[UserTab] Tab switch detected, clearing stuck rendering");
    (container as any).dataset.rendering = 'false';
    // Small delay to ensure clean state
    setTimeout(() => {
      renderReferralSection(false);
    }, 100);
  }
}

// Expose everything under window.Foru
(window as any).Foru = (window as any).Foru || {};
Object.assign((window as any).Foru, {
  generateForuSignature,
  showCustomNotification,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  forceRefreshUserTab,
  handleTabSwitch,
});

// expose the user-tab renderer for the sidepanel
(window as any).renderReferralSection = renderReferralSection;

export { renderReferralSection };
