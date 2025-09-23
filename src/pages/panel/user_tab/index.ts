// src/pages/panel/user_tab/index.ts

// Impor fungsi-fungsi komponen UI dari file terpisah
import { renderAuthenticatedUserSection } from "./authenticated/index.js";
import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../lib/crypto-utils.js';

// Import new modular components
import { renderLoginForm, setupLoginHandlers } from "./unauthenticated/login/index.js";
import { renderOtpForm, setupOtpHandlers, setEmail, clearOtpSession } from "./unauthenticated/otp/index.js";
import { renderNameInputForm, setupNameInputHandlers } from "./unauthenticated/name-input/index.js";
import { renderReferralInputForm, setupReferralInputHandlers } from "./unauthenticated/referral-input/index.js";
import { renderWaitlistForm, renderWaitlistSuccessMessage, setupWaitlistHandlers, setupWaitlistSuccessHandlers } from "./unauthenticated/waitlist/index.js";

// Re-export for backward compatibility
export { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL };

// Current state management
enum UserTabState {
  LOGIN = 'login',
  OTP = 'otp', 
  NAME_INPUT = 'name_input',
  REFERRAL_INPUT = 'referral_input',
  WAITLIST = 'waitlist',
  WAITLIST_SUCCESS = 'waitlist_success',
  AUTHENTICATED = 'authenticated'
}

let currentState: UserTabState = UserTabState.LOGIN;
let currentUserData: any = null;
let currentStoredData: any = null;
let isRenderingUserTab = false;

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
 * Main render function that manages different states
 * @param {boolean} forceRefresh - Force refresh data from API even if already loaded
 */
async function renderReferralSection(forceRefresh = false): Promise<void> {
  const container = document.getElementById("referral-section");
  if (!container) return;

  console.log("[UserTab] renderReferralSection called, forceRefresh:", forceRefresh);
  console.log("[UserTab] Current rendering state - dataset.rendering:", (container as any).dataset.rendering, "isRenderingUserTab:", isRenderingUserTab);

  // Prevent multiple simultaneous renders
  if ((container as any).dataset.rendering === 'true' || isRenderingUserTab) {
    console.log("[UserTab] Already rendering, skipping...");
    return;
  }
  
  isRenderingUserTab = true;
  
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

  currentStoredData = storedData;

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
        isRenderingUserTab = false;
        // Directly transition to login state instead of calling renderReferralSection
        setTimeout(() => {
          renderState(UserTabState.LOGIN);
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
        console.log("[UserTab] /user/me data fetched successfully:", userProfileData);
        console.log("[UserTab] User name:", userProfileData?.name);
        console.log("[UserTab] User referral used:", userProfileData?.referral?.used);
      } else {
        console.error("Invalid /user/me response:", meData);
      }
    } catch (error) {
      console.error("Error fetching user profile data:", error);
      // Clear rendering flag on error
      (container as any).dataset.rendering = 'false';
      isRenderingUserTab = false;
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

    // Store user data and determine state
    currentUserData = userProfileData;
    container.innerHTML = "";

    // Check if name is empty - show name input form
    if (!userProfileData?.name || userProfileData.name.trim() === "") {
      console.log("[UserTab] User name is empty, showing name input form");
      currentState = UserTabState.NAME_INPUT;
      renderNameInputForm(container, storedData, userProfileData);
      setupNameInputHandlers(
        storedData,
        async (updatedUserData) => {
          if (updatedUserData) {
            currentUserData = updatedUserData;
            if (updatedUserData?.referral?.used === false) {
              await renderState(UserTabState.REFERRAL_INPUT);
            } else {
              await renderState(UserTabState.AUTHENTICATED);
            }
          } else {
            await renderState(UserTabState.AUTHENTICATED);
          }
        },
        async () => await renderState(UserTabState.LOGIN)
      );
      // Clear rendering flag after showing name form
      (container as any).dataset.rendering = 'false';
      isRenderingUserTab = false;
      clearTimeout(renderTimeout);
      return;
    }

    // Check if referral is not used - show referral form
    if (userProfileData?.referral?.used === false) {
      console.log("[UserTab] User referral not used, showing referral input form");
      currentState = UserTabState.REFERRAL_INPUT;
      renderReferralInputForm(container, storedData, userProfileData);
      setupReferralInputHandlers(
        storedData,
        userProfileData,
        async () => await renderState(UserTabState.AUTHENTICATED),
        async () => await renderState(UserTabState.WAITLIST),
        async () => await renderState(UserTabState.LOGIN)
      );
      // Clear rendering flag after showing referral form
      (container as any).dataset.rendering = 'false';
      isRenderingUserTab = false;
      clearTimeout(renderTimeout);
      return;
    }

    // Normal flow - show full user profile
    console.log("[UserTab] User is fully authenticated, showing authenticated section");
    // Clear container first to prevent duplication
    container.innerHTML = "";
    
    // Set state and render authenticated section
    currentState = UserTabState.AUTHENTICATED;
    await renderState(UserTabState.AUTHENTICATED);

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
  isRenderingUserTab = false;
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

          // Clear OTP session data
          clearOtpSession();

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
    currentState = UserTabState.LOGIN;
    renderLoginForm(container);
    setupLoginHandlers(async (email: string) => {
      setEmail(email);
      await renderState(UserTabState.OTP);
    });

    // Clear rendering flag for non-logged in users
    (container as any).dataset.rendering = 'false';
    clearTimeout(renderTimeout);
  }
}

/**
 * Render specific state
 */
async function renderState(state: UserTabState): Promise<void> {
  const container = document.getElementById("referral-section");
  if (!container) return;

  container.innerHTML = "";
  currentState = state;

  switch (state) {
    case UserTabState.LOGIN:
      renderLoginForm(container);
      setupLoginHandlers(async (email: string) => {
        setEmail(email);
        await renderState(UserTabState.OTP);
      });
      break;

    case UserTabState.OTP:
      // Get email from OTP module or localStorage
      const savedEmail = localStorage.getItem('foru_current_email') || "";
      renderOtpForm(container, savedEmail);
      setupOtpHandlers(
        async () => {
          // After successful OTP verification, directly transition to authenticated state
          console.log("[UserTab] OTP verification successful, transitioning to authenticated state...");
          
          // Clear any rendering flags to allow fresh render
          const container = document.getElementById("referral-section");
          if (container) {
            (container as any).dataset.rendering = 'false';
          }
          isRenderingUserTab = false;
          
          // Directly call renderReferralSection to fetch user data and show authenticated state
          try {
            await renderReferralSection(true);
          } catch (error) {
            console.error("[UserTab] Error in OTP success callback:", error);
            // Fallback: show login form
            await renderState(UserTabState.LOGIN);
          }
        },
        async () => await renderState(UserTabState.LOGIN)
      );
      break;

    case UserTabState.NAME_INPUT:
      if (currentUserData && currentStoredData) {
        renderNameInputForm(container, currentStoredData, currentUserData);
        setupNameInputHandlers(
          currentStoredData,
          async (updatedUserData) => {
            if (updatedUserData) {
              currentUserData = updatedUserData;
            if (updatedUserData?.referral?.used === false) {
              await renderState(UserTabState.REFERRAL_INPUT);
            } else {
              await renderState(UserTabState.AUTHENTICATED);
            }
          } else {
            await renderState(UserTabState.AUTHENTICATED);
          }
          },
          async () => await renderState(UserTabState.LOGIN)
        );
      }
      break;

    case UserTabState.REFERRAL_INPUT:
      if (currentUserData && currentStoredData) {
        renderReferralInputForm(container, currentStoredData, currentUserData);
        setupReferralInputHandlers(
          currentStoredData,
          currentUserData,
          async () => await renderState(UserTabState.AUTHENTICATED),
          async () => await renderState(UserTabState.WAITLIST),
          async () => await renderState(UserTabState.LOGIN)
        );
      }
      break;

    case UserTabState.WAITLIST:
      if (currentUserData && currentStoredData) {
        renderWaitlistForm(container, currentStoredData, currentUserData);
        setupWaitlistHandlers(
          currentStoredData,
          currentUserData,
          async () => await renderState(UserTabState.WAITLIST_SUCCESS),
          async () => await renderState(UserTabState.REFERRAL_INPUT),
          async () => await renderState(UserTabState.LOGIN)
        );
      }
      break;

    case UserTabState.WAITLIST_SUCCESS:
      renderWaitlistSuccessMessage(container);
      setupWaitlistSuccessHandlers(
        async () => await renderState(UserTabState.REFERRAL_INPUT),
        async () => await renderState(UserTabState.LOGIN)
      );
      break;

    case UserTabState.AUTHENTICATED:
      // Show authenticated user interface directly without recursive call
      if (currentUserData && currentStoredData) {
        container.innerHTML = "";
        await renderAuthenticatedUserSection(
          currentUserData,
          currentStoredData,
          true
        );
      }
      break;
  }
}

/**
 * Force refresh function to clear stuck states
 */
export function forceRefreshUserTab(): void {
  const container = document.getElementById("referral-section");
  if (container) {
    // Clear any stuck rendering flags
    (container as any).dataset.rendering = 'false';
    isRenderingUserTab = false;
    // Force a fresh render
    renderReferralSection(true);
  }
}

/**
 * Handle tab switching to clear stuck states
 */
export function handleTabSwitch(): void {
  const container = document.getElementById("referral-section");
  if (container && ((container as any).dataset.rendering === 'true' || isRenderingUserTab)) {
    console.log("[UserTab] Tab switch detected, clearing stuck rendering");
    (container as any).dataset.rendering = 'false';
    isRenderingUserTab = false;
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