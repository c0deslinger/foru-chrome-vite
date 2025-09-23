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

      // Create ID card image with grid layout
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d')!;

      // Dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add title
      ctx.fillStyle = '#ececf1';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('ForU ID Card', 40, 40);

      // Grid layout: 2x2
      const gridWidth = canvas.width - 80;
      const gridHeight = canvas.height - 100;
      const cardWidth = (gridWidth - 20) / 2;
      const cardHeight = (gridHeight - 20) / 2;

      // Position calculations
      const startX = 40;
      const startY = 70;

      // 1. IdentiFi Score Breakdown (Top Left)
      this.drawScoreBreakdownCard(ctx, startX, startY, cardWidth, cardHeight);

      // 2. Your Digital DNA (Top Right)
      this.drawDigitalDnaCard(ctx, startX + cardWidth + 20, startY, cardWidth, cardHeight);

      // 3. Your Collected Badges (Bottom Left)
      this.drawCollectedBadgesCard(ctx, startX, startY + cardHeight + 20, cardWidth, cardHeight);

      // 4. Empty slot (Bottom Right) - for future use
      this.drawEmptyCard(ctx, startX + cardWidth + 20, startY + cardHeight + 20, cardWidth, cardHeight);

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
   * Draw IdentiFi Score Breakdown card
   */
  private drawScoreBreakdownCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Card background
    ctx.fillStyle = '#1f1b2b';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#2a2535';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = '#ececf1';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('IdentiFi Score Breakdown', x + 12, y + 20);

    // Score grid (2x2)
    const scoreWidth = (width - 36) / 2;
    const scoreHeight = (height - 50) / 2;
    const scoreStartX = x + 12;
    const scoreStartY = y + 30;

    // Social
    this.drawScoreCard(ctx, scoreStartX, scoreStartY, scoreWidth, scoreHeight, 'Social', '207', '177 followers & 30 impressions');
    
    // Reputation
    this.drawScoreCard(ctx, scoreStartX + scoreWidth + 12, scoreStartY, scoreWidth, scoreHeight, 'Reputation', '173', '0 avg likes, 0 avg replies, 173 avg retweets');
    
    // On Chain
    this.drawScoreCard(ctx, scoreStartX, scoreStartY + scoreHeight + 12, scoreWidth, scoreHeight, 'On Chain', '2', '0 badges minted, 3 quests solved, 0 referrals');
    
    // Governance
    this.drawScoreCard(ctx, scoreStartX + scoreWidth + 12, scoreStartY + scoreHeight + 12, scoreWidth, scoreHeight, 'Governance', '-', 'Coming soon');
  }

  /**
   * Draw individual score card
   */
  private drawScoreCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, value: string, details: string): void {
    // Card background
    ctx.fillStyle = '#2a2535';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#3a3545';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = '#aeb0b6';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), x + width/2, y + 12);

    // Value
    ctx.fillStyle = '#ececf1';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(value, x + width/2, y + 32);

    // Details
    ctx.fillStyle = '#aeb0b6';
    ctx.font = '8px Arial';
    const words = details.split(' ');
    let line = '';
    let lineY = y + 45;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 8 && i > 0) {
        ctx.fillText(line, x + width/2, lineY);
        line = words[i] + ' ';
        lineY += 10;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x + width/2, lineY);
  }

  /**
   * Draw Digital DNA card
   */
  private drawDigitalDnaCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Card background
    ctx.fillStyle = '#1f1b2b';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#2a2535';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = '#ececf1';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Your Digital DNA', x + 12, y + 20);

    // DNA items (2x2 grid)
    const itemWidth = (width - 36) / 2;
    const itemHeight = (height - 50) / 2;
    const itemStartX = x + 12;
    const itemStartY = y + 30;

    // Somnia Ecosystem
    this.drawDnaItem(ctx, itemStartX, itemStartY, itemWidth, itemHeight, 'Somnia Ecosystem', '35%', '#00d4aa');
    
    // Software Development
    this.drawDnaItem(ctx, itemStartX + itemWidth + 12, itemStartY, itemWidth, itemHeight, 'Software Development', '20%', '#ff8800');
    
    // Emerging Tech & AI
    this.drawDnaItem(ctx, itemStartX, itemStartY + itemHeight + 12, itemWidth, itemHeight, 'Emerging Tech & AI', '15%', '#0066ff');
    
    // Web3 Information & Rewards
    this.drawDnaItem(ctx, itemStartX + itemWidth + 12, itemStartY + itemHeight + 12, itemWidth, itemHeight, 'Web3 Information & Rewards', '10%', '#9c4dcc');
  }

  /**
   * Draw individual DNA item
   */
  private drawDnaItem(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, title: string, percentage: string, color: string): void {
    // Item background
    ctx.fillStyle = '#2a2535';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#3a3545';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Icon placeholder (simple circle)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Title
    ctx.fillStyle = '#ececf1';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 30, y + 12);

    // Progress bar background
    ctx.fillStyle = '#3a3545';
    ctx.fillRect(x + 8, y + 20, width - 16, 4);

    // Progress bar fill
    const progress = parseInt(percentage) / 100;
    ctx.fillStyle = color;
    ctx.fillRect(x + 8, y + 20, (width - 16) * progress, 4);

    // Percentage
    ctx.fillStyle = '#aeb0b6';
    ctx.font = '8px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(percentage, x + width - 8, y + 18);
  }

  /**
   * Draw Collected Badges card
   */
  private drawCollectedBadgesCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Card background
    ctx.fillStyle = '#1f1b2b';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#2a2535';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = '#ececf1';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Your Collected Badges', x + 12, y + 20);

    // Badge grid (3x2)
    const badgeSize = 32;
    const badgeSpacing = 8;
    const badgeStartX = x + 12;
    const badgeStartY = y + 30;
    const badgesPerRow = 3;

    // Draw 6 badges (3 collected, 3 empty)
    for (let i = 0; i < 6; i++) {
      const badgeX = badgeStartX + (i % badgesPerRow) * (badgeSize + badgeSpacing);
      const badgeY = badgeStartY + Math.floor(i / badgesPerRow) * (badgeSize + badgeSpacing);

      if (i < 3) {
        // Collected badges with shimmer effect
        this.drawBadgeWithShimmer(ctx, badgeX, badgeY, badgeSize, i);
      } else {
        // Empty badges
        this.drawEmptyBadge(ctx, badgeX, badgeY, badgeSize);
      }
    }
  }

  /**
   * Draw badge with shimmer effect
   */
  private drawBadgeWithShimmer(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, index: number): void {
    // Badge background with gradient
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    const colors = ['#7246ce', '#9c4dcc', '#ff8800', '#00d4aa'];
    gradient.addColorStop(0, colors[index % colors.length]);
    gradient.addColorStop(1, colors[(index + 1) % colors.length]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    
    // Badge border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);

    // Shimmer effect (simple diagonal line)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y + size);
    ctx.stroke();

    // Badge icon (simple geometric shape)
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', x + size/2, y + size/2 + 4);
  }

  /**
   * Draw empty badge
   */
  private drawEmptyBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    // Empty badge background
    ctx.fillStyle = '#2a2535';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#3a3545';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);

    // Empty badge icon
    ctx.strokeStyle = '#aeb0b6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + size - 8, y + size - 8);
    ctx.moveTo(x + size - 8, y + 8);
    ctx.lineTo(x + 8, y + size - 8);
    ctx.stroke();
  }

  /**
   * Draw empty card (for future use)
   */
  private drawEmptyCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Card background
    ctx.fillStyle = '#1f1b2b';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#2a2535';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Coming soon text
    ctx.fillStyle = '#aeb0b6';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Coming Soon', x + width/2, y + height/2);
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
