// src/pages/popup/id-card-public-dialog/collected-badges/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface BadgeData {
  name: string;
  image: string;
  description: string;
  partnerLogo: string;
  partnerName: string;
}

/**
 * Fetch badges from public API
 */
async function fetchPublicBadges(username: string): Promise<BadgeData[]> {
  try {
    if (!username) {
      console.log("🔖 No username available for public badges");
      return [];
    }

    console.log(`🔖 Fetching public badges for ${username}`);
    const badgesHeaders = await buildForuHeaders("GET", "status=unlocked", undefined);
    const badgesUrl = `${API_BASE_URL}/v1/badge-public/twitter/${username}?status=unlocked`;
    console.log("➡️ Fetching badges from", badgesUrl);
    const badgesResp = await fetch(badgesUrl, { headers: badgesHeaders });
    console.log("⬅️ Badges Status", badgesResp.status);

    if (!badgesResp.ok) {
      console.error("🔖 Badges API error:", badgesResp.status);
      return [];
    }

    const badgesJson = await badgesResp.json();
    console.log("🔖 Badges JSON", badgesJson);
    
    if (badgesJson.code === 200 && badgesJson.data) {
      // Extract all unlocked badges from all partners
      const unlockedBadges: BadgeData[] = [];
      badgesJson.data.forEach((partner: any) => {
        partner.badges.forEach((badge: any) => {
          if (badge.unlocked) {
            unlockedBadges.push({
              name: badge.name,
              image: badge.image,
              description: badge.description,
              partnerLogo: partner.logo,
              partnerName: partner.name
            });
          }
        });
      });
      
      console.log(`🔖 Loaded ${unlockedBadges.length} public badges for ID card`);
      return unlockedBadges;
    }
    
    return [];
  } catch (error) {
    console.error("🔖 Error fetching public badges for ID card:", error);
    return [];
  }
}

/**
 * Draw Collected Badges card with real API data
 */
export async function drawCollectedBadgesCard(
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

  // Title (even smaller font) - scaled
  ctx.fillStyle = '#ececf1';
  ctx.font = `bold ${8 * scaleFactor}px Arial`; // Scale font size
  ctx.textAlign = 'left';
  ctx.fillText('Collected Badges', x + (12 * scaleFactor), y + (16 * scaleFactor));

  // Fetch real data from API
  let badges: BadgeData[] = [];
  if (username) {
    try {
      badges = await fetchPublicBadges(username);
      console.log(`🔖 Fetched ${badges.length} badges for ID card:`, badges.map(b => ({ name: b.name, image: b.image })));
      badges.forEach((badge, index) => {
        console.log(`🔖 Badge ${index + 1}: "${badge.name}" - Image URL: "${badge.image}"`);
      });
    } catch (error) {
      console.error('Error fetching badges data for ID card:', error);
    }
  } else {
    console.log('🔖 No username provided for badges');
  }

  // Badge grid (5x2) - scaled badges with reduced vertical spacing
  const badgeSize = 40 * scaleFactor; // Scale badge size
  const badgeSpacing = 36 * scaleFactor; // Scale badge spacing
  const titleHeight = 24 * scaleFactor; // Scale title height
  const rowSpacing = 5 * scaleFactor; // Scale row spacing
  const startX = x + (12 * scaleFactor);
  const startY = y + (30 * scaleFactor); // Scale start Y
  const badgesPerRow = 5;
  const totalBadges = 10; // 5x2 grid

  console.log(`🎨 Drawing ${Math.min(totalBadges, badges.length)} badges out of ${badges.length} total`);
  for (let i = 0; i < totalBadges; i++) {
    const row = Math.floor(i / badgesPerRow);
    const col = i % badgesPerRow;
    const badgeX = startX + (col * (badgeSize + badgeSpacing));
    const badgeY = startY + (row * (badgeSize + titleHeight + rowSpacing));

    if (i < badges.length) {
      const badge = badges[i];
      
      if (badge.image && badge.image.trim() && badge.image !== 'null' && badge.image !== 'undefined') {
        await drawRealBadgeWithTitle(ctx, badgeX, badgeY, badgeSize, badge, scaleFactor);
      } else {
        await drawBadgeFallbackWithTitle(ctx, badgeX, badgeY, badgeSize, badge.name, scaleFactor);
      }
    } else {
      await drawEmptyBadgeWithTitle(ctx, badgeX, badgeY, badgeSize, scaleFactor);
    }
  }
}

/**
 * Draw real badge with image and title
 */
async function drawRealBadgeWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badge: BadgeData, scaleFactor: number = 1): Promise<void> {
  console.log(`🎨 Drawing badge with title: ${badge.name} with image: ${badge.image}`);
  // No background or border - just draw the image directly
  try {
    const imageLoaded = await loadBadgeImage(badge.image);
    if (imageLoaded) {
      const padding = 2;
      const imageSize = size - (padding * 2);
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = imageSize;
      tempCanvas.height = imageSize;
      tempCtx.drawImage(imageLoaded, 0, 0, imageSize, imageSize);
      ctx.drawImage(tempCanvas, x + padding, y + padding);
      console.log(`✅ Successfully drew badge image: ${badge.name}`);
    } else {
      console.warn(`⚠️ Failed to load badge image, using fallback: ${badge.name}`);
      await drawBadgeFallbackContent(ctx, x, y, size, badge.name);
    }
  } catch (error) {
    console.error(`❌ Error drawing badge ${badge.name}:`, error);
    await drawBadgeFallbackContent(ctx, x, y, size, badge.name);
  }
  // No glow effect - clean image only
  drawBadgeTitle(ctx, x, y + size + 2, size, badge.name);
}

/**
 * Draw badge fallback with title
 */
async function drawBadgeFallbackWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badgeName: string, scaleFactor: number = 1): Promise<void> {
  console.log(`🔄 Drawing fallback badge with title: ${badgeName}`);
  // No background or border - just draw the fallback content
  await drawBadgeFallbackContent(ctx, x, y, size, badgeName);
  drawBadgeTitle(ctx, x, y + size + (2 * scaleFactor), size, badgeName, scaleFactor);
}

/**
 * Draw empty badge placeholder with title
 */
async function drawEmptyBadgeWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, scaleFactor: number = 1): Promise<void> {
  // Load and draw badge_empty.png image
  try {
    const emptyBadgeImage = await loadEmptyBadgeImage();
    if (emptyBadgeImage) {
      // Draw the empty badge image
      const padding = 2;
      const imageSize = size - (padding * 2);
      
      // Create a temporary canvas to handle the image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = imageSize;
      tempCanvas.height = imageSize;
      
      // Draw image to temp canvas first
      tempCtx.drawImage(emptyBadgeImage, 0, 0, imageSize, imageSize);
      
      // Draw temp canvas to main canvas
      ctx.drawImage(tempCanvas, x + padding, y + padding);
      
      console.log(`✅ Successfully drew empty badge image`);
    } else {
      console.warn(`⚠️ Failed to load empty badge image, using fallback`);
      drawEmptyBadgeFallback(ctx, x, y, size);
    }
  } catch (error) {
    console.error(`❌ Error drawing empty badge:`, error);
    drawEmptyBadgeFallback(ctx, x, y, size);
  }

  // Draw "No badges" title below
  drawBadgeTitle(ctx, x, y + size + 2, size, "No badges");
}

/**
 * Draw badge title below the badge
 */
function drawBadgeTitle(ctx: CanvasRenderingContext2D, x: number, y: number, badgeWidth: number, title: string, scaleFactor: number = 1): void {
  ctx.fillStyle = '#aeb0b6';
  ctx.font = `${10 * scaleFactor}px Arial`; // Scale font size
  ctx.textAlign = 'center';
  const maxWidth = badgeWidth*1.5;
  let displayTitle = title;
  const metrics = ctx.measureText(title);
  if (metrics.width > maxWidth) {
    let truncated = title;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    displayTitle = truncated + '...';
  }
  ctx.fillText(displayTitle, x + badgeWidth/2, y + 10); // Increased y offset from 8 to 10
}

/**
 * Draw badge fallback content using badge_empty.png
 */
async function drawBadgeFallbackContent(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badgeName: string): Promise<void> {
  // Try to load and draw badge_empty.png image
  try {
    const emptyBadgeImage = await loadEmptyBadgeImage();
    if (emptyBadgeImage) {
      // Draw the empty badge image
      const padding = 2;
      const imageSize = size - (padding * 2);
      
      // Create a temporary canvas to handle the image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = imageSize;
      tempCanvas.height = imageSize;
      
      // Draw image to temp canvas first
      tempCtx.drawImage(emptyBadgeImage, 0, 0, imageSize, imageSize);
      
      // Draw temp canvas to main canvas
      ctx.drawImage(tempCanvas, x + padding, y + padding);
      
      console.log(`✅ Successfully drew fallback badge image for: ${badgeName}`);
    } else {
      console.warn(`⚠️ Failed to load empty badge image for fallback: ${badgeName}, using emoji`);
      drawBadgeFallbackEmoji(ctx, x, y, size, badgeName);
    }
  } catch (error) {
    console.error(`❌ Error drawing fallback badge for ${badgeName}:`, error);
    drawBadgeFallbackEmoji(ctx, x, y, size, badgeName);
  }
}

/**
 * Draw badge fallback emoji (legacy fallback)
 */
function drawBadgeFallbackEmoji(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badgeName: string): void {
  // Badge icon (first letter of badge name or emoji)
  const icon = badgeName.charAt(0).toUpperCase() || '🏆';
  
  // Try to use emoji first, fallback to text
  if (badgeName.toLowerCase().includes('trophy') || badgeName.toLowerCase().includes('winner')) {
    ctx.fillStyle = '#ececf1';
    ctx.font = '20px Arial'; // Increased from 12px to 20px for larger badges
    ctx.textAlign = 'center';
    ctx.fillText('🏆', x + size/2, y + size/2 + 6); // Increased y offset
  } else if (badgeName.toLowerCase().includes('star') || badgeName.toLowerCase().includes('rating')) {
    ctx.fillStyle = '#ececf1';
    ctx.font = '20px Arial'; // Increased from 12px to 20px for larger badges
    ctx.textAlign = 'center';
    ctx.fillText('⭐', x + size/2, y + size/2 + 6); // Increased y offset
  } else if (badgeName.toLowerCase().includes('diamond') || badgeName.toLowerCase().includes('premium')) {
    ctx.fillStyle = '#ececf1';
    ctx.font = '20px Arial'; // Increased from 12px to 20px for larger badges
    ctx.textAlign = 'center';
    ctx.fillText('💎', x + size/2, y + size/2 + 6); // Increased y offset
  } else {
    // Use first letter as fallback
    ctx.fillStyle = '#ececf1';
    ctx.font = 'bold 16px Arial'; // Increased from 10px to 16px for larger badges
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + size/2, y + size/2 + 5); // Increased y offset
  }
}

/**
 * Load empty badge image from extension assets
 */
async function loadEmptyBadgeImage(): Promise<HTMLImageElement | null> {
  try {
    const emptyBadgeUrl = chrome.runtime.getURL('images/badge_empty.png');
    console.log(`🔄 Loading empty badge image: ${emptyBadgeUrl}`);
    
    return new Promise((resolve) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout loading empty badge image: ${emptyBadgeUrl}`);
        resolve(null);
      }, 3000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`✅ Empty badge image loaded successfully: ${emptyBadgeUrl}`);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`❌ Failed to load empty badge image: ${emptyBadgeUrl}`);
        resolve(null);
      };
      
      img.src = emptyBadgeUrl;
    });
  } catch (error) {
    console.warn(`❌ Error loading empty badge image:`, error);
    return null;
  }
}

/**
 * Draw empty badge fallback (legacy fallback)
 */
function drawEmptyBadgeFallback(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Plus icon
  ctx.strokeStyle = '#5D5D5DFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + size/2, y + 8);
  ctx.lineTo(x + size/2, y + size - 8);
  ctx.moveTo(x + 8, y + size/2);
  ctx.lineTo(x + size - 8, y + size/2);
  ctx.stroke();
}

/**
 * Load badge image using multiple strategies to bypass CORS issues
 */
async function loadBadgeImage(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    console.log(`🔄 Attempting to load badge image: ${imageUrl}`);
    
    // Strategy 1: Try direct image loading (fastest if CORS allows)
    const directResult = await loadImageDirect(imageUrl);
    if (directResult) {
      return directResult;
    }
    
    // Strategy 2: Try using background script as proxy
    console.log(`🔄 Trying background script proxy for badge: ${imageUrl}`);
    const proxyResult = await loadImageViaBackgroundProxy(imageUrl);
    if (proxyResult) {
      return proxyResult;
    }
    
    // Strategy 3: Try fetch with no-cors mode
    console.log(`🔄 Trying no-cors fetch for badge: ${imageUrl}`);
    const noCorsResult = await loadImageViaNoCors(imageUrl);
    if (noCorsResult) {
      return noCorsResult;
    }
    
    // Strategy 4: Try fetch as blob and create object URL
    console.log(`🔄 Trying fetch as blob for badge: ${imageUrl}`);
    const blobResult = await loadImageViaBlob(imageUrl);
    if (blobResult) {
      return blobResult;
    }
    
    console.warn(`❌ All loading strategies failed for badge: ${imageUrl}`);
    return null;
    
  } catch (error) {
    console.warn(`❌ Error loading badge image: ${imageUrl}`, error);
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
          console.warn(`⏰ Timeout loading badge image via background proxy: ${imageUrl}`);
          resolve(null);
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ Badge image loaded successfully via background proxy: ${imageUrl}`);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`❌ Failed to load badge image via background proxy: ${imageUrl}`);
          resolve(null);
        };
        
        img.src = response.dataUrl;
      });
    }
    
    return null;
  } catch (error) {
    console.warn(`❌ Background proxy failed for badge: ${imageUrl}`, error);
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
          console.warn(`⏰ Timeout loading badge image via no-cors: ${imageUrl}`);
          resolve(null);
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ Badge image loaded successfully via no-cors: ${imageUrl}`);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`❌ Failed to load badge image via no-cors: ${imageUrl}`);
          resolve(null);
        };
        
        img.src = imageUrl;
      });
    }
    
    return null;
  } catch (error) {
    console.warn(`❌ No-cors fetch failed for badge: ${imageUrl}`, error);
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
    console.log(`📦 Fetched badge blob of size: ${blob.size} bytes, type: ${blob.type}`);
    const objectUrl = URL.createObjectURL(blob);
    
    const img = new Image();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout loading badge image via blob: ${imageUrl}`);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`✅ Badge image loaded successfully via blob: ${imageUrl}`);
        resolve(img);
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.warn(`❌ Failed to load badge image via blob: ${imageUrl}`, error);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      img.src = objectUrl;
    });
    
  } catch (error) {
    console.warn(`❌ Blob fetch failed for badge: ${imageUrl}`, error);
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
      console.warn(`⏰ Timeout on direct badge image load: ${imageUrl}`);
      resolve(null);
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ Direct badge image load successful: ${imageUrl}`);
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn(`❌ Direct badge image load failed: ${imageUrl}`);
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
