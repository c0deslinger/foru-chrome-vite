// src/pages/popup/id-card-public-dialog/overlay-layer/index.ts

/**
 * Overlay Layer - Layer 3
 * Handles loading and drawing the card overlay image (card_layer_2.png)
 */

export async function loadCardLayer2Image(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Card layer 2 image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading card layer 2 image:', error);
      resolve(null);
    };
    
    // Set timeout to prevent hanging
    setTimeout(() => {
      if (!img.complete) {
        console.warn('⚠️ Card layer 2 image loading timeout');
        resolve(null);
      }
    }, 5000);
    
    img.src = chrome.runtime.getURL('images/card/card_layer_2.png');
  });
}

export async function drawOverlayLayer(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number
): Promise<void> {
  try {
    const layer2Image = await loadCardLayer2Image();
    if (layer2Image) {
      // Draw card layer 2 at specified position with original dimensions
      ctx.drawImage(layer2Image, x, y);
      console.log(`✅ Overlay layer drawn at position (${x}, ${y}) with original dimensions`);
    } else {
      console.log('⚠️ Card layer 2 image failed to load, skipping overlay');
    }
  } catch (error) {
    console.error('❌ Error drawing overlay layer:', error);
  }
}
