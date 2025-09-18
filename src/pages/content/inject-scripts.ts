// src/pages/content/inject-scripts.ts
// This file imports and initializes all inject scripts from the old project

// Initialize all inject scripts
async function initializeInjectScripts() {
  try {
    console.log('[Inject Scripts] Initializing inject scripts...');
    
    // Load all inject scripts dynamically
    try {
      await import('../../inject/badge-dialog.ts');
      console.log('[Inject Scripts] Loaded badge-dialog');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load badge-dialog:', error);
    }
    
    try {
      await import('../../inject/dna-dialog.ts');
      console.log('[Inject Scripts] Loaded dna-dialog');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load dna-dialog:', error);
    }
    
    try {
      await import('../../inject/tweet-analysis-dialog.ts');
      console.log('[Inject Scripts] Loaded tweet-analysis-dialog');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load tweet-analysis-dialog:', error);
    }
    
    try {
      await import('../../inject/tweet-analyze-buttons.ts');
      console.log('[Inject Scripts] Loaded tweet-analyze-buttons');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load tweet-analyze-buttons:', error);
    }
    
    try {
      await import('../../inject/button_view_profile.ts');
      console.log('[Inject Scripts] Loaded button_view_profile');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load button_view_profile:', error);
    }
    
    try {
      await import('../../inject/score_profile_picture.ts');
      console.log('[Inject Scripts] Loaded score_profile_picture');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load score_profile_picture:', error);
    }
    
    try {
      await import('../../inject/score_credibility.ts');
      console.log('[Inject Scripts] Loaded score_credibility');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load score_credibility:', error);
    }
    
    // Load profile and user scripts
    try {
      await import('../panel/profile/profile/index.ts');
      await import('../panel/profile/badges/index.ts');
      await import('../panel/profile/quests/index.ts');
      await import('../panel/user/user_tab/index.ts');
      await import('../panel/user/user_profile_card/index.ts');
      await import('../panel/user/user_referral_section/index.ts');
      await import('../panel/user/user_metrics_card/index.ts');
      await import('../panel/user/user_badges_section/index.ts');
      console.log('[Inject Scripts] Profile and user scripts loaded');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load profile/user scripts:', error);
    }
    
    console.log('[Inject Scripts] All scripts initialized');
  } catch (error) {
    console.error('[Inject Scripts] Failed to initialize:', error);
  }
}

// Export the initialization function to be called from content script
// Don't auto-initialize here, let the content script control the timing

export default initializeInjectScripts;
