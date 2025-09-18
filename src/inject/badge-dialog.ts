// src/inject/badge-dialog.ts

/**
 * BadgeDialog - Shared class for displaying badge popup dialogs
 * Can be used by score_credibility.js, profile.js, and badges.js
 * 
 * This file contains both CSS styles and JavaScript functionality
 */

// CSS Styles for Badge Dialog
const BADGE_DIALOG_CSS = `
/* Badge Dialog Styles */
.foru-badge-dialog-overlay {
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

.foru-badge-dialog {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
}

.foru-badge-dialog-content-wrapper {
  background: #ffffff;
  border-radius: 22px;
  padding: 32px;
  width: 100%;
  height: 100%;
  position: relative;
}

.foru-badge-dialog-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 24px;
  position: relative;
}

.foru-badge-dialog-close {
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

.foru-badge-dialog-close img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
}

.foru-badge-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}

.foru-badge-dialog-badge-image {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  object-fit: cover;
}

.foru-badge-dialog-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  color: #0a0d14;
  letter-spacing: -0.2px;
  margin: 0;
}

.foru-badge-dialog-description {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #525866;
  letter-spacing: -0.1px;
  margin: 0;
  max-width: 300px;
}

.foru-badge-dialog-partner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.foru-badge-dialog-partner-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #525866;
  margin: 0;
}

.foru-badge-dialog-partner-logo {
  height: 16px;
  width: auto;
  border-radius: 6px;
  object-fit: contain;
  display: block;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  max-width: 80px;
}

/* Animation */
.foru-badge-dialog-overlay {
  animation: fadeIn 0.3s ease-out;
}

.foru-badge-dialog {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .foru-badge-dialog {
    width: 95%;
    padding: 16px;
    border-radius: 24px;
  }
  
  .foru-badge-dialog-title {
    font-size: 28px;
    line-height: 36px;
  }
  
  .foru-badge-dialog-badge {
    width: 150px;
    height: 150px;
  }
  
  .foru-badge-dialog-badge-container {
    width: 100%;
  }
}
`;

interface Badge {
  name: string;
  image?: string;
  description?: string;
  partnerLogo?: string;
  partnerName?: string;
}

/**
 * BadgeDialog Class
 */
class BadgeDialog {
  private isDialogOpen: boolean = false;
  private isStylesInjected: boolean = false;

  constructor() {
    this.injectStyles();
    this.setupMessageListener();
  }

  /**
   * Inject CSS styles into document head
   */
  injectStyles() {
    if (this.isStylesInjected) {
      return;
    }

    // Check if styles already exist
    const existingStyle = document.querySelector('#foru-badge-dialog-styles');
    if (existingStyle) {
      this.isStylesInjected = true;
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'foru-badge-dialog-styles';
    styleElement.textContent = BADGE_DIALOG_CSS;
    document.head.appendChild(styleElement);
    this.isStylesInjected = true;
    
    console.log('Badge dialog styles injected');
  }

  /**
   * Setup message listener for sidepanel communication
   */
  private setupMessageListener() {
    // Listen for messages from sidepanel
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'showBadgeDialog' && message.badge) {
        this.show(message.badge);
        sendResponse({ success: true });
      }
    });
  }

  /**
   * Create and display badge dialog popup
   * @param {Badge} badge - Badge object with name, image, description, partnerLogo, partnerName
   */
  show(badge: Badge) {
    // Ensure styles are injected
    this.injectStyles();

    // Prevent multiple dialogs
    if (this.isDialogOpen) {
      this.close();
    }

    // Remove existing dialog if any
    const existingDialog = document.querySelector('.foru-badge-dialog-overlay');
    if (existingDialog) {
      existingDialog.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'foru-badge-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'foru-badge-dialog';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'foru-badge-dialog-content-wrapper';
    
    const header = document.createElement('div');
    header.className = 'foru-badge-dialog-header';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'foru-badge-dialog-close';
    closeButton.innerHTML = '<img src="' + chrome.runtime.getURL('images/badge-dialog/close-icon.svg') + '" alt="Close">';
    closeButton.onclick = () => this.close();
    
    header.appendChild(closeButton);
    
    const content = document.createElement('div');
    content.className = 'foru-badge-dialog-content';
    
    // Badge image
    const badgeImage = document.createElement('img');
    badgeImage.className = 'foru-badge-dialog-badge-image';
    badgeImage.src = badge.image || chrome.runtime.getURL('images/badge_empty.png');
    badgeImage.alt = badge.name;
    badgeImage.onerror = function() {
      (this as HTMLImageElement).src = chrome.runtime.getURL('images/badge_empty.png');
    };
    
    // Badge title
    const title = document.createElement('h1');
    title.className = 'foru-badge-dialog-title';
    title.textContent = badge.name;
    
    // Badge description
    const description = document.createElement('p');
    description.className = 'foru-badge-dialog-description';
    description.textContent = badge.description || 'This badge represents your achievement and contribution to the community.';
    
    // Partner section
    const partner = document.createElement('div');
    partner.className = 'foru-badge-dialog-partner';
    
    const partnerText = document.createElement('span');
    partnerText.className = 'foru-badge-dialog-partner-text';
    partnerText.textContent = 'By';
    
    const partnerLogo = document.createElement('img');
    partnerLogo.className = 'foru-badge-dialog-partner-logo';
    partnerLogo.style.height = '16px'; // Same height as text
    partnerLogo.style.width = 'auto'; // Dynamic width based on image
    partnerLogo.style.borderRadius = '6px';
    partnerLogo.style.objectFit = 'contain';
    partnerLogo.style.display = 'block';
    partnerLogo.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    partnerLogo.style.padding = '2px 6px';
    partnerLogo.style.maxWidth = '80px'; // Prevent too wide logos
    
    // Check if partnerLogo exists and is not null/empty
    const logoUrl = badge.partnerLogo && badge.partnerLogo !== 'null' && badge.partnerLogo.trim() !== '' 
      ? badge.partnerLogo 
      : chrome.runtime.getURL('images/badge_empty.png');
    
    partnerLogo.src = logoUrl;
    partnerLogo.alt = 'Partner Logo';
    partnerLogo.onerror = function() {
      (this as HTMLImageElement).src = chrome.runtime.getURL('images/badge_empty.png');
    };
    
    partner.appendChild(partnerText);
    partner.appendChild(partnerLogo);
    
    content.appendChild(badgeImage);
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(partner);
    
    contentWrapper.appendChild(header);
    contentWrapper.appendChild(content);
    dialog.appendChild(contentWrapper);
    overlay.appendChild(dialog);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
    
    // Close on Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(overlay);
    this.isDialogOpen = true;
    
    console.log('Badge dialog opened for:', badge.name);
  }

  /**
   * Close the badge dialog
   */
  close() {
    const dialog = document.querySelector('.foru-badge-dialog-overlay');
    if (dialog) {
      dialog.remove();
      this.isDialogOpen = false;
    }
  }

  /**
   * Add click event listeners to badge items
   * @param {NodeList|Array} badgeItems - Collection of badge item elements
   */
  addEventListeners(badgeItems: NodeListOf<Element> | Element[]) {
    if (!badgeItems || badgeItems.length === 0) {
      console.log('No badge items found for event listeners');
      return;
    }
    
    badgeItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        const badgeData = item.getAttribute('data-badge');
        if (badgeData) {
          try {
            const badge = JSON.parse(badgeData);
            this.show(badge);
          } catch (error) {
            console.error('Error parsing badge data:', error);
          }
        } else {
          console.log('No badge data found');
        }
      });
      (item as HTMLElement).style.cursor = 'pointer';
    });
  }

  /**
   * Add event listeners to all badge items in a container
   * @param {string} containerSelector - CSS selector for the container
   */
  addEventListenersToContainer(containerSelector: string) {
    const container = document.querySelector(containerSelector);
    if (container) {
      const badgeItems = container.querySelectorAll('.badge-item.collected');
      this.addEventListeners(badgeItems);
    } else {
      console.log('Container not found:', containerSelector);
    }
  }

  /**
   * Add event listeners to all badge items on the page
   */
  addEventListenersToAll() {
    const badgeItems = document.querySelectorAll('.badge-item.collected');
    this.addEventListeners(badgeItems);
  }
}

// Create global instance
const badgeDialog = new BadgeDialog();

// Expose to global scope for use in other modules
(window as any).badgeDialog = badgeDialog;

console.log('[ForU Badge Dialog] Script loaded and initialized');

export default BadgeDialog;