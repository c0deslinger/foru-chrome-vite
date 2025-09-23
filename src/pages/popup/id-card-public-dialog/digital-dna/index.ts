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
  username?: string
): Promise<void> {
  // Card background
  ctx.fillStyle = '#1f1b2b';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Title (smaller font)
  ctx.fillStyle = '#ececf1';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Your Digital DNA', x + 12, y + 16);

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

  // DNA grid (5x2) - same layout as badges
  const dnaSize = 40; // Same as badge size
  const dnaSpacing = 36; // Same as badge spacing
  const titleHeight = 24; // Same as badge title height
  const rowSpacing = 5; // Same as badge row spacing
  const startX = x + 12;
  const startY = y + 30; // Same as badge start Y
  const dnaPerRow = 5;
  const totalDnaItems = 10; // 5x2 grid

  // Draw DNA items with real data
  console.log(`🎨 Drawing ${Math.min(totalDnaItems, dnaItems.length)} DNA items out of ${dnaItems.length} total`);
  for (let i = 0; i < totalDnaItems; i++) {
    const row = Math.floor(i / dnaPerRow);
    const col = i % dnaPerRow;
    const dnaX = startX + (col * (dnaSize + dnaSpacing));
    const dnaY = startY + (row * (dnaSize + titleHeight + rowSpacing));

    if (i < dnaItems.length) {
      // Draw real DNA item with title
      const dnaItem = dnaItems[i];
      console.log(`🎨 Drawing DNA ${i + 1}: "${dnaItem.title}" at position (${dnaX}, ${dnaY})`);
      console.log(`🎨 DNA image URL: "${dnaItem.image}"`);
      
      // Check if DNA has valid image URL
      if (dnaItem.image && dnaItem.image.trim() && dnaItem.image !== 'null' && dnaItem.image !== 'undefined') {
        await drawRealDnaItemWithTitle(ctx, dnaX, dnaY, dnaSize, dnaItem);
      } else {
        console.warn(`⚠️ DNA "${dnaItem.title}" has invalid image URL: "${dnaItem.image}", using fallback`);
        drawDnaFallbackWithTitle(ctx, dnaX, dnaY, dnaSize, dnaItem);
      }
    } else {
      // Draw empty DNA placeholder with title
      console.log(`🎨 Drawing empty DNA placeholder ${i + 1} at position (${dnaX}, ${dnaY})`);
      drawEmptyDnaWithTitle(ctx, dnaX, dnaY, dnaSize);
    }
  }
}

/**
 * Draw real DNA item with image and title
 */
async function drawRealDnaItemWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dnaItem: DnaData): Promise<void> {
  console.log(`🎨 Drawing DNA item with title: ${dnaItem.title} with image: ${dnaItem.image}`);

  try {
    // Try to load and draw the DNA image
    const imageLoaded = await loadDnaImage(dnaItem.image!);
    
    if (imageLoaded) {
      // Draw the loaded image
      const padding = 2;
      const imageSize = size - (padding * 2);
      
      // Create a temporary canvas to handle the image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = imageSize;
      tempCanvas.height = imageSize;
      
      // Draw image to temp canvas first
      tempCtx.drawImage(imageLoaded, 0, 0, imageSize, imageSize);
      
      // Draw temp canvas to main canvas
      ctx.drawImage(tempCanvas, x + padding, y + padding);
      
      console.log(`✅ Successfully drew DNA image: ${dnaItem.title}`);
    } else {
      console.warn(`⚠️ Failed to load DNA image, using fallback: ${dnaItem.title}`);
      drawDnaFallbackContent(ctx, x, y, size, dnaItem);
    }
  } catch (error) {
    console.error(`❌ Error drawing DNA ${dnaItem.title}:`, error);
    drawDnaFallbackContent(ctx, x, y, size, dnaItem);
  }

  // Draw DNA title below
  drawDnaTitle(ctx, x, y + size + 2, size, dnaItem.title);
}

/**
 * Draw DNA fallback with title
 */
function drawDnaFallbackWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dnaItem: DnaData): void {
  console.log(`🔄 Drawing fallback DNA with title: ${dnaItem.title}`);
  
  // Draw fallback content
  drawDnaFallbackContent(ctx, x, y, size, dnaItem);

  // Draw DNA title below
  drawDnaTitle(ctx, x, y + size + 2, size, dnaItem.title);
}

/**
 * Draw empty DNA placeholder with title
 */
function drawEmptyDnaWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {

  // DNA molecule icon
  ctx.fillStyle = '#5D5D5DFF';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🧬', x + size/2, y + size/2 + 5);

  // Draw "No DNA" title below
  drawDnaTitle(ctx, x, y + size + 2, size, "No DNA");
}

/**
 * Draw DNA title below the DNA item
 */
function drawDnaTitle(ctx: CanvasRenderingContext2D, x: number, y: number, dnaWidth: number, title: string): void {
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '10px Arial'; // Same as badge title
  ctx.textAlign = 'center';
  
  // Truncate title if too long
  const maxWidth = dnaWidth*1.5;
  let displayTitle = title;
  
  // Measure text and truncate if necessary
  const metrics = ctx.measureText(title);
  if (metrics.width > maxWidth) {
    // Truncate title to fit
    let truncated = title;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    displayTitle = truncated + '...';
  }
  
  ctx.fillText(displayTitle, x + dnaWidth/2, y + 10); // Same as badge title
}

/**
 * Draw DNA fallback content (icon/emoji)
 */
function drawDnaFallbackContent(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dnaItem: DnaData): void {
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
  ctx.font = '16px Arial'; // Same as badge fallback
  ctx.textAlign = 'center';
  ctx.fillText(icon, x + size/2, y + size/2 + 5); // Same as badge fallback
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
