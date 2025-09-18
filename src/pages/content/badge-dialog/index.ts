// src/pages/content/badge-dialog/index.ts

/**
 * BadgeDialog - Shared class for displaying badge popup dialogs
 * Can be used by score_credibility.ts, profile.ts, and badges.ts
 * 
 * This file contains JavaScript functionality only
 */

interface Badge {
  name: string;
  image: string;
  description?: string;
  partnerLogo?: string;
  partnerName?: string;
}

/**
 * BadgeDialog Class
 */
class BadgeDialog {
  private isDialogOpen = false;
  private isStylesInjected = false;

  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles into document head
   */
  async injectStyles() {
    if (this.isStylesInjected) {
      return;
    }

    // Check if styles already exist
    const existingStyle = document.querySelector('#foru-badge-dialog-styles');
    if (existingStyle) {
      this.isStylesInjected = true;
      return;
    }

    // Load CSS content
    const cssResponse = await fetch(chrome.runtime.getURL('src/pages/content/badge-dialog/index.css'));
    const cssContent = await cssResponse.text();

    const styleElement = document.createElement('style');
    styleElement.id = 'foru-badge-dialog-styles';
    styleElement.textContent = cssContent;
    document.head.appendChild(styleElement);
    this.isStylesInjected = true;
    
    console.log('Badge dialog styles injected');
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
    badgeImage.src = badge.image;
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

export default BadgeDialog;
