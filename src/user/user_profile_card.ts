// File: src/user/user_profile_card.js

// Import fungsi yang dibutuhkan dari user_tab.js
import {
  showCustomNotification,
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
} from "./user_tab.js";
// Import renderUserMetricsCard
import { renderUserMetricsCard } from "./user_metrics_card.js"; // <--- TAMBAHKAN INI
// Import renderUserBadgesSection
import { renderUserBadgesSection } from "./user_badges_section.js";

/**
 * Merender kartu profil pengguna dengan data yang diberikan dan tombol logout.
 * @param {object|null} userProfileData - Data profil pengguna dari API /user/me.
 * @param {object} storedData - Data yang disimpan di chrome.storage.local (accessToken, id, dll.).
 * @param {function} onLogoutCallback - Fungsi callback yang akan dipanggil setelah logout berhasil (misalnya, renderReferralSection).
 */
export async function renderUserProfileCard(
  userProfileData = null,
  storedData = {},
  onLogoutCallback = () => {},
  forceRefresh = false
) {
  const container = document.getElementById("referral-section");
  if (!container) return;

  let profileHtml = "";
  let progressPercent = 2; // Define progressPercent here to make it available in the whole function scope
  let identifiScore = 0; // Initialize identifi score

  // Fetch identifi_score from API if user data available
  if (storedData.accessToken) {
    try {
      const currentTimestamp = Date.now().toString();
      const signature = generateForuSignature("GET", "", currentTimestamp);

      console.log("[UserProfileCard] Fetching IdentiFi score from /v1/user/metrics");
      const response = await fetch(
        `${API_BASE_URL}/v1/user/metrics`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
            "Authorization": `Bearer ${storedData.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[UserProfileCard] Metrics response:", data);
        if (data && data.code === 200 && data.data) {
          identifiScore = data.data.identifi_score || 0;
          console.log("[UserProfileCard] IdentiFi score:", identifiScore);
        }
      } else {
        console.error("[UserProfileCard] API error:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching IdentiFi score:", error);
    }
  }

  if (userProfileData) {
    const profilePic =
      userProfileData.twitter_account?.profile_picture_url ||
      chrome.runtime.getURL("icons/icon128.png");
    const userName = userProfileData.name || "N/A";
    const twitterHandle = userProfileData.twitter_account?.username
      ? `@${userProfileData.twitter_account.username}`
      : "N/A";
    const twitterLocation = userProfileData.twitter_account?.location || "N/A";

    // Define variables for level and XP from API data
    const currentLevel = userProfileData.attributes?.level || 1;
    const xpCurrent = userProfileData.attributes?.exp || 0;
    const xpTotal = userProfileData.attributes?.max_exp_on_level || 500;
    progressPercent = userProfileData.attributes?.exp_progress_percentage || 0;

    if (progressPercent == 0) {
      progressPercent = 2;
    }
    

    profileHtml = `
      <div class="profile-card-modern">
        <div class="ai-did-badge">AI-DID</div>
        <button id="copy-token-btn" class="copy-token-button" title="Copy Access Token">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <div class="profile-avatar-container">
          <img src="${profilePic}" alt="Profile Picture" class="profile-avatar-modern">
        </div>
        <div class="profile-info-modern">
          <h2 class="profile-name">${userName}</h2>
          <div class="profile-handle">${twitterHandle}</div>
          <div class="shannon-coder-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8l-3 3 3 3"></path>
              <path d="M15 8l-3 3 3 3"></path>
            </svg>
            IdentiFi Score: ${identifiScore.toLocaleString()}
          </div>
        </div>
      </div>

      <div class="current-level-section">
        <div class="level-progress">
            <div class="level-progress-ring">
            <svg width="82" height="41" viewBox="0 0 100 50">
                <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#FFB005FF" />
                  <stop offset="100%" stop-color="#FF8800FF" />
                  </linearGradient>
                </defs>
              <!-- Background Arc -->
              <path d="M10 50 A40 40 0 0 1 90 50" stroke="#5D5D5DFF" stroke-width="8" fill="none" stroke-linecap="round" />
              <!-- Foreground Arc -->
              <path class="ring-fg" id="ringFg" d="M10 50 A40 40 0 0 1 90 50" stroke="url(#progressGradient)" stroke-width="8" fill="none" stroke-linecap="round" />
              </svg>
          </div>
          <div class="level-info">
            <div class="level-header">
              <span class="current-level-text">Current level</span>
              <span class="level-number">${currentLevel}</span>
            </div>
            <div class="xp-info">
              <img src="${chrome.runtime.getURL(
                "images/coin.png"
              )}" alt="Coin" class="xp-coin-img" />
              <span class="xp-current">${xpCurrent}</span>
              <span class="xp-total">/${xpTotal} Xp</span>
            </div>
          </div>
        </div>
      </div>
      <div id="user-metrics-display-area"></div> 
      <div id="user-badges-display-area"></div>
    `;
  } else {
    profileHtml = `
      <p style="color: #aeb0b6; font-size: 14px; margin-top: 20px;">
        Failed to load your profile data. Please check your network or try again.
      </p>
    `;
  }

  // Masukkan HTML profil ke dalam container
  // Clear any existing profile content first
  const existingProfileCard = container.querySelector('.profile-card-modern');
  const existingLevelSection = container.querySelector('.current-level-section');
  const existingMetricsArea = container.querySelector('#user-metrics-display-area');
  
  if (existingProfileCard) {
    existingProfileCard.remove();
  }
  if (existingLevelSection) {
    existingLevelSection.remove();
  }
  if (existingMetricsArea) {
    existingMetricsArea.remove();
  }
  
  // Insert profile HTML at the beginning of the container
  container.insertAdjacentHTML("afterbegin", profileHtml);

  // Setelah HTML disisipkan dan elemen #user-metrics-display-area ada,
  // baru kita panggil renderUserMetricsCard.
  if (storedData.accessToken) {
    const metricsDisplayArea = document.getElementById(
      "user-metrics-display-area"
    );
    if (metricsDisplayArea) {
      renderUserMetricsCard(
        metricsDisplayArea,
        storedData.accessToken,
        forceRefresh,
        userProfileData
      ); // <--- PASSING ELEMENT SEBAGAI ARGUMEN
    } else {
      console.error(
        "Could not find #user-metrics-display-area to render metrics."
      );
    }

    // Render badges section
    const badgesDisplayArea = document.getElementById(
      "user-badges-display-area"
    );
    if (badgesDisplayArea) {
      renderUserBadgesSection(
        badgesDisplayArea,
        storedData.accessToken
      );
    } else {
      console.error(
        "Could not find #user-badges-display-area to render badges."
      );
    }
  }

  // AFTER inserting profileHtml, animate ring progress
  const ringPath = container.querySelector("#ringFg");
  if (ringPath) {
    const length = ringPath.getTotalLength();
    if (length > 0) {
      ringPath.style.strokeDasharray = length;
      ringPath.style.strokeDashoffset = length;

      // Force reflow before applying the transition
      ringPath.getBoundingClientRect();

      // Start the animation
      ringPath.style.transition = "stroke-dashoffset 1.5s ease-out";
      const offset = length * (1 - progressPercent / 100);
      // const offset = length * (1 - 10 / 100);
      ringPath.style.strokeDashoffset = offset;
    }
  }

  // Add event listener for copy token button
  const copyTokenBtn = document.getElementById("copy-token-btn");
  if (copyTokenBtn && storedData.accessToken) {
    copyTokenBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(storedData.accessToken);
        showCustomNotification("Access token copied to clipboard!");

        // Visual feedback - change button color briefly
        copyTokenBtn.style.background = "rgba(34, 197, 94, 0.9)";
        setTimeout(() => {
          copyTokenBtn.style.background = "rgba(99, 102, 241, 0.9)";
        }, 1000);
      } catch (error) {
        console.error("Failed to copy access token:", error);
        showCustomNotification("Failed to copy access token!", true);
      }
    });
  }
}
