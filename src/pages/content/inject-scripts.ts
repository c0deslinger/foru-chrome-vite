// src/pages/content/inject-scripts.ts
// This file imports and initializes all inject scripts from the old project

// Initialize all inject scripts
async function initializeInjectScripts() {
  try {
    console.log('[Inject Scripts] Initializing inject scripts...');
    
    // Load all inject scripts dynamically
    try {
      await import('../popup/badge-dialog/index');
      console.log('[Inject Scripts] Loaded badge-dialog');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load badge-dialog:', error);
    }
    
    try {
      await import('../popup/dna-dialog/index');
      console.log('[Inject Scripts] Loaded dna-dialog');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load dna-dialog:', error);
    }
    
    try {
      await import('../popup/tweet-analysis-dialog/index');
      console.log('[Inject Scripts] Loaded tweet-analysis-dialog');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load tweet-analysis-dialog:', error);
    }
    
    try {
      await import('./tweet-analyze-buttons/index');
      console.log('[Inject Scripts] Loaded tweet-analyze-buttons');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load tweet-analyze-buttons:', error);
    }
    
    try {
      await import('./button_view_profile/index');
      console.log('[Inject Scripts] Loaded button_view_profile');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load button_view_profile:', error);
    }
    
    try {
      await import('./score_profile_picture/index');
      console.log('[Inject Scripts] Loaded score_profile_picture');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load score_profile_picture:', error);
    }
    
    try {
      await import('./score_credibility/index');
      console.log('[Inject Scripts] Loaded score_credibility');
    } catch (error) {
      console.warn('[Inject Scripts] Failed to load score_credibility:', error);
    }
    
    // Load profile and user scripts
    try {
      await import('../panel/profile/profile_tab/index');
      await import('../panel/profile/badges/index');
      await import('../panel/user/user_tab/index');
      await import('../panel/user/authenticated/profile_header/index');
      await import('../panel/user/authenticated/referral/index');
      await import('../panel/global/identifi_score_breakdown/index');
      await import('../panel/global/user_digital_dna/index');
      await import('../panel/global/current_level/index');
      await import('../panel/global/collected_badges/index');
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
