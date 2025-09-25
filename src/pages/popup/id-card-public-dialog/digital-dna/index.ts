// src/pages/popup/id-card-public-dialog/digital-dna/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface DnaData {
  id: string;
  title: string;
  percentage: number;
  image?: string;
  created_at: string;
  tweet_highlight: string;
  description: string;
  rank?: string;
}

/**
 * Helper: HTML encode function
 */
function htmlEncode(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;") 
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Fetch Digital DNA data from public API
 */
async function fetchPublicDigitalDna(username: string): Promise<DnaData[]> {
  try {
    if (!username) {
      console.log("🧬 No username available");
      return [];
    }

    console.log(`🧬 Fetching public DNA data for ${username}`);
    const dnaHeaders = await buildForuHeaders("GET", "", undefined);
    const dnaUrl = `${API_BASE_URL}/v1/public/user/dna/${username}`;
    console.log("➡️ Fetching DNA from", dnaUrl);
    const dnaResp = await fetch(dnaUrl, { headers: dnaHeaders });
    console.log("⬅️ DNA Status", dnaResp.status);

    if (dnaResp.ok) {
      const dnaJson = await dnaResp.json();
      console.log("🧬 DNA JSON", dnaJson);
      if (dnaJson.code === 200 && dnaJson.data && dnaJson.data.length > 0) {
        // Take top 10 items for 5x2 grid
        const digitalDnaData = dnaJson.data.slice(0, 10).map((item: any, index: number) => ({
          id: `dna-${index}`,
          title: item.dna?.title || "Unknown",
          percentage: Math.round(item.percentage || 0),
          image: item.dna?.image || null,
          created_at: `${item.created_at}` || "Unknown",
          tweet_highlight: htmlEncode(item.tweet_highlight) || "Unknown",
          description: htmlEncode(item.dna?.description) || "Unknown",
          rank: index === 0 && item.percentage >= 100 ? "Top 5 Global" : null,
        }));
        console.log(`🧬 Loaded ${digitalDnaData.length} public DNA items for ID card`);
        return digitalDnaData;
      } else {
        console.log("🧬 No public DNA data available for ID card");
      }
    } else if (dnaResp.status === 404) {
      console.log("🧬 404 - No public DNA data found for user");
    } else {
      console.error("🧬 Public DNA API error:", dnaResp.status);
    }
  } catch (error) {
    console.error("🧬 Error fetching public DNA data for ID card:", error);
  }

  return [];
}

/**
 * Draw Digital DNA card with real API data
 */
export async function drawDigitalDnaCard(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  username?: string,
  scaleFactor: number = 1
): Promise<void> {
  // Card background with border radius
  const borderRadius = 8 * scaleFactor;
  ctx.fillStyle = '#1f1b2b';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fill();
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.stroke();

  // Title (smaller font) - scaled
  ctx.fillStyle = '#ececf1';
  ctx.font = `bold ${8 * scaleFactor}px Arial`; // Reduced from 10px to 8px // Scale font size
  ctx.textAlign = 'left';
  ctx.fillText('Digital DNA', x + (12 * scaleFactor), y + (16 * scaleFactor));

  // Fetch real data from API
  let dnaItems: DnaData[] = [];
  if (username) {
    try {
      dnaItems = await fetchPublicDigitalDna(username);
      console.log(`🧬 Fetched ${dnaItems.length} DNA items for ID card:`, dnaItems.map(d => ({ title: d.title, percentage: d.percentage, image: d.image })));
      
      // Log each DNA item for debugging
      dnaItems.forEach((item, index) => {
        console.log(`🧬 DNA ${index + 1}: "${item.title}" - Percentage: ${item.percentage}% - Image: "${item.image}"`);
      });
    } catch (error) {
      console.error('Error fetching DNA data for ID card:', error);
    }
  } else {
    console.log('🧬 No username provided for DNA');
  }

  // DNA grid (2x2) - scaled layout
  const itemWidth = (width - (24 * scaleFactor)) / 2; // 2 columns with padding
  const itemHeight = (height - (80 * scaleFactor)) / 2; // 2 rows with title space and vertical spacing
  const itemSpacing = 12 * scaleFactor; // Scale item spacing
  const verticalSpacing = 24 * scaleFactor; // Vertical spacing between grid items
  const startX = x + (12 * scaleFactor);
  const startY = y + (30 * scaleFactor); // Scale start Y
  const itemsPerRow = 2;
  const totalDnaItems = 4; // 2x2 grid

  // Draw DNA items with real data
  console.log(`🎨 Drawing ${Math.min(totalDnaItems, dnaItems.length)} DNA items out of ${dnaItems.length} total`);
  for (let i = 0; i < totalDnaItems; i++) {
    const row = Math.floor(i / itemsPerRow);
    const col = i % itemsPerRow;
    const itemX = startX + (col * (itemWidth + itemSpacing));
    const itemY = startY + (row * (itemHeight + verticalSpacing));

    if (i < dnaItems.length) {
      // Draw real DNA item with 2-column layout
      const dnaItem = dnaItems[i];
      console.log(`🎨 Drawing DNA ${i + 1}: "${dnaItem.title}" at position (${itemX}, ${itemY})`);
      console.log(`🎨 DNA image URL: "${dnaItem.image}"`);
      
      // Check if DNA has valid image URL
      if (dnaItem.image && dnaItem.image.trim() && dnaItem.image !== 'null' && dnaItem.image !== 'undefined') {
        await drawRealDnaItemTwoColumn(ctx, itemX, itemY, itemWidth, itemHeight, dnaItem, scaleFactor, i);
      } else {
        console.warn(`⚠️ DNA "${dnaItem.title}" has invalid image URL: "${dnaItem.image}", using fallback`);
        drawDnaFallbackTwoColumn(ctx, itemX, itemY, itemWidth, itemHeight, dnaItem, scaleFactor, i);
      }
    } else {
      // Draw empty DNA placeholder with 2-column layout
      console.log(`🎨 Drawing empty DNA placeholder ${i + 1} at position (${itemX}, ${itemY})`);
      drawEmptyDnaTwoColumn(ctx, itemX, itemY, itemWidth, itemHeight, scaleFactor);
    }
  }
}

/**
 * Draw real DNA item with 2-column layout (image + title+percentage)
 */
async function drawRealDnaItemTwoColumn(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, dnaItem: DnaData, scaleFactor: number = 1, index: number = 0): Promise<void> {
  console.log(`🎨 Drawing DNA item with 2-column layout: ${dnaItem.title} with image: ${dnaItem.image}`);

  // Column 1: Image (left side) - same size as collected badge
  const imageSize = 40 * scaleFactor; // Same size as collected badge
  const imagePadding = 4 * scaleFactor;
  const imageColumnWidth = imageSize + (imagePadding * 2);
  const imageX = x + imagePadding;
  const imageY = y + imagePadding;

  try {
    // Try to load and draw the DNA image
    const imageLoaded = await loadDnaImage(dnaItem.image!);
    
    if (imageLoaded) {
      // Draw the loaded image - scaled
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = imageSize;
      tempCanvas.height = imageSize;
      
      // Draw image to temp canvas first
      tempCtx.drawImage(imageLoaded, 0, 0, imageSize, imageSize);
      
      // Draw temp canvas to main canvas
      ctx.drawImage(tempCanvas, imageX, imageY);
      
      console.log(`✅ Successfully drew DNA image: ${dnaItem.title}`);
    } else {
      console.warn(`⚠️ Failed to load DNA image, using fallback: ${dnaItem.title}`);
      drawDnaFallbackIcon(ctx, imageX, imageY, imageSize, dnaItem, scaleFactor);
    }
  } catch (error) {
    console.error(`❌ Error drawing DNA ${dnaItem.title}:`, error);
    drawDnaFallbackIcon(ctx, imageX, imageY, imageSize, dnaItem, scaleFactor);
  }

  // Column 2: Title and Percentage (right side)
  const textColumnX = x + imageColumnWidth + (8 * scaleFactor);
  const textColumnWidth = width - imageColumnWidth - (8 * scaleFactor);
  
  // Draw title
  ctx.fillStyle = '#ececf1';
  ctx.font = `${8 * scaleFactor}px Arial`; // Reduced from 10px to 8px
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Truncate title if too long
  let displayTitle = dnaItem.title;
  const maxTitleWidth = textColumnWidth - (4 * scaleFactor);
  const titleMetrics = ctx.measureText(dnaItem.title);
  if (titleMetrics.width > maxTitleWidth) {
    let truncated = dnaItem.title;
    while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    displayTitle = truncated + '...';
  }
  
  ctx.fillText(displayTitle, textColumnX, y + (8 * scaleFactor));

  // Draw percentage with progress bar - center vertical alignment
  const progressHeight = 6 * scaleFactor;
  const percentageTextWidth = 32 * scaleFactor; // Space for percentage text
  const progressWidth = textColumnWidth - (4 * scaleFactor) - percentageTextWidth - (8 * scaleFactor); // Leave space for percentage
  const titleHeight = 8 * scaleFactor; // Title font size
  const titleSpacing = 16 * scaleFactor; // Spacing between title and progress bar
  const progressY = y + (8 * scaleFactor) + titleHeight + titleSpacing; // Position below title with spacing
  
  // Progress bar background with rounded corners
  ctx.fillStyle = '#2a2535';
  ctx.beginPath();
  ctx.roundRect(textColumnX, progressY, progressWidth, progressHeight, progressHeight / 2); // 50% border radius
  ctx.fill();
  
  // Progress bar fill with gradient based on index
  const progressFillWidth = (progressWidth * dnaItem.percentage) / 100;
  if (progressFillWidth > 0) {
    // Create gradient for progress bar based on index
    const gradient = ctx.createLinearGradient(textColumnX, 0, textColumnX + progressFillWidth, 0);
    
    // Different gradients for each DNA item (0-3)
    switch (index) {
      case 0:
        gradient.addColorStop(0, '#14b8a6'); // Teal/Green
        gradient.addColorStop(1, '#0d9488');
        break;
      case 1:
        gradient.addColorStop(0, '#f97316'); // Orange
        gradient.addColorStop(1, '#ea580c');
        break;
      case 2:
        gradient.addColorStop(0, '#3b82f6'); // Blue
        gradient.addColorStop(1, '#1e40af');
        break;
      case 3:
        gradient.addColorStop(0, '#8b5cf6'); // Purple
        gradient.addColorStop(1, '#7c3aed');
        break;
      default:
        gradient.addColorStop(0, '#6c4cb3'); // Default
        gradient.addColorStop(1, '#8b5cf6');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(textColumnX, progressY, progressFillWidth, progressHeight, progressHeight / 2); // 50% border radius
    ctx.fill();
  }
  
  // Percentage text (positioned to the right of progress bar, center vertical)
  ctx.fillStyle = '#ececf1';
  ctx.font = `600 ${10 * scaleFactor}px Arial`; // Same font weight as user_digital_dna
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle'; // Center vertical alignment
  ctx.fillText(`${dnaItem.percentage}%`, textColumnX + progressWidth + percentageTextWidth, progressY + (progressHeight / 2));
}

/**
 * Draw DNA fallback with 2-column layout
 */
function drawDnaFallbackTwoColumn(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, dnaItem: DnaData, scaleFactor: number = 1, index: number = 0): void {
  console.log(`🔄 Drawing fallback DNA with 2-column layout: ${dnaItem.title}`);
  
  // Column 1: Image (left side) - same size as collected badge
  const imageSize = 40 * scaleFactor; // Same size as collected badge
  const imagePadding = 4 * scaleFactor;
  const imageColumnWidth = imageSize + (imagePadding * 2);
  const imageX = x + imagePadding;
  const imageY = y + imagePadding;

  // Draw fallback icon
  drawDnaFallbackIcon(ctx, imageX, imageY, imageSize, dnaItem, scaleFactor);

  // Column 2: Title and Percentage (right side)
  const textColumnX = x + imageColumnWidth + (8 * scaleFactor);
  const textColumnWidth = width - imageColumnWidth - (8 * scaleFactor);
  
  // Draw title
  ctx.fillStyle = '#ececf1';
  ctx.font = `bold ${8 * scaleFactor}px Arial`; // Reduced from 10px to 8px
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Truncate title if too long
  let displayTitle = dnaItem.title;
  const maxTitleWidth = textColumnWidth - (4 * scaleFactor);
  const titleMetrics = ctx.measureText(dnaItem.title);
  if (titleMetrics.width > maxTitleWidth) {
    let truncated = dnaItem.title;
    while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    displayTitle = truncated + '...';
  }
  
  ctx.fillText(displayTitle, textColumnX, y + (8 * scaleFactor));

  // Draw percentage with progress bar - center vertical alignment
  const progressHeight = 6 * scaleFactor;
  const percentageTextWidth = 32 * scaleFactor; // Space for percentage text
  const progressWidth = textColumnWidth - (4 * scaleFactor) - percentageTextWidth - (8 * scaleFactor); // Leave space for percentage
  const titleHeight = 8 * scaleFactor; // Title font size
  const titleSpacing = 4 * scaleFactor; // Spacing between title and progress bar
  const progressY = y + (8 * scaleFactor) + titleHeight + titleSpacing; // Position below title with spacing
  
  // Progress bar background with rounded corners
  ctx.fillStyle = '#2a2535';
  ctx.beginPath();
  ctx.roundRect(textColumnX, progressY, progressWidth, progressHeight, progressHeight / 2); // 50% border radius
  ctx.fill();
  
  // Progress bar fill with gradient based on index
  const progressFillWidth = (progressWidth * dnaItem.percentage) / 100;
  if (progressFillWidth > 0) {
    // Create gradient for progress bar based on index
    const gradient = ctx.createLinearGradient(textColumnX, 0, textColumnX + progressFillWidth, 0);
    
    // Different gradients for each DNA item (0-3)
    switch (index) {
      case 0:
        gradient.addColorStop(0, '#14b8a6'); // Teal/Green
        gradient.addColorStop(1, '#0d9488');
        break;
      case 1:
        gradient.addColorStop(0, '#f97316'); // Orange
        gradient.addColorStop(1, '#ea580c');
        break;
      case 2:
        gradient.addColorStop(0, '#3b82f6'); // Blue
        gradient.addColorStop(1, '#1e40af');
        break;
      case 3:
        gradient.addColorStop(0, '#8b5cf6'); // Purple
        gradient.addColorStop(1, '#7c3aed');
        break;
      default:
        gradient.addColorStop(0, '#6c4cb3'); // Default
        gradient.addColorStop(1, '#8b5cf6');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(textColumnX, progressY, progressFillWidth, progressHeight, progressHeight / 2); // 50% border radius
    ctx.fill();
  }
  
  // Percentage text (positioned to the right of progress bar, center vertical)
  ctx.fillStyle = '#ececf1';
  ctx.font = `600 ${10 * scaleFactor}px Arial`; // Same font weight as user_digital_dna
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle'; // Center vertical alignment
  ctx.fillText(`${dnaItem.percentage}%`, textColumnX + progressWidth + percentageTextWidth, progressY + (progressHeight / 2));
}

/**
 * Draw empty DNA placeholder with 2-column layout
 */
function drawEmptyDnaTwoColumn(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, scaleFactor: number = 1): void {
  // Column 1: Image (left side) - same size as collected badge
  const imageSize = 40 * scaleFactor; // Same size as collected badge
  const imagePadding = 4 * scaleFactor;
  const imageColumnWidth = imageSize + (imagePadding * 2);
  const imageX = x + imagePadding;
  const imageY = y + imagePadding;

  // DNA molecule icon
  ctx.fillStyle = '#5D5D5DFF';
  ctx.font = `${16 * scaleFactor}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧬', imageX + imageSize/2, imageY + imageSize/2);

  // Column 2: Title and Percentage (right side)
  const textColumnX = x + imageColumnWidth + (8 * scaleFactor);
  const textColumnWidth = width - imageColumnWidth - (8 * scaleFactor);
  
  // Draw "No DNA" title
  ctx.fillStyle = '#aeb0b6';
  ctx.font = `bold ${8 * scaleFactor}px Arial`; // Reduced from 10px to 8px
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('No DNA', textColumnX, y + (8 * scaleFactor));

  // Draw empty progress bar - center vertical alignment
  const progressHeight = 6 * scaleFactor;
  const percentageTextWidth = 32 * scaleFactor; // Space for percentage text
  const progressWidth = textColumnWidth - (4 * scaleFactor) - percentageTextWidth - (8 * scaleFactor); // Leave space for percentage
  const titleHeight = 8 * scaleFactor; // Title font size
  const titleSpacing = 6 * scaleFactor; // Spacing between title and progress bar
  const progressY = y + (8 * scaleFactor) + titleHeight + titleSpacing; // Position below title with spacing
  
  // Progress bar background (empty) with rounded corners
  ctx.fillStyle = '#2a2535';
  ctx.beginPath();
  ctx.roundRect(textColumnX, progressY, progressWidth, progressHeight, progressHeight / 2); // 50% border radius
  ctx.fill();
  
  // No progress bar fill for empty DNA
  
  // Percentage text (0%) - positioned to the right of progress bar, center vertical
  ctx.fillStyle = '#aeb0b6';
  ctx.font = `600 ${10 * scaleFactor}px Arial`; // Same font weight as user_digital_dna
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle'; // Center vertical alignment
  ctx.fillText('0%', textColumnX + progressWidth + percentageTextWidth, y + (height / 2));
}

/**
 * Draw DNA fallback icon (for 2-column layout)
 */
function drawDnaFallbackIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dnaItem: DnaData, scaleFactor: number = 1): void {
  // DNA icon based on title or default
  let icon = '🧬'; // Default DNA molecule
  
  // Try to use specific emoji based on DNA title
  if (dnaItem.title.toLowerCase().includes('social') || dnaItem.title.toLowerCase().includes('network')) {
    icon = '👥';
  } else if (dnaItem.title.toLowerCase().includes('engagement') || dnaItem.title.toLowerCase().includes('interaction')) {
    icon = '💬';
  } else if (dnaItem.title.toLowerCase().includes('content') || dnaItem.title.toLowerCase().includes('quality')) {
    icon = '📝';
  } else if (dnaItem.title.toLowerCase().includes('crypto') || dnaItem.title.toLowerCase().includes('blockchain')) {
    icon = '₿';
  } else if (dnaItem.title.toLowerCase().includes('nft') || dnaItem.title.toLowerCase().includes('art')) {
    icon = '🎨';
  } else if (dnaItem.title.toLowerCase().includes('gaming') || dnaItem.title.toLowerCase().includes('game')) {
    icon = '🎮';
  } else if (dnaItem.title.toLowerCase().includes('defi') || dnaItem.title.toLowerCase().includes('finance')) {
    icon = '💰';
  } else if (dnaItem.title.toLowerCase().includes('dao') || dnaItem.title.toLowerCase().includes('governance')) {
    icon = '🏛️';
  }
  
  ctx.fillStyle = '#ececf1';
  ctx.font = `${16 * scaleFactor}px Arial`; // Scale font size
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x + size/2, y + size/2); // Center the icon
}

/**
 * Load DNA image using multiple strategies to bypass CORS issues
 */
async function loadDnaImage(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    console.log(`🔄 Attempting to load DNA image: ${imageUrl}`);
    
    // Strategy 1: Try direct image loading (fastest if CORS allows)
    const directResult = await loadImageDirect(imageUrl);
    if (directResult) {
      return directResult;
    }
    
    // Strategy 2: Try using background script as proxy
    console.log(`🔄 Trying background script proxy for DNA: ${imageUrl}`);
    const proxyResult = await loadImageViaBackgroundProxy(imageUrl);
    if (proxyResult) {
      return proxyResult;
    }
    
    // Strategy 3: Try fetch with no-cors mode
    console.log(`🔄 Trying no-cors fetch for DNA: ${imageUrl}`);
    const noCorsResult = await loadImageViaNoCors(imageUrl);
    if (noCorsResult) {
      return noCorsResult;
    }
    
    // Strategy 4: Try fetch as blob and create object URL
    console.log(`🔄 Trying fetch as blob for DNA: ${imageUrl}`);
    const blobResult = await loadImageViaBlob(imageUrl);
    if (blobResult) {
      return blobResult;
    }
    
    console.warn(`❌ All loading strategies failed for DNA: ${imageUrl}`);
    return null;
    
  } catch (error) {
    console.warn(`❌ Error loading DNA image: ${imageUrl}`, error);
    return null;
  }
}

/**
 * Load image via background script proxy
 */
async function loadImageViaBackgroundProxy(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    // Send message to background script to fetch image
    const response = await chrome.runtime.sendMessage({
      action: 'fetchImage',
      url: imageUrl
    });
    
    if (response && response.success && response.dataUrl) {
      const img = new Image();
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`⏰ Timeout loading DNA image via background proxy: ${imageUrl}`);
          resolve(null);
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ DNA image loaded successfully via background proxy: ${imageUrl}`);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`❌ Failed to load DNA image via background proxy: ${imageUrl}`);
          resolve(null);
        };
        
        img.src = response.dataUrl;
      });
    }
    
    return null;
  } catch (error) {
    console.warn(`❌ Background proxy failed for DNA: ${imageUrl}`, error);
    return null;
  }
}

/**
 * Load image via no-cors fetch
 */
async function loadImageViaNoCors(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch(imageUrl, {
      mode: 'no-cors',
      credentials: 'omit'
    });
    
    if (response.type === 'opaque') {
      // For no-cors, we can't read the response, but we can try to use the URL
      const img = new Image();
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`⏰ Timeout loading DNA image via no-cors: ${imageUrl}`);
          resolve(null);
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ DNA image loaded successfully via no-cors: ${imageUrl}`);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`❌ Failed to load DNA image via no-cors: ${imageUrl}`);
          resolve(null);
        };
        
        img.src = imageUrl;
      });
    }
    
    return null;
  } catch (error) {
    console.warn(`❌ No-cors fetch failed for DNA: ${imageUrl}`, error);
    return null;
  }
}

/**
 * Load image via blob conversion
 */
async function loadImageViaBlob(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'image/*',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`📦 Fetched DNA blob of size: ${blob.size} bytes, type: ${blob.type}`);
    const objectUrl = URL.createObjectURL(blob);
    
    const img = new Image();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout loading DNA image via blob: ${imageUrl}`);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`✅ DNA image loaded successfully via blob: ${imageUrl}`);
        resolve(img);
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.warn(`❌ Failed to load DNA image via blob: ${imageUrl}`, error);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      img.src = objectUrl;
    });
    
  } catch (error) {
    console.warn(`❌ Blob fetch failed for DNA: ${imageUrl}`, error);
    return null;
  }
}

/**
 * Try direct image loading first
 */
async function loadImageDirect(imageUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    
    const timeout = setTimeout(() => {
      console.warn(`⏰ Timeout on direct DNA image load: ${imageUrl}`);
      resolve(null);
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ Direct DNA image load successful: ${imageUrl}`);
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn(`❌ Direct DNA image load failed: ${imageUrl}`);
      resolve(null);
    };
    
    try {
      img.crossOrigin = 'anonymous';
    } catch (e) {
      // Ignore CORS setting errors
    }
    
    img.src = imageUrl;
  });
}
