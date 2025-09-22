// src/pages/popup/dna-dialog/index.ts

/**
 * DnaDialog - Shared class for displaying DNA popup dialogs
 * Can be used by score_credibility.ts, profile.ts, and user_metrics_card.ts
 * 
 * This file contains JavaScript functionality only
 */

interface DnaData {
  id?: string;
  title: string;
  description: string;
  percentage: number;
  image?: string;
  rank?: string;
  created_at: string;
  tweet_highlight: string;
}

interface UserProfileData {
  twitter_account?: {
    profile_picture_url?: string;
    username?: string;
  };
  name?: string;
}

/**
 * DnaDialog class for managing DNA popup dialogs
 */
class DnaDialog {
  private currentOverlay: HTMLElement | null = null;

  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles into the page
   */
  async injectStyles() {
    if (!document.getElementById('foru-dna-dialog-styles')) {
      // Load CSS content
      const cssResponse = await fetch(chrome.runtime.getURL('src/pages/popup/dna-dialog/index.css'));
      const cssContent = await cssResponse.text();

      const style = document.createElement('style');
      style.id = 'foru-dna-dialog-styles';
      style.textContent = cssContent;
      document.head.appendChild(style);
    }
  }

  /**
   * Show DNA dialog
   * @param {DnaData} dna - DNA data object
   * @param {UserProfileData} userProfileData - User profile data (optional, for user tab)
   */
  show(dna: DnaData, userProfileData: UserProfileData | null = null) {
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
      (this as HTMLImageElement).src = chrome.runtime.getURL('images/dna_molecule.png');
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
    let profilePhotoUrl = chrome.runtime.getURL('icon-128.png'); // Default fallback
    let username = 'User';
    
    if (userProfileData) {
      // Use user profile data from user tab
      profilePhotoUrl = userProfileData.twitter_account?.profile_picture_url || chrome.runtime.getURL('icon-128.png');
      username = userProfileData.twitter_account?.username || userProfileData.name || 'User';
    } else {
      // Use Twitter page data for profile tab
      try {
        const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
        if (primaryColumn) {
          const avatarElem = primaryColumn.querySelector('img[src*="profile_images"]');
          if (avatarElem) {
            profilePhotoUrl = (avatarElem as HTMLImageElement).src;
          }
        }
        if (profilePhotoUrl === chrome.runtime.getURL('icon-128.png')) {
          const fallback = document.querySelector('img[src*="profile_images"]');
          if (fallback) {
            profilePhotoUrl = (fallback as HTMLImageElement).src;
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
      (this as HTMLImageElement).src = chrome.runtime.getURL('icon-128.png');
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
    const escapeHandler = (e: KeyboardEvent) => {
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
      (item as HTMLElement).style.cursor = 'pointer';
    });
  }
}

// Create global instance
const dnaDialog = new DnaDialog();
(window as any).dnaDialog = dnaDialog;

// Expose function for backward compatibility
(window as any).createDnaDialog = function(dna: DnaData) {
  dnaDialog.show(dna);
};

console.log('DnaDialog loaded and ready');

export default DnaDialog;
