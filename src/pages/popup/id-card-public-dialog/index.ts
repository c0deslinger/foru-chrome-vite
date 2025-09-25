// src/pages/popup/id-card-public-dialog/index.ts

import { drawProfileSection, UserProfileData, extractTwitterProfileData } from './profile/index.js';
import { drawDigitalDnaCard } from './digital-dna/index.js';
import { drawScoreBreakdownCard } from './score-breakdown/index.js';
import { drawCollectedBadgesCard } from './collected-badges/index.js';
import VanillaTilt from 'vanilla-tilt';

interface IdCardPublicData {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  generatedAt?: Date;
  userProfileData?: UserProfileData;
  identifiScore?: number;
  username?: string; // For public API calls
}

class IdCardPublicDialog {
  private dialog: HTMLElement | null = null;
  private isVisible = false;
  private tiltInstance: any = null;
  private currentUsername: string = '';

  constructor() {
    this.loadStyles();
  }

  private async loadStyles(): Promise<void> {
    try {
      const cssContent = await this.getCssContent();
      const style = document.createElement('style');
      style.textContent = cssContent;
      document.head.appendChild(style);
    } catch (error) {
      console.error('Error loading ID card public dialog styles:', error);
    }
  }

  private async getCssContent(): Promise<string> {
    try {
      const response = await fetch(chrome.runtime.getURL('src/pages/popup/id-card-public-dialog/index.css'));
      return await response.text();
    } catch (error) {
      console.error('Error fetching CSS content:', error);
      return '';
    }
  }

  private async loadHeaderImage(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('✅ Header image loaded successfully');
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.error('❌ Error loading header image:', error);
        resolve(null);
      };
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        if (!img.complete) {
          console.warn('⚠️ Header image loading timeout');
          resolve(null);
        }
      }, 5000);
      
      img.src = chrome.runtime.getURL('images/card_header_2.png');
    });
  }

  private async loadLogoImage(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('✅ Logo image loaded successfully');
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.error('❌ Error loading logo image:', error);
        resolve(null);
      };
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        if (!img.complete) {
          console.warn('⚠️ Logo image loading timeout');
          resolve(null);
        }
      }, 5000);
      
      img.src = chrome.runtime.getURL('images/foruaI_title_logo.png');
    });
  }

  public show(data: IdCardPublicData): void {
    if (this.isVisible) {
      this.hide();
    }

    // Store username for download filename
    this.currentUsername = data.username || 'user';
    
    this.createDialog();
    this.addEventListeners();
    this.generateIdCard(data);
    this.isVisible = true;
  }

  public hide(): void {
    // Clean up VanillaTilt instance
    if (this.tiltInstance) {
      this.tiltInstance.destroy();
      this.tiltInstance = null;
    }
    
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
    this.isVisible = false;
  }

  private createDialog(): void {
    // Remove existing dialog if any
    const existingDialog = document.querySelector('.foru-id-card-public-dialog-overlay');
    if (existingDialog) {
      existingDialog.remove();
    }

    this.dialog = document.createElement('div');
    this.dialog.className = 'foru-id-card-public-dialog-overlay';
    this.dialog.innerHTML = `
      <div class="foru-id-card-public-dialog">
        <div class="foru-id-card-public-dialog-content-wrapper">
          <div class="foru-id-card-public-dialog-header">
            <button class="foru-id-card-public-dialog-close" id="closeIdCardPublicDialog">
              <img src="${chrome.runtime.getURL('images/badge-dialog/close-icon.svg')}" alt="Close">
            </button>
          </div>
          <div class="foru-id-card-public-dialog-content">
            <br>
            
            <div class="foru-id-card-public-dialog-preview-container">
              <div class="foru-id-card-public-dialog-preview shimmer" id="idCardPublicPreview" data-tilt>
                <div class="foru-id-card-public-dialog-shimmer" id="idCardPublicShimmer">
                  <div class="shimmer-box"></div>
                  <div class="shimmer-text">Generating Card...</div>
                </div>
                <canvas id="idCardPublicCanvas" style="display: none;"></canvas>
              </div>
            </div>
            
            <div class="foru-id-card-public-dialog-actions">
              <button class="foru-id-card-public-dialog-download" id="downloadIdCardPublicImage" disabled>
                <span>Download Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.dialog);
    
    // Initialize VanillaTilt after dialog is created
    this.initializeVanillaTilt();
  }

  private initializeVanillaTilt(): void {
    try {
      const previewElement = this.dialog?.querySelector('#idCardPublicPreview') as HTMLElement;
      if (previewElement) {
        // Destroy existing instance if any
        if (this.tiltInstance) {
          this.tiltInstance.destroy();
          this.tiltInstance = null;
        }
        
        // Initialize new VanillaTilt instance
        this.tiltInstance = VanillaTilt.init(previewElement, {
          max: 15,
          speed: 400,
          glare: true,
          'max-glare': 0.3,
          scale: 1.05,
          perspective: 1000
        });
        console.log('✅ VanillaTilt initialized successfully');
      } else {
        console.warn('⚠️ Preview element not found, using fallback CSS effects');
        this.addFallbackTiltEffect();
      }
    } catch (error) {
      console.error('❌ Error initializing VanillaTilt:', error);
      this.addFallbackTiltEffect();
    }
  }


  private startCornerTiltAnimation(): void {
    const previewElement = this.dialog?.querySelector('#idCardPublicPreview') as HTMLElement;
    if (!previewElement) return;

    // Temporarily disable VanillaTilt during animation
    if (this.tiltInstance) {
      this.tiltInstance.destroy();
      this.tiltInstance = null;
    }

    // Set up animation styles for smooth continuous movement
    previewElement.style.transition = 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)';
    previewElement.style.transformStyle = 'preserve-3d';

    // Define corner positions for smooth movement
    const corners = [
      { name: 'top-right', rotateX: -12, rotateY: 12 },
      { name: 'top-left', rotateX: -12, rotateY: -12 },
      { name: 'bottom-left', rotateX: 12, rotateY: -12 },
      { name: 'bottom-right', rotateX: 12, rotateY: 12 },
      { name: 'center', rotateX: 0, rotateY: 0 }
    ];

    // Start from center
    previewElement.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';

    // Animate smoothly through each corner
    let currentIndex = 0;
    
    const animateToNextCorner = () => {
      if (currentIndex < corners.length) {
        const corner = corners[currentIndex];
        previewElement.style.transform = `perspective(1000px) rotateX(${corner.rotateX}deg) rotateY(${corner.rotateY}deg) scale(1.05)`;
        console.log(`🎬 Moving to: ${corner.name}`);
        
        currentIndex++;
        
        // Continue to next corner after animation duration
        setTimeout(animateToNextCorner, 800);
      } else {
        // Animation completed, return to normal state
        previewElement.style.transition = 'transform 0.1s ease';
        
        // Re-enable VanillaTilt after animation completes
        setTimeout(() => {
          this.initializeVanillaTilt();
          console.log('✅ Smooth corner animation completed, VanillaTilt re-enabled');
        }, 100);
      }
    };

    // Start the smooth animation sequence
    setTimeout(animateToNextCorner, 200);
  }

  private addFallbackTiltEffect(): void {
    const previewElement = this.dialog?.querySelector('#idCardPublicPreview') as HTMLElement;
    if (!previewElement) return;

    // Add CSS-only tilt effect as fallback
    previewElement.style.transition = 'transform 0.1s ease';
    previewElement.addEventListener('mousemove', (e) => {
      const rect = previewElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      previewElement.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    previewElement.addEventListener('mouseleave', () => {
      previewElement.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    });

    console.log('✅ Fallback tilt effect added');
  }

  private addEventListeners(): void {
    if (!this.dialog) return;

    // Close button
    const closeBtn = this.dialog.querySelector('#closeIdCardPublicDialog');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Close on overlay click
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.hide();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Download button
    const downloadBtn = this.dialog.querySelector('#downloadIdCardPublicImage');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadImage());
    }
  }

  private async generateIdCard(data: IdCardPublicData): Promise<void> {
    const canvas = this.dialog?.querySelector('#idCardPublicCanvas') as HTMLCanvasElement;
    const preview = this.dialog?.querySelector('#idCardPublicPreview') as HTMLElement;
    const shimmer = this.dialog?.querySelector('#idCardPublicShimmer') as HTMLElement;
    const downloadBtn = this.dialog?.querySelector('#downloadIdCardPublicImage') as HTMLButtonElement;

    if (!canvas || !preview || !shimmer || !downloadBtn) return;

    try {
      // Set canvas size - increased for larger generated image
      const cardWidth = 1200; // 50% larger than original 800px
      const cardHeight = 675; // 50% larger than original 450px (maintaining 16:9 ratio)
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      
      // Scale factor for proportional scaling of all elements
      const scaleFactor = cardWidth / 800; // 1.5x scale factor

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, cardWidth, cardHeight);

      // Background
      ctx.fillStyle = '#1a1625';
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Header section - scaled proportionally
      const headerHeight = 80 * scaleFactor; // Scale header height
      
      // Load and draw header background image
      try {
        const headerImage = await this.loadHeaderImage();
        if (headerImage) {
          // Draw header background image
          ctx.drawImage(headerImage, 0, 0, cardWidth, headerHeight);
          console.log('✅ Header background image loaded successfully');
        } else {
          // Fallback to gradient if image fails to load
          const headerGradient = ctx.createLinearGradient(0, 0, cardWidth, 0);
          headerGradient.addColorStop(0, '#7246ce');
          headerGradient.addColorStop(1, '#9c4dcc');
          ctx.fillStyle = headerGradient;
          ctx.fillRect(0, 0, cardWidth, headerHeight);
          console.log('⚠️ Header image failed to load, using gradient fallback');
        }
      } catch (error) {
        // Fallback to gradient if image loading fails
        const headerGradient = ctx.createLinearGradient(0, 0, cardWidth, 0);
        headerGradient.addColorStop(0, '#7246ce');
        headerGradient.addColorStop(1, '#9c4dcc');
        ctx.fillStyle = headerGradient;
        ctx.fillRect(0, 0, cardWidth, headerHeight);
        console.error('❌ Error loading header image, using gradient fallback:', error);
      }

      // Load and draw logo image - centered vertically and horizontally
      try {
        const logoImage = await this.loadLogoImage();
        if (logoImage) {
          // Calculate logo dimensions to fit nicely in header
          const logoMaxWidth = cardWidth * 0.6; // 60% of card width
          const logoMaxHeight = headerHeight * 0.6; // 60% of header height
          
          // Calculate aspect ratio to maintain logo proportions
          const logoAspectRatio = logoImage.width / logoImage.height;
          let logoWidth = logoMaxWidth;
          let logoHeight = logoWidth / logoAspectRatio;
          
          // If height exceeds max height, scale down by height
          if (logoHeight > logoMaxHeight) {
            logoHeight = logoMaxHeight;
            logoWidth = logoHeight * logoAspectRatio;
          }
          
          // Center the logo in the header
          const logoX = (cardWidth - logoWidth) / 2;
          const logoY = (headerHeight - logoHeight) / 2;
          
          // Draw the logo
          ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
          console.log('✅ Logo drawn successfully');
        } else {
          // Fallback to text if logo fails to load
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${24 * scaleFactor}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ForU ID Card', cardWidth / 2, headerHeight / 2 - (8 * scaleFactor));

          ctx.font = `${14 * scaleFactor}px Arial`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText('Digital Identity', cardWidth / 2, headerHeight / 2 + (12 * scaleFactor));
          console.log('⚠️ Logo failed to load, using text fallback');
        }
      } catch (error) {
        // Fallback to text if logo loading fails
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${24 * scaleFactor}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ForU ID Card', cardWidth / 2, headerHeight / 2 - (8 * scaleFactor));

        ctx.font = `${14 * scaleFactor}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('Digital Identity', cardWidth / 2, headerHeight / 2 + (12 * scaleFactor));
        console.error('❌ Error loading logo, using text fallback:', error);
      }

      // Main content area - scaled proportionally
      const contentY = headerHeight + (20 * scaleFactor);
      const contentHeight = cardHeight - headerHeight - (40 * scaleFactor);
      const columnSpacing = 20 * scaleFactor; // Reduced spacing between columns
      const columnWidth = (cardWidth - (40 * scaleFactor) - columnSpacing) / 2; // Two columns with reduced spacing

      // Column 1: Profile + IdentiFi Score Breakdown - scaled heights
      const profileHeight = 120 * scaleFactor;
      const scoreHeight = contentHeight - profileHeight - (20 * scaleFactor);

      // Extract Twitter profile data in real-time
      const twitterProfileData = extractTwitterProfileData();
      await drawProfileSection(ctx, 20 * scaleFactor, contentY, columnWidth, profileHeight, twitterProfileData, data.identifiScore, scaleFactor);
      await drawScoreBreakdownCard(ctx, 20 * scaleFactor, contentY + profileHeight + (20 * scaleFactor), columnWidth, scoreHeight, data.username, scaleFactor);

      // Column 2: Digital DNA + Collected Badges - scaled heights
      const dnaHeight = (contentHeight - (20 * scaleFactor)) / 2;
      const badgesHeight = (contentHeight - (20 * scaleFactor)) / 2;

      await drawDigitalDnaCard(ctx, (20 * scaleFactor) + columnWidth + columnSpacing, contentY, columnWidth, dnaHeight, data.username, scaleFactor);
      await drawCollectedBadgesCard(ctx, (20 * scaleFactor) + columnWidth + columnSpacing, contentY + dnaHeight + (20 * scaleFactor), columnWidth, badgesHeight, data.username, scaleFactor);

      // Convert canvas to image
      const imageDataUrl = canvas.toDataURL('image/png');
      
      // Update preview
      preview.classList.remove('shimmer');
      shimmer.style.display = 'none';
      canvas.style.display = 'block';
      
      // Re-initialize VanillaTilt after generation
      this.initializeVanillaTilt();
      
      // Start corner tilt animation sequence
      this.startCornerTiltAnimation();
      
      // Enable download button
      downloadBtn.disabled = false;
      downloadBtn.dataset.imageData = imageDataUrl;

      console.log('✅ ID Card generated successfully');

    } catch (error) {
      console.error('❌ Error generating card:', error);
      
      // Show error state
      preview.classList.remove('shimmer');
      shimmer.innerHTML = '<div class="foru-id-card-public-dialog-placeholder"><div class="foru-id-card-public-dialog-placeholder-text">Error generating card</div></div>';
    }
  }

  private downloadImage(): void {
    const downloadBtn = this.dialog?.querySelector('#downloadIdCardPublicImage') as HTMLButtonElement;
    if (!downloadBtn || !downloadBtn.dataset.imageData) return;

    const imageData = downloadBtn.dataset.imageData;
    const link = document.createElement('a');
    
    // Create filename using username: username_card.jpg
    const filename = `${this.currentUsername}_card.jpg`;
    link.download = filename;
    link.href = imageData;
    link.click();
    
    console.log(`✅ Downloading ID card as: ${filename}`);
  }
}

export const idCardPublicDialog = new IdCardPublicDialog();

declare global {
  interface Window {
    idCardPublicDialog: IdCardPublicDialog;
  }
}

window.idCardPublicDialog = idCardPublicDialog;
