// src/profile/current_level/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

/**
 * Current Level Component
 * Renders the user's current level with progress ring and XP information
 */
export async function renderCurrentLevel(username: string): Promise<string> {
  // --- 7.7) Fetch user level/XP data from API ---
  let userLevelData = {
    exp: 0,
    level: 1,
    max_exp_on_level: 500,
    exp_progress_percentage: 0
  };
  
  try {
    if (username) {
      console.log(`📊 Fetching user level data for ${username}`);
      const userDataHeaders = await buildForuHeaders("GET", "", null);
      const userDataUrl = `${API_BASE_URL}/v1/public/user/data/${username}`;
      console.log("➡️ Fetching user data from", userDataUrl);
      const userDataResp = await fetch(userDataUrl, { headers: userDataHeaders });
      console.log("⬅️ User Data Status", userDataResp.status);

      if (userDataResp.ok) {
        const userDataJson = await userDataResp.json();
        console.log("📊 User Data JSON", userDataJson);
        if (userDataJson.code === 200 && userDataJson.data) {
          userLevelData = {
            exp: userDataJson.data.exp || 0,
            level: userDataJson.data.level || 1,
            max_exp_on_level: userDataJson.data.max_exp_on_level || 500,
            exp_progress_percentage: userDataJson.data.exp_progress_percentage || 0
          };
          console.log(`📊 Loaded user level data: Level ${userLevelData.level}, XP ${userLevelData.exp}/${userLevelData.max_exp_on_level} (${userLevelData.exp_progress_percentage}%)`);
        } else {
          console.log("📊 No user level data available, using defaults");
        }
      } else if (userDataResp.status === 404) {
        console.log("📊 404 - No user level data found for user");
      } else {
        console.error("📊 User Data API error:", userDataResp.status);
      }
    } else {
      console.log("📊 No username available for user level data");
    }
  } catch (error) {
    console.error("📊 Error fetching user level data:", error);
  }

  // --- Assemble HTML ---
  const html = `
    <!-- Current Level (Profile) - isolated dummy component -->
    <div class="profile-current-level-section current-level-profile" style="margin-top:12px;background-color:#1f1b2b;border-radius:12px;padding:12px;">
      <div class="level-progress">
        <div class="level-progress-ring">
          <svg width="82" height="41" viewBox="0 0 100 50">
            <defs>
              <linearGradient id="progressGradientProfile" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FFB005FF" />
                <stop offset="100%" stop-color="#FF8800FF" />
              </linearGradient>
            </defs>
            <!-- Background Arc -->
            <path d="M10 50 A40 40 0 0 1 90 50" stroke="#5D5D5DFF" stroke-width="8" fill="none" stroke-linecap="round" />
            <!-- Foreground Arc -->
            <path class="ring-fg" id="ringFgProfile" d="M10 50 A40 40 0 0 1 90 50" stroke="url(#progressGradientProfile)" stroke-width="8" fill="none" stroke-linecap="round" />
          </svg>
        </div>
        <div class="level-info">
          <div class="level-header">
            <span class="current-level-text">Current level</span>
            <span class="level-number">${userLevelData.level}</span>
          </div>
          <div class="xp-info">
            <img src="${chrome.runtime.getURL("images/coin.png")}" alt="Coin" class="xp-coin-img" />
            <span class="xp-current">${userLevelData.exp}</span>
            <span class="xp-total">/${userLevelData.max_exp_on_level} Xp</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return html;
}

// Expose function so it can be called from other components
(window as any).renderCurrentLevel = renderCurrentLevel;
