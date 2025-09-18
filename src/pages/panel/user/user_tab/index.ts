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
  // Implementation for login handlers would go here
  // This is a simplified version - the full implementation would include
  // all the email login, OTP verification, etc. logic from the original file
  
  const twitterBtn = document.getElementById("login-twitter-btn");
  const emailBtn = document.getElementById("login-email-btn");
  
  if (twitterBtn) {
    twitterBtn.addEventListener("click", async () => {
      // Twitter login logic
      console.log("Twitter login clicked");
    });
  }
  
  if (emailBtn) {
    emailBtn.addEventListener("click", () => {
      // Email login logic
      console.log("Email login clicked");
    });
  }
}

/**
 * Render form untuk input nama user
 */
async function renderNameInputForm(container: HTMLElement, storedData: any, userProfileData: any): Promise<void> {
  // Implementation would go here - simplified for now
  console.log("Rendering name input form");
}

/**
 * Render form untuk input referral code
 */
async function renderReferralInputForm(container: HTMLElement, storedData: any, userProfileData: any): Promise<void> {
  // Implementation would go here - simplified for now
  console.log("Rendering referral input form");
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
