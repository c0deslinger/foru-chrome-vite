// src/pages/panel/user_tab/authenticated/profile_header/index.ts

// Import fungsi yang dibutuhkan
import {
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
  isDebugEnvironment,
} from "../../../../../lib/crypto-utils.js";

import { showCustomNotification } from "../../index.js";
import { renderIdentifiScoreBreakdownForUserTab } from "../../../global/identifi_score_breakdown/index.js";
import { renderUserDigitalDnaForUserTab } from "../../../global/user_digital_dna/index.js";
import { renderUserBadgesSection } from "../../../global/collected_badges/index.js";

interface UserProfileData {
  name?: string;
  email?: string;
  twitter_account?: {
    profile_picture_url?: string;
    username?: string;
    location?: string;
  };
  attributes?: {
    level?: number;
    exp?: number;
    max_exp_on_level?: number;
    exp_progress_percentage?: number;
  };
  [key: string]: any;
}

interface StoredData {
  accessToken?: string;
  id?: string;
  twitterId?: string;
  googleId?: string;
  expiresAt?: string;
  loginType?: string;
  [key: string]: any;
}

/**
 * Merender kartu profil pengguna dengan data yang diberikan dan tombol logout.
 * @param {object|null} userProfileData - Data profil pengguna dari API /user/me.
 * @param {object} storedData - Data yang disimpan di chrome.storage.local (accessToken, id, dll.).
 * @param {function} onLogoutCallback - Fungsi callback yang akan dipanggil setelah logout berhasil (misalnya, renderReferralSection).
 */
async function renderUserProfileCard(
  userProfileData: UserProfileData | null = null,
  storedData: StoredData = {},
  onLogoutCallback: () => void = () => {},
  forceRefresh = false
): Promise<void> {
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
      chrome.runtime.getURL("icon-128.png");
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
    

    // Only show copy token button in staging or dev environment
    const copyTokenButton = isDebugEnvironment() ? `
        <button id="copy-token-btn" class="copy-token-button" title="Copy Access Token">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
    ` : '';

    profileHtml = `
      <div class="profile-card-modern">
        <div class="ai-did-badge">AI-DID</div>
        ${copyTokenButton}
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
  const existingBadgesArea = container.querySelector('#user-badges-display-area');

  if (existingProfileCard) existingProfileCard.remove();
  if (existingLevelSection) existingLevelSection.remove();
  if (existingMetricsArea) existingMetricsArea.remove();
  if (existingBadgesArea) existingBadgesArea.remove();

  // Create a wrapper div for all profile content
  const profileWrapper = document.createElement('div');
  profileWrapper.className = 'user-profile-wrapper';
  profileWrapper.innerHTML = profileHtml;
  
  // Insert at the beginning of container
  container.insertBefore(profileWrapper, container.firstChild);

  // Add copy token functionality if user data available
  if (userProfileData && storedData.accessToken) {
    const copyTokenBtn = document.getElementById("copy-token-btn");
    if (copyTokenBtn) {
      copyTokenBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(storedData.accessToken || "");
          showCustomNotification("Access token copied to clipboard!");
        } catch (error) {
          console.error("Failed to copy access token:", error);
          showCustomNotification("Failed to copy access token", true);
        }
      });
    }

    // Animate the level progress ring
    setTimeout(() => {
      const ringPath = document.getElementById("ringFg") as SVGPathElement | null;
      if (ringPath && typeof ringPath.getTotalLength === "function") {
        try {
          const length = ringPath.getTotalLength();
          if (length > 0) {
            ringPath.style.strokeDasharray = length.toString();
            ringPath.style.strokeDashoffset = length.toString();
            
            // Force reflow
            ringPath.getBoundingClientRect();
            
            // Animate
            ringPath.style.transition = "stroke-dashoffset 1.5s ease-out";
            ringPath.style.strokeDashoffset = (length * (1 - progressPercent / 100)).toString();
          }
        } catch (error) {
          console.warn("Could not animate progress ring:", error);
        }
      }
    }, 100);

    // Render user metrics and badges in their respective containers
    const metricsContainer = document.getElementById("user-metrics-display-area");
    const badgesContainer = document.getElementById("user-badges-display-area");
    
    if (metricsContainer && storedData.accessToken) {
      // Create separate containers for score breakdown and digital DNA
      const scoreContainer = document.createElement('div');
      scoreContainer.id = 'identifi-score-container';
      const dnaContainer = document.createElement('div');
      dnaContainer.id = 'digital-dna-container';
      
      // Clear and append containers
      metricsContainer.innerHTML = '';
      metricsContainer.appendChild(scoreContainer);
      metricsContainer.appendChild(dnaContainer);
      
      // Render both sections
      await renderIdentifiScoreBreakdownForUserTab(
        scoreContainer,
        storedData.accessToken,
        forceRefresh
      );
      
      await renderUserDigitalDnaForUserTab(
        dnaContainer,
        storedData.accessToken,
        forceRefresh,
        userProfileData
      );
    }
    
    if (badgesContainer && storedData.accessToken) {
      await renderUserBadgesSection(badgesContainer, storedData.accessToken);
    }
  }

  console.log("[UserProfileCard] User profile card rendered successfully");
}

export { renderUserProfileCard };
