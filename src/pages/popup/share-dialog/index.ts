/**
 * ShareDialog - Shared class for displaying share profile dialogs
 * Can be used by user tab and other components
 * 
 * This file contains JavaScript functionality only
 */

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
  referral?: {
    used?: boolean;
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
 * ShareDialog class for managing share profile dialogs
 */
class ShareDialog {
  private currentOverlay: HTMLElement | null = null;

  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles into the page
   */
  async injectStyles() {
    if (!document.getElementById('foru-share-dialog-styles')) {
      // Load CSS content
      const cssResponse = await fetch(chrome.runtime.getURL('src/pages/popup/share-dialog/index.css'));
      const cssContent = await cssResponse.text();

      const style = document.createElement('style');
      style.id = 'foru-share-dialog-styles';
      style.textContent = cssContent;
      document.head.appendChild(style);
    }
  }

  /**
   * Create and inject the dialog overlay into the page
   */
  private createOverlay(): HTMLElement {
    // Remove existing overlay if any
    this.removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'foru-share-dialog-overlay';
    overlay.className = 'foru-share-dialog-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="foru-share-dialog">
        <div class="foru-share-dialog-content-wrapper">
          <div class="foru-share-dialog-header">
            <button id="foru-share-dialog-close" class="foru-share-dialog-close">
              <img src="${chrome.runtime.getURL('images/badge-dialog/close-icon.svg')}" alt="Close">
            </button>
          </div>
          <div class="foru-share-dialog-content">
            <h1 class="foru-share-dialog-title">Share Your Profile</h1>
            
            <div id="foru-share-image-loading" class="foru-share-image-loading">
              <div class="foru-share-loading-spinner"></div>
              <p>Generating your profile image...</p>
            </div>
            
            <div id="foru-share-image-container" class="foru-share-image-container">
              <!-- Generated image will be inserted here -->
            </div>
            
            <div class="foru-share-dialog-actions">
              <button id="foru-share-download-image" class="foru-share-download-button" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Image
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.currentOverlay = overlay;
    this.setupEventListeners();
    return overlay;
  }

  /**
   * Setup event listeners for the dialog
   */
  private setupEventListeners(): void {
    if (!this.currentOverlay) return;

    const closeBtn = this.currentOverlay.querySelector('#foru-share-dialog-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Close dialog when clicking overlay
    this.currentOverlay.addEventListener('click', (e) => {
      if (e.target === this.currentOverlay) {
        this.hide();
      }
    });

    // Close dialog with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentOverlay?.style.display === 'flex') {
        this.hide();
      }
    });
  }

  /**
   * Show the share dialog
   */
  show(): void {
    if (!this.currentOverlay) {
      this.createOverlay();
    }
    if (this.currentOverlay) {
      this.currentOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide the share dialog
   */
  hide(): void {
    if (this.currentOverlay) {
      this.currentOverlay.style.display = 'none';
      // Clear the image container
      const container = this.currentOverlay.querySelector('#foru-share-image-container');
      if (container) {
        container.innerHTML = '';
      }
    }
  }

  /**
   * Remove the overlay from the DOM
   */
  removeOverlay(): void {
    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    if (!this.currentOverlay) return;
    
    const loadingEl = this.currentOverlay.querySelector('#foru-share-image-loading') as HTMLElement;
    if (loadingEl) {
      loadingEl.style.display = loading ? 'flex' : 'none';
    }
  }

  /**
   * Set download button enabled state
   */
  setDownloadEnabled(enabled: boolean): void {
    if (!this.currentOverlay) return;
    
    const downloadBtn = this.currentOverlay.querySelector('#foru-share-download-image') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.disabled = !enabled;
    }
  }

  /**
   * Set download button click handler
   */
  setDownloadHandler(handler: () => void): void {
    if (!this.currentOverlay) return;
    
    const downloadBtn = this.currentOverlay.querySelector('#foru-share-download-image');
    if (downloadBtn) {
      // Remove existing listeners
      downloadBtn.replaceWith(downloadBtn.cloneNode(true));
      const newDownloadBtn = this.currentOverlay.querySelector('#foru-share-download-image');
      if (newDownloadBtn) {
        newDownloadBtn.addEventListener('click', handler);
      }
    }
  }

  /**
   * Display the generated image
   */
  displayImage(imageDataUrl: string): void {
    if (!this.currentOverlay) return;
    
    const container = this.currentOverlay.querySelector('#foru-share-image-container') as HTMLElement;
    if (container) {
      container.innerHTML = '';
      const img = document.createElement('img');
      img.src = imageDataUrl;
      img.className = 'foru-share-image-canvas';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '16px';
      img.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
      container.appendChild(img);
    }
  }
}

// Create global instance
const shareDialog = new ShareDialog();
(window as any).shareDialog = shareDialog;

// Export functions for backward compatibility
export function setupShareDialog(): void {
  // No-op, handled by class
}

export function showShareDialog(): void {
  shareDialog.show();
}

export function hideShareDialog(): void {
  shareDialog.hide();
}

export function setShareImageLoading(loading: boolean): void {
  shareDialog.setLoading(loading);
}

export function setDownloadButtonEnabled(enabled: boolean): void {
  shareDialog.setDownloadEnabled(enabled);
}

export function setDownloadButtonHandler(handler: () => void): void {
  shareDialog.setDownloadHandler(handler);
}

export function displayShareImage(imageDataUrl: string): void {
  shareDialog.displayImage(imageDataUrl);
}

// Export the class for direct use
export { ShareDialog };

console.log('ShareDialog loaded and ready');
