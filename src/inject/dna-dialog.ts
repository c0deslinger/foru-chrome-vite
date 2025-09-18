// src/inject/dna-dialog.js

/**
 * DnaDialog - Shared class for displaying DNA popup dialogs
 * Can be used by score_credibility.js, profile.js, and user_metrics_card.js
 * 
 * This file contains both CSS styles and JavaScript functionality
 */

// CSS Styles for DNA Dialog
const DNA_DIALOG_CSS = `
/* DNA Dialog Styles */
.foru-dna-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.foru-dna-dialog {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 24px;
  max-width: 650px;
  width: 90%;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
}

.foru-dna-dialog-content-wrapper {
  background: #ffffff;
  border-radius: 22px;
  padding: 32px;
  width: 100%;
  height: 100%;
  position: relative;
}

.foru-dna-dialog-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 24px;
  position: relative;
}

.foru-dna-dialog-close {
  background: #7246ce;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 0;
  box-shadow: 0px 1px 2px 0px rgba(55, 93, 251, 0.08);
}

.foru-dna-dialog-close img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
}

.foru-dna-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}

.foru-dna-dialog-dna-image {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  object-fit: cover;
}

.foru-dna-dialog-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  color: #0a0d14;
  letter-spacing: -0.2px;
  margin: 0;
}

.foru-dna-dialog-percentage {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #6c4cb3;
  margin: 0;
}

.foru-dna-dialog-description {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: #6b7280;
  margin: 0;
  max-width: 400px;
}

.foru-dna-dialog-progress-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  width: 100%;
  box-sizing: border-box;
}

.foru-dna-dialog-progress-bar {
  flex: 1;
  height: 8px;
  background-color: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
  min-width: 0;
}

.foru-dna-dialog-progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease-in-out;
  animation: progressLoad 1.5s ease-out;
}

@keyframes progressLoad {
  from {
    width: 0%;
  }
}

.foru-dna-dialog-percentage-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #6c4cb3;
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

.foru-dna-dialog-rank {
  background: linear-gradient(135deg, #6c4cb3 0%, #4a2c85 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin: 0;
}

.foru-dna-dialog-tweet-section {
  width: 100%;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
}

.foru-dna-dialog-tweet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.foru-dna-dialog-profile-photo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.foru-dna-dialog-tweet-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  text-align: left;
}

.foru-dna-dialog-tweet-author {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #0a0d14;
  margin: 0;
}

.foru-dna-dialog-tweet-date {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.foru-dna-dialog-tweet-content {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: #0a0d14;
  margin: 0;
  text-align: left;
}
`;

/**
 * DnaDialog class for managing DNA popup dialogs
 */
class DnaDialog {
  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles into the page
   */
  injectStyles() {
    if (!document.getElementById('foru-dna-dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'foru-dna-dialog-styles';
      style.textContent = DNA_DIALOG_CSS;
      document.head.appendChild(style);
    }
  }

  /**
   * Show DNA dialog
   * @param {Object} dna - DNA data object
   * @param {Object} userProfileData - User profile data (optional, for user tab)
   */
  show(dna, userProfileData = null) {
    console.log('DnaDialog.show called with:', dna, 'userProfileData:', userProfileData);
    
    // Remove existing dialog if any
    this.hide();

    const overlay = document.createElement('div');
    overlay.className = 'foru-dna-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'foru-dna-dialog';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'foru-dna-dialog-content-wrapper';
    
    const header = document.createElement('div');
    header.className = 'foru-dna-dialog-header';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'foru-dna-dialog-close';
    closeButton.innerHTML = '<img src="' + chrome.runtime.getURL('images/badge-dialog/close-icon.svg') + '" alt="Close">';
    closeButton.onclick = () => this.hide();
    
    header.appendChild(closeButton);
    
    const content = document.createElement('div');
    content.className = 'foru-dna-dialog-content';
    
    // DNA image
    const dnaImage = document.createElement('img');
    dnaImage.className = 'foru-dna-dialog-dna-image';
    dnaImage.src = dna.image || chrome.runtime.getURL('images/dna_molecule.png');
    dnaImage.alt = dna.title;
    dnaImage.onerror = function() {
      this.src = chrome.runtime.getURL('images/dna_molecule.png');
    };
    
    // DNA title
    const title = document.createElement('h1');
    title.className = 'foru-dna-dialog-title';
    title.textContent = dna.title;
    
    // DNA description
    const description = document.createElement('p');
    description.className = 'foru-dna-dialog-description';
    description.textContent = `${dna.description}`;
    
    // Progress section with bar and percentage
    const progressSection = document.createElement('div');
    progressSection.className = 'foru-dna-dialog-progress-section';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'foru-dna-dialog-progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'foru-dna-dialog-progress-fill';
    progressFill.style.width = `${dna.percentage}%`;
    
    // Use the same gradient colors as the grid items based on DNA index
    const dnaIndex = parseInt(dna.id?.replace('dna-', '') || '0');
    const gradientColors = [
      'linear-gradient(90deg, #14b8a6 0%, #0d9488 100%)', // Teal/Green - dna-0-bar
      'linear-gradient(90deg, #f97316 0%, #ea580c 100%)', // Orange - dna-1-bar
      'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)', // Blue - dna-2-bar
      'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)'  // Purple - dna-3-bar
    ];
    progressFill.style.background = gradientColors[dnaIndex] || gradientColors[0];
    
    progressBar.appendChild(progressFill);
    
    const percentageText = document.createElement('div');
    percentageText.className = 'foru-dna-dialog-percentage-text';
    percentageText.textContent = `${dna.percentage}% Match`;
    
    progressSection.appendChild(progressBar);
    progressSection.appendChild(percentageText);
    
    // Rank badge if available
    if (dna.rank) {
      const rankBadge = document.createElement('div');
      rankBadge.className = 'foru-dna-dialog-rank';
      rankBadge.textContent = dna.rank;
      content.appendChild(rankBadge);
    }
    
    // Tweet section
    const tweetSection = document.createElement('div');
    tweetSection.className = 'foru-dna-dialog-tweet-section';
    
    // Get profile photo and username - use userProfileData if available (user tab), otherwise from Twitter page (profile tab)
    let profilePhotoUrl = chrome.runtime.getURL('icons/icon128.png'); // Default fallback
    let username = 'User';
    
    if (userProfileData) {
      // Use user profile data from user tab
      profilePhotoUrl = userProfileData.twitter_account?.profile_picture_url || chrome.runtime.getURL('icons/icon128.png');
      username = userProfileData.twitter_account?.username || userProfileData.name || 'User';
    } else {
      // Use Twitter page data for profile tab
      try {
        const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
        if (primaryColumn) {
          const avatarElem = primaryColumn.querySelector('img[src*="profile_images"]');
          if (avatarElem) {
            profilePhotoUrl = avatarElem.src;
          }
        }
        if (profilePhotoUrl === chrome.runtime.getURL('icons/icon128.png')) {
          const fallback = document.querySelector('img[src*="profile_images"]');
          if (fallback) {
            profilePhotoUrl = fallback.src;
          }
        }
        
        // Get username from URL
        const parts = window.location.pathname.split("/").filter((p) => p);
        if (parts.length) {
          username = parts[0];
        }
      } catch (error) {
        console.warn('Could not fetch profile photo from Twitter page:', error);
      }
    }
    
    // Tweet header with profile photo and info
    const tweetHeader = document.createElement('div');
    tweetHeader.className = 'foru-dna-dialog-tweet-header';
    
    const profilePhoto = document.createElement('img');
    profilePhoto.className = 'foru-dna-dialog-profile-photo';
    profilePhoto.src = profilePhotoUrl;
    profilePhoto.alt = 'Profile Photo';
    profilePhoto.onerror = function() {
      this.src = chrome.runtime.getURL('icons/icon128.png');
    };
    
    const tweetInfo = document.createElement('div');
    tweetInfo.className = 'foru-dna-dialog-tweet-info';
    
    const tweetAuthor = document.createElement('div');
    tweetAuthor.className = 'foru-dna-dialog-tweet-author';
    tweetAuthor.textContent = username;
    
    const tweetDate = document.createElement('div');
    tweetDate.className = 'foru-dna-dialog-tweet-date';
    tweetDate.textContent = `${dna.created_at}`; 
    
    tweetInfo.appendChild(tweetAuthor);
    tweetInfo.appendChild(tweetDate);
    
    tweetHeader.appendChild(profilePhoto);
    tweetHeader.appendChild(tweetInfo);
    
    // Tweet content (dummy)
    const tweetContent = document.createElement('div');
    tweetContent.className = 'foru-dna-dialog-tweet-content';
    tweetContent.textContent = `${dna.tweet_highlight}`;

    tweetSection.appendChild(tweetHeader);
    tweetSection.appendChild(tweetContent);
    
    content.appendChild(dnaImage);
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(progressSection);
    content.appendChild(tweetSection);
    
    contentWrapper.appendChild(header);
    contentWrapper.appendChild(content);
    dialog.appendChild(contentWrapper);
    overlay.appendChild(dialog);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(overlay);
    this.currentOverlay = overlay;
    console.log('DNA dialog created');
  }

  /**
   * Hide DNA dialog
   */
  hide() {
    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }
  }

  /**
   * Add event listeners to all DNA cards on the page
   */
  addEventListenersToAll() {
    const dnaCards = document.querySelectorAll('.dna-card[data-dna]');
    console.log('Adding event listeners to', dnaCards.length, 'DNA cards');
    
    dnaCards.forEach((item, index) => {
      item.addEventListener('click', () => {
        console.log('DNA card clicked:', index);
        const dnaData = item.getAttribute('data-dna');
        if (dnaData) {
          try {
            const dna = JSON.parse(dnaData);
            console.log('DNA data:', dna);
            this.show(dna);
          } catch (error) {
            console.error('Error parsing DNA data:', error);
          }
        } else {
          console.log('No DNA data found');
        }
      });
      item.style.cursor = 'pointer';
    });
  }
}

// Create global instance
window.dnaDialog = new DnaDialog();

// Expose function for backward compatibility
window.createDnaDialog = function(dna) {
  window.dnaDialog.show(dna);
};

console.log('DnaDialog loaded and ready'); 