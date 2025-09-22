// src/pages/panel/global/current_level/index.ts

import { buildForuHeaders, generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface CurrentLevelApiConfig {
  type: 'public' | 'authenticated';
  username?: string;
  accessToken?: string;
  style?: 'profile' | 'user_tab';
}

export interface UserLevelData {
  exp: number;
  level: number;
  max_exp_on_level: number;
  exp_progress_percentage: number;
  levelName?: string;
  nextLevelExp?: number;
}

/**
 * Fetch user level data from public API (for profile view)
 */
async function fetchPublicUserLevel(username: string): Promise<UserLevelData> {
  const defaultData: UserLevelData = {
    exp: 0,
    level: 1,
    max_exp_on_level: 500,
    exp_progress_percentage: 0
  };

  try {
    if (!username) {
      console.log("📊 No username available for user level data");
      return defaultData;
    }

    console.log(`📊 Fetching public user level data for ${username}`);
    const userDataHeaders = await buildForuHeaders("GET", "", undefined);
    const userDataUrl = `${API_BASE_URL}/v1/public/user/data/${username}`;
    console.log("➡️ Fetching user data from", userDataUrl);
    const userDataResp = await fetch(userDataUrl, { headers: userDataHeaders });
    console.log("⬅️ User Data Status", userDataResp.status);

    if (userDataResp.ok) {
      const userDataJson = await userDataResp.json();
      console.log("📊 User Data JSON", userDataJson);
      if (userDataJson.code === 200 && userDataJson.data) {
        const levelData = {
          exp: userDataJson.data.exp || 0,
          level: userDataJson.data.level || 1,
          max_exp_on_level: userDataJson.data.max_exp_on_level || 500,
          exp_progress_percentage: userDataJson.data.exp_progress_percentage || 0
        };
        console.log(`📊 Loaded public user level data: Level ${levelData.level}, XP ${levelData.exp}/${levelData.max_exp_on_level} (${levelData.exp_progress_percentage}%)`);
        return levelData;
      } else {
        console.log("📊 No public user level data available, using defaults");
      }
    } else if (userDataResp.status === 404) {
      console.log("📊 404 - No public user level data found for user");
    } else {
      console.error("📊 Public User Data API error:", userDataResp.status);
    }
  } catch (error) {
    console.error("📊 Error fetching public user level data:", error);
  }

  return defaultData;
}

/**
 * Fetch user level data from authenticated API (for user tab)
 */
async function fetchAuthenticatedUserLevel(accessToken: string): Promise<UserLevelData> {
  const defaultData: UserLevelData = {
    exp: 0,
    level: 1,
    max_exp_on_level: 500,
    exp_progress_percentage: 0,
    levelName: "Newcomer",
    nextLevelExp: 100
  };

  try {
    if (!accessToken) {
      console.log("📊 No access token available for authenticated user level data");
      return defaultData;
    }

    console.log(`📊 Fetching authenticated user level data`);
    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "", currentTimestamp);

    const response = await fetch(
      `${API_BASE_URL}/v1/user/data`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
          "x-foru-timestamp": currentTimestamp,
          "x-foru-signature": signature,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data?.code === 200 && data.data) {
      const levelData = {
        exp: data.data.exp || 0,
        level: data.data.level || 1,
        max_exp_on_level: data.data.max_exp_on_level || 500,
        exp_progress_percentage: data.data.exp_progress_percentage || 0,
        levelName: data.data.level_name || "Newcomer",
        nextLevelExp: data.data.next_level_exp || 100
      };
      console.log(`📊 Loaded authenticated user level data: Level ${levelData.level}, XP ${levelData.exp}/${levelData.max_exp_on_level} (${levelData.exp_progress_percentage}%)`);
      return levelData;
    }
  } catch (error) {
    console.error("📊 Error fetching authenticated user level data:", error);
  }

  return defaultData;
}

/**
 * Render profile style current level (with progress ring)
 */
function renderProfileStyleLevel(userLevelData: UserLevelData): string {
  return `
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
}

/**
 * Render user tab style current level (with progress bar)
 */
function renderUserTabStyleLevel(userLevelData: UserLevelData): string {
  const progressPercentage = Math.round((userLevelData.exp || 0) / (userLevelData.nextLevelExp || userLevelData.max_exp_on_level || 100) * 100);

  return `
    <div class="current-level-container">
      <h3>Current Level</h3>
      <div class="level-card">
        <div class="level-info">
          <div class="level-number">Level ${userLevelData.level}</div>
          <div class="level-name">${userLevelData.levelName || "Newcomer"}</div>
        </div>
        <div class="level-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
          </div>
          <div class="progress-text">${userLevelData.exp}/${userLevelData.nextLevelExp || userLevelData.max_exp_on_level} XP</div>
        </div>
      </div>
      <div class="level-description">
        <p>Complete quests and engage with the community to level up!</p>
      </div>
    </div>
  `;
}

/**
 * Global Current Level Component
 * Renders the user's current level with different styles for profile and user tab
 * Supports both public (profile) and authenticated (user tab) API calls
 */
export async function renderCurrentLevel(config: CurrentLevelApiConfig): Promise<string> {
  const { type, username, accessToken, style = 'profile' } = config;
  
  // Fetch level data based on configuration
  let userLevelData: UserLevelData;
  
  if (type === 'public' && username) {
    userLevelData = await fetchPublicUserLevel(username);
  } else if (type === 'authenticated' && accessToken) {
    userLevelData = await fetchAuthenticatedUserLevel(accessToken);
  } else {
    console.error('Invalid configuration for renderCurrentLevel:', config);
    userLevelData = {
      exp: 0,
      level: 1,
      max_exp_on_level: 500,
      exp_progress_percentage: 0
    };
  }

  // Render based on style
  if (style === 'profile') {
    return renderProfileStyleLevel(userLevelData);
  } else {
    return renderUserTabStyleLevel(userLevelData);
  }
}

/**
 * Render current level for user tab (authenticated context)
 * This function is specifically for the user tab context where we render into a container
 */
export async function renderCurrentLevelForUserTab(container: HTMLElement, accessToken: string): Promise<void> {
  if (!container || !accessToken) {
    console.error("Target container or access token for current level is not provided.");
    return;
  }

  try {
    const userLevelData = await fetchAuthenticatedUserLevel(accessToken);
    const levelHtml = renderUserTabStyleLevel(userLevelData);
    container.innerHTML = levelHtml;
    console.log("[CurrentLevel] Level information rendered for user tab");
  } catch (error) {
    console.error("Error rendering current level for user tab:", error);
    // Render default level on error
    const defaultHtml = renderUserTabStyleLevel({
      exp: 0,
      level: 1,
      max_exp_on_level: 500,
      exp_progress_percentage: 0,
      levelName: "Newcomer",
      nextLevelExp: 100
    });
    container.innerHTML = defaultHtml;
  }
}

// Expose functions so they can be called from other components
(window as any).renderCurrentLevel = renderCurrentLevel;
(window as any).renderCurrentLevelForUserTab = renderCurrentLevelForUserTab;
