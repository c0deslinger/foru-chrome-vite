// src/pages/popup/id-card-public-dialog/background-layer/index.ts

/**
 * Background Layer - Layer 1
 * Handles loading and drawing the main background image (card_layer_1.png)
 */

export async function loadBackgroundImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Background image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading background image:', error);
      resolve(null);
    };
    
    // Set timeout to prevent hanging
    setTimeout(() => {
      if (!img.complete) {
        console.warn('⚠️ Background image loading timeout');
        resolve(null);
      }
    }, 5000);
    
    img.src = chrome.runtime.getURL('images/card/card_layer_1.png');
  });
}

export async function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D, 
  cardWidth: number, 
  cardHeight: number
): Promise<void> {
  try {
    const backgroundImage = await loadBackgroundImage();
    if (backgroundImage) {
      // Draw background image to fill the entire card
      ctx.drawImage(backgroundImage, 0, 0, cardWidth, cardHeight);
      console.log('✅ Background layer drawn successfully');
    } else {
      // Fallback to solid color if image fails to load
      ctx.fillStyle = '#1a1625';
      ctx.fillRect(0, 0, cardWidth, cardHeight);
      console.log('⚠️ Background image failed to load, using solid color fallback');
    }
  } catch (error) {
    // Fallback to solid color if image loading fails
    ctx.fillStyle = '#1a1625';
    ctx.fillRect(0, 0, cardWidth, cardHeight);
    console.log('❌ Background image loading error:', error);
  }
}
