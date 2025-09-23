// src/pages/popup/id-card-dialog/index.ts

interface IdCardData {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  generatedAt?: Date;
}

class IdCardDialog {
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private isVisible = false;

  constructor() {
    this.loadStyles();
  }

  /**
   * Load CSS styles for the dialog
   */
  private loadStyles(): void {
    // Check if styles are already loaded
    if (document.getElementById('foru-id-card-dialog-styles')) {
      return;
    }

    // Create style element
    const style = document.createElement('style');
    style.id = 'foru-id-card-dialog-styles';
    
    // Load CSS content (in a real implementation, you'd load from the CSS file)
    style.textContent = this.getCssContent();
    document.head.appendChild(style);
  }

  /**
   * Get CSS content (in a real implementation, this would be loaded from the CSS file)
   */
  private getCssContent(): string {
    return `
      /* ID Card Dialog Styles */
      .foru-id-card-dialog-overlay {
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

      .foru-id-card-dialog {
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

      .foru-id-card-dialog-content-wrapper {
        background: #ffffff;
        border-radius: 22px;
        padding: 32px;
        width: 100%;
        height: 100%;
        position: relative;
      }

      .foru-id-card-dialog-header {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 24px;
        position: relative;
      }

      .foru-id-card-dialog-close {
        background: #7246ce;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        position: absolute;
        right: 0;
        top: 0;
      }

      .foru-id-card-dialog-close:hover {
        background: #5a3ba8;
        transform: scale(1.05);
      }

      .foru-id-card-dialog-close img {
        width: 16px;
        height: 16px;
        filter: brightness(0) invert(1);
      }

      .foru-id-card-dialog-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .foru-id-card-dialog-title {
        font-size: 28px;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0 0 8px 0;
        line-height: 1.2;
      }

      .foru-id-card-dialog-subtitle {
        font-size: 16px;
        font-weight: 500;
        color: #666666;
        margin: 0 0 32px 0;
        line-height: 1.4;
      }

      .foru-id-card-preview-container {
        width: 100%;
        max-width: 500px;
        margin-bottom: 32px;
      }

      .foru-id-card-preview {
        width: 100%;
        aspect-ratio: 16/9;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 16px;
        border: 2px solid #e1e5e9;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }

      .foru-id-card-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 14px;
      }

      .foru-id-card-preview.shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .foru-id-card-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999999;
        text-align: center;
      }

      .foru-id-card-placeholder-icon {
        margin-bottom: 16px;
        opacity: 0.6;
      }

      .foru-id-card-placeholder-icon svg {
        color: #999999;
      }

      .foru-id-card-placeholder-text {
        font-size: 16px;
        font-weight: 500;
        color: #999999;
      }

      .foru-id-card-dialog-actions {
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .foru-id-card-download-btn {
        background: linear-gradient(135deg, #7246ce 0%, #9c4dcc 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 16px 32px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(114, 70, 206, 0.3);
        min-width: 200px;
        justify-content: center;
      }

      .foru-id-card-download-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(114, 70, 206, 0.4);
        background: linear-gradient(135deg, #5a3ba8 0%, #7c3a9c 100%);
      }

      .foru-id-card-download-btn:disabled {
        background: #e0e0e0;
        color: #999999;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }

      .foru-id-card-download-btn svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
      }

      @media (max-width: 768px) {
        .foru-id-card-dialog {
          width: 95%;
          padding: 16px;
          max-width: none;
        }
        
        .foru-id-card-dialog-content-wrapper {
          padding: 24px;
        }
        
        .foru-id-card-dialog-title {
          font-size: 24px;
        }
        
        .foru-id-card-dialog-subtitle {
          font-size: 14px;
        }
        
        .foru-id-card-download-btn {
          padding: 14px 24px;
          font-size: 14px;
          min-width: 180px;
        }
      }
    `;
  }

  /**
   * Show the ID card dialog
   */
  show(data: IdCardData = {}): void {
    if (this.isVisible) {
      this.hide();
    }

    this.createDialog(data);
    this.isVisible = true;
    
    // Add to DOM
    document.body.appendChild(this.overlay!);
    
    // Add event listeners
    this.addEventListeners();
    
    // Start generating ID card
    this.generateIdCard(data);
  }

  /**
   * Hide the dialog
   */
  hide(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.isVisible = false;
  }

  /**
   * Create the dialog HTML structure
   */
  private createDialog(data: IdCardData): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'foru-id-card-dialog-overlay';
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'foru-id-card-dialog';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'foru-id-card-dialog-content-wrapper';
    
    // Header
    const header = document.createElement('div');
    header.className = 'foru-id-card-dialog-header';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'foru-id-card-dialog-close';
    closeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    header.appendChild(closeButton);
    
    // Content
    const content = document.createElement('div');
    content.className = 'foru-id-card-dialog-content';
    
    // Title
    const title = document.createElement('h1');
    title.className = 'foru-id-card-dialog-title';
    title.textContent = data.title || 'Your ID Card';
    
    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'foru-id-card-dialog-subtitle';
    subtitle.textContent = data.subtitle || 'Image Generated';
    
    // Preview Container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'foru-id-card-preview-container';
    
    const preview = document.createElement('div');
    preview.className = 'foru-id-card-preview shimmer';
    
    const placeholder = document.createElement('div');
    placeholder.className = 'foru-id-card-placeholder';
    placeholder.innerHTML = `
      <div class="foru-id-card-placeholder-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H20C21.1 4 22 4.9 22 6V18C21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="foru-id-card-placeholder-text">Generating your ID card...</div>
    `;
    
    preview.appendChild(placeholder);
    previewContainer.appendChild(preview);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'foru-id-card-dialog-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'foru-id-card-download-btn';
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Download Image
    `;
    
    actions.appendChild(downloadBtn);
    
    // Assemble content
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(previewContainer);
    content.appendChild(actions);
    
    contentWrapper.appendChild(header);
    contentWrapper.appendChild(content);
    this.dialog.appendChild(contentWrapper);
    this.overlay.appendChild(this.dialog);
  }

  /**
   * Add event listeners
   */
  private addEventListeners(): void {
    if (!this.overlay) return;

    // Close button
    const closeBtn = this.overlay.querySelector('.foru-id-card-dialog-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Overlay click to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Escape key to close
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // Download button
    const downloadBtn = this.overlay.querySelector('.foru-id-card-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadImage());
    }
  }

  /**
   * Generate ID card (simulate API call)
   */
  private async generateIdCard(data: IdCardData): Promise<void> {
    if (!this.overlay) return;

    const preview = this.overlay.querySelector('.foru-id-card-preview') as HTMLElement;
    const downloadBtn = this.overlay.querySelector('.foru-id-card-download-btn') as HTMLButtonElement;

    try {
      // Simulate generation time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a sample ID card image (in real implementation, this would be from API)
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d')!;

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#7246ce');
      gradient.addColorStop(1, '#9c4dcc');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ForU ID Card', canvas.width / 2, canvas.height / 2 - 50);
      
      ctx.font = '24px Arial';
      ctx.fillText('Your Digital Identity', canvas.width / 2, canvas.height / 2 + 20);
      
      ctx.font = '16px Arial';
      ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, canvas.width / 2, canvas.height / 2 + 60);

      // Convert to image
      const imageUrl = canvas.toDataURL('image/png');

      // Update preview
      preview.innerHTML = `<img src="${imageUrl}" alt="ID Card" />`;
      preview.classList.remove('shimmer');

      // Enable download button
      downloadBtn.disabled = false;
      downloadBtn.setAttribute('data-image-url', imageUrl);

      console.log('ID card generated successfully');
    } catch (error) {
      console.error('Error generating ID card:', error);
      
      // Show error state
      const placeholder = preview.querySelector('.foru-id-card-placeholder-text');
      if (placeholder) {
        placeholder.textContent = 'Failed to generate ID card. Please try again.';
      }
    }
  }

  /**
   * Download the generated image
   */
  private downloadImage(): void {
    if (!this.overlay) return;

    const downloadBtn = this.overlay.querySelector('.foru-id-card-download-btn') as HTMLButtonElement;
    const imageUrl = downloadBtn.getAttribute('data-image-url');

    if (!imageUrl) {
      console.error('No image URL found for download');
      return;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `foru-id-card-${new Date().toISOString().split('T')[0]}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('ID card downloaded successfully');
    } catch (error) {
      console.error('Error downloading ID card:', error);
    }
  }
}

// Create singleton instance
const idCardDialog = new IdCardDialog();

// Export for use in other components
export { IdCardDialog, idCardDialog };
export default idCardDialog;

// Expose globally for backward compatibility
(window as any).idCardDialog = idCardDialog;
