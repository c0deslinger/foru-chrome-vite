// src/pages/popup/id-card-public-dialog/index.ts

import { UserProfileData, extractTwitterProfileData } from './profile-layer/index.js';
import { drawBackgroundLayer } from './background-layer/index.js';
import { drawProfileLayer, loadCustomFonts } from './profile-layer/index.js';
import { drawBadgeDnaLayer } from './badge-dna-layer/index.js';
import { drawOverlayLayer } from './overlay-layer/index.js';
import { loadAntonFont, drawScoresLayer } from './scores-layer/index.js';
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
    loadAntonFont(); // Load Anton font from scores-layer
    loadCustomFonts(); // Load Plus Jakarta Sans and Zalando Sans fonts
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
      // Set canvas size - 1080x1920 portrait
      const cardWidth = 1080;
      const cardHeight = 1920;
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, cardWidth, cardHeight);

      // Layer 1: Draw background
      await drawBackgroundLayer(ctx, cardWidth, cardHeight);

      // Layer 2: Draw profile picture (88, 323, 903x1063, radius 32)
      await drawProfileLayer(ctx, 88, 323, 903, 1063, 32, data);

      // Layer 2.5: Draw badge-dna layer (between profile and overlay)
      await drawBadgeDnaLayer(ctx, data);

      // Layer 3: Draw card overlay (0, 1207)
      await drawOverlayLayer(ctx, 0, 1207);

      // Layer 4: Draw scores on top
      await drawScoresLayer(ctx, cardWidth, data);

      console.log('✅ All layers rendered successfully');

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
