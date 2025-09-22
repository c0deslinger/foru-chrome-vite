// src/pages/panel/user_tab/authenticated/index.ts

import { renderUserProfileCard } from './profile_header/index.js';
import { renderReferralDetails } from './referral/index.js';
import { renderCurrentLevelForUserTab } from '../../global/current_level/index.js';
import { renderUserBadgesSection } from '../../global/collected_badges/index.js';
import { renderIdentifiScoreBreakdownForUserTab } from '../../global/identifi_score_breakdown/index.js';
import { renderUserDigitalDnaForUserTab } from '../../global/user_digital_dna/index.js';

interface UserProfileData {
  name?: string;
  email?: string;
  avatar?: string;
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
 * Main function to render the authenticated user section
 * Combines profile header, current level, score breakdown, digital DNA, badges, and referral components
 */
export async function renderAuthenticatedUserSection(
  userProfileData: UserProfileData | null = null,
  storedData: StoredData = {},
  forceRefresh = false
): Promise<void> {
  console.log("[AuthenticatedUser] Starting to render authenticated user section");
  
  // Get the main container
  const container = document.getElementById("referral-section");
  if (!container) {
    console.error("[AuthenticatedUser] Container not found");
    return;
  }

  // Don't clear container if it's already been cleared by parent function
  // This prevents duplicate clearing and potential race conditions

  try {
    // Render profile header (includes profile card, level, metrics, and badges)
    // Pass userProfileData to avoid duplicate /user/me calls
    await renderUserProfileCard(
      userProfileData,
      storedData,
      () => {
        // Callback after logout - could be used for cleanup
        console.log("[AuthenticatedUser] Logout callback executed");
      },
      forceRefresh
    );

    // Render referral details
    try {
      await renderReferralDetails(userProfileData, forceRefresh);
    } catch (referralError) {
      console.error("[AuthenticatedUser] Error rendering referral details:", referralError);
      // Continue without failing the whole section
    }

    console.log("[AuthenticatedUser] Authenticated user section rendered successfully");
  } catch (error) {
    console.error("[AuthenticatedUser] Error rendering authenticated user section:", error);
    
    // Fallback error message
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #aeb0b6;">
        <p>Failed to load user data. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Refresh the authenticated user section
 */
export async function refreshAuthenticatedUserSection(
  userProfileData: UserProfileData | null = null,
  storedData: StoredData = {}
): Promise<void> {
  console.log("[AuthenticatedUser] Refreshing authenticated user section");
  await renderAuthenticatedUserSection(userProfileData, storedData, true);
}

/**
 * Initialize the authenticated user section
 * This function can be called when the extension loads or when user logs in
 */
export async function initializeAuthenticatedUserSection(): Promise<void> {
  console.log("[AuthenticatedUser] Initializing authenticated user section");
  
  // Get stored data
  const storedData = await chrome.storage.local.get([
    'accessToken', 'id', 'twitterId', 'googleId', 'expiresAt', 'loginType'
  ]);

  if (!storedData.accessToken) {
    console.log("[AuthenticatedUser] No access token found, skipping initialization");
    return;
  }

  try {
    // Fetch user profile data if needed
    let userProfileData: UserProfileData | null = null;
    
    // You could add API call here to fetch user profile data
    // For now, we'll let the individual components handle their own data fetching
    
    await renderAuthenticatedUserSection(userProfileData, storedData);
  } catch (error) {
    console.error("[AuthenticatedUser] Error initializing authenticated user section:", error);
  }
}

// Export all the individual component functions for backward compatibility
export { renderUserProfileCard } from './profile_header/index.js';
export { renderReferralDetails } from './referral/index.js';

// Export global component functions for direct access if needed
export { renderCurrentLevelForUserTab } from '../../global/current_level/index.js';
export { renderUserBadgesSection } from '../../global/collected_badges/index.js';
export { renderIdentifiScoreBreakdownForUserTab } from '../../global/identifi_score_breakdown/index.js';
export { renderUserDigitalDnaForUserTab } from '../../global/user_digital_dna/index.js';

// Expose functions globally for backward compatibility
(window as any).renderAuthenticatedUserSection = renderAuthenticatedUserSection;
(window as any).refreshAuthenticatedUserSection = refreshAuthenticatedUserSection;
(window as any).initializeAuthenticatedUserSection = initializeAuthenticatedUserSection;
