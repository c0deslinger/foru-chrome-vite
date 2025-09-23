// src/pages/popup/id-card-dialog/collected-badges/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface BadgeData {
  name: string;
  image: string;
  description: string;
  partnerLogo: string;
  partnerName: string;
}

/**
 * Fetch badges from authenticated API
 */
async function fetchAuthenticatedBadges(accessToken: string): Promise<BadgeData[]> {
  try {
    if (!accessToken) {
      console.log("🔖 No access token available for authenticated badges");
      return [];
    }

    console.log(`🔖 Fetching authenticated badges for ID card`);
    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "status=unlocked", currentTimestamp);

    const response = await fetch(
      `${API_BASE_URL}/v1/user/badge/all?status=unlocked`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
          "x-foru-timestamp": currentTimestamp,
          "x-foru-signature": signature,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data?.code === 200 && data.data) {
      // Collect all unlocked badges from all partners
      const allUnlockedBadges: BadgeData[] = [];
      data.data.forEach((partner: any) => {
        const unlockedBadges = partner.badges.filter((badge: any) => badge.unlocked);
        unlockedBadges.forEach((badge: any) => {
          allUnlockedBadges.push({
            name: badge.name,
            image: badge.image,
            description: badge.description,
            partnerLogo: partner.logo,
            partnerName: partner.name
          });
        });
      });
      
      console.log(`🔖 Loaded ${allUnlockedBadges.length} authenticated badges for ID card`);
      return allUnlockedBadges;
    }
    
    return [];
  } catch (error) {
    console.error("🔖 Error fetching authenticated badges for ID card:", error);
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
  accessToken?: string
): Promise<void> {
  // Card background
  ctx.fillStyle = '#1f1b2b';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Title (even smaller font)
  ctx.fillStyle = '#ececf1';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Your Collected Badges', x + 12, y + 16);

  // Fetch real data from API
  let badges: BadgeData[] = [];
  if (accessToken) {
    try {
      badges = await fetchAuthenticatedBadges(accessToken);
      console.log(`🔖 Fetched ${badges.length} badges for ID card:`, badges.map(b => ({ name: b.name, image: b.image })));
      
      // Log each badge image URL for debugging
      badges.forEach((badge, index) => {
        console.log(`🔖 Badge ${index + 1}: "${badge.name}" - Image URL: "${badge.image}"`);
      });
    } catch (error) {
      console.error('Error fetching badges data for ID card:', error);
    }
  } else {
    console.log('🔖 No access token provided for badges');
  }

  // Badge grid (5x2) - 2x larger badges with reduced vertical spacing
  const badgeSize = 40; // 25 * 2 = 50
  const badgeSpacing = 16; // 8 * 2 = 16
  const titleHeight = 24; // 12 * 2 = 24
  const rowSpacing = 5; // Reduced from 30 to 20 for tighter vertical spacing
  const startX = x + 12;
  const startY = y + 30; // Increased from 22 to 30 for more space after title
  const badgesPerRow = 5;
  const totalBadges = 10; // 5x2 grid

  // Draw badges with real data
  console.log(`🎨 Drawing ${Math.min(totalBadges, badges.length)} badges out of ${badges.length} total`);
  for (let i = 0; i < totalBadges; i++) {
    const row = Math.floor(i / badgesPerRow);
    const col = i % badgesPerRow;
    const badgeX = startX + (col * (badgeSize + badgeSpacing));
    const badgeY = startY + (row * (badgeSize + titleHeight + rowSpacing));

    if (i < badges.length) {
      // Draw real badge with title
      const badge = badges[i];
      console.log(`🎨 Drawing badge ${i + 1}: "${badge.name}" at position (${badgeX}, ${badgeY})`);
      console.log(`🎨 Badge image URL: "${badge.image}"`);
      
      // Check if badge has valid image URL
      if (badge.image && badge.image.trim() && badge.image !== 'null' && badge.image !== 'undefined') {
        await drawRealBadgeWithTitle(ctx, badgeX, badgeY, badgeSize, badge);
      } else {
        console.warn(`⚠️ Badge "${badge.name}" has invalid image URL: "${badge.image}", using fallback`);
        drawBadgeFallbackWithTitle(ctx, badgeX, badgeY, badgeSize, badge.name);
      }
    } else {
      // Draw empty badge placeholder with title
      console.log(`🎨 Drawing empty badge placeholder ${i + 1} at position (${badgeX}, ${badgeY})`);
      drawEmptyBadgeWithTitle(ctx, badgeX, badgeY, badgeSize);
    }
  }
}

/**
 * Draw real badge with image and title
 */
async function drawRealBadgeWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badge: BadgeData): Promise<void> {
  console.log(`🎨 Drawing badge with title: ${badge.name} with image: ${badge.image}`);
  
  // Draw badge background first
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);

  // Draw badge border
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  try {
    // Try to load and draw the badge image
    const imageLoaded = await loadBadgeImage(badge.image);
    
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
      
      console.log(`✅ Successfully drew badge image: ${badge.name}`);
    } else {
      console.warn(`⚠️ Failed to load badge image, using fallback: ${badge.name}`);
      drawBadgeFallbackContent(ctx, x, y, size, badge.name);
    }
  } catch (error) {
    console.error(`❌ Error drawing badge ${badge.name}:`, error);
    drawBadgeFallbackContent(ctx, x, y, size, badge.name);
  }

  // Add subtle glow effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  // Draw badge title below
  drawBadgeTitle(ctx, x, y + size + 2, size, badge.name);
}

/**
 * Draw badge fallback with title
 */
function drawBadgeFallbackWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badgeName: string): void {
  console.log(`🔄 Drawing fallback badge with title: ${badgeName}`);
  
  // Badge background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);

  // Badge border
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  // Draw fallback content
  drawBadgeFallbackContent(ctx, x, y, size, badgeName);

  // Draw badge title below
  drawBadgeTitle(ctx, x, y + size + 2, size, badgeName);
}

/**
 * Draw empty badge placeholder with title
 */
function drawEmptyBadgeWithTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Empty badge background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);

  // Empty badge border
  ctx.strokeStyle = '#5D5D5DFF';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  // Plus icon
  ctx.strokeStyle = '#5D5D5DFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + size/2, y + 8);
  ctx.lineTo(x + size/2, y + size - 8);
  ctx.moveTo(x + 8, y + size/2);
  ctx.lineTo(x + size - 8, y + size/2);
  ctx.stroke();

  // Draw "No badges" title below
  drawBadgeTitle(ctx, x, y + size + 2, size, "No badges");
}

/**
 * Draw badge title below the badge
 */
function drawBadgeTitle(ctx: CanvasRenderingContext2D, x: number, y: number, badgeWidth: number, title: string): void {
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '10px Arial'; // Increased from 8px to 10px for larger badges
  ctx.textAlign = 'center';
  
  // Truncate title if too long
  const maxWidth = badgeWidth;
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
  
  ctx.fillText(displayTitle, x + badgeWidth/2, y + 10); // Increased y offset from 8 to 10
}

/**
 * Draw badge fallback content (icon/emoji)
 */
function drawBadgeFallbackContent(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badgeName: string): void {
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
 * Draw real badge with image (legacy function for compatibility)
 */
async function drawRealBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badge: BadgeData): Promise<void> {
  console.log(`🎨 Drawing badge: ${badge.name} with image: ${badge.image}`);
  
  // Draw badge background first
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);

  // Draw badge border
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  try {
    // Try to load and draw the badge image
    const imageLoaded = await loadBadgeImage(badge.image);
    
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
      
      console.log(`✅ Successfully drew badge image: ${badge.name}`);
    } else {
      console.warn(`⚠️ Failed to load badge image, using fallback: ${badge.name}`);
      drawBadgeFallback(ctx, x, y, size, badge.name);
    }
  } catch (error) {
    console.error(`❌ Error drawing badge ${badge.name}:`, error);
    drawBadgeFallback(ctx, x, y, size, badge.name);
  }

  // Add subtle glow effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
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
    console.log(`🔄 Trying background script proxy for: ${imageUrl}`);
    const proxyResult = await loadImageViaBackgroundProxy(imageUrl);
    if (proxyResult) {
      return proxyResult;
    }
    
    // Strategy 3: Try fetch with no-cors mode
    console.log(`🔄 Trying no-cors fetch for: ${imageUrl}`);
    const noCorsResult = await loadImageViaNoCors(imageUrl);
    if (noCorsResult) {
      return noCorsResult;
    }
    
    // Strategy 4: Try fetch as blob and create object URL
    console.log(`🔄 Trying fetch as blob for: ${imageUrl}`);
    const blobResult = await loadImageViaBlob(imageUrl);
    if (blobResult) {
      return blobResult;
    }
    
    console.warn(`❌ All loading strategies failed for: ${imageUrl}`);
    return null;
    
  } catch (error) {
    console.warn(`❌ Error loading image: ${imageUrl}`, error);
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
          console.warn(`⏰ Timeout loading image via background proxy: ${imageUrl}`);
          resolve(null);
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ Image loaded successfully via background proxy: ${imageUrl}`);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`❌ Failed to load image via background proxy: ${imageUrl}`);
          resolve(null);
        };
        
        img.src = response.dataUrl;
      });
    }
    
    return null;
  } catch (error) {
    console.warn(`❌ Background proxy failed for: ${imageUrl}`, error);
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
          console.warn(`⏰ Timeout loading image via no-cors: ${imageUrl}`);
          resolve(null);
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ Image loaded successfully via no-cors: ${imageUrl}`);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`❌ Failed to load image via no-cors: ${imageUrl}`);
          resolve(null);
        };
        
        img.src = imageUrl;
      });
    }
    
    return null;
  } catch (error) {
    console.warn(`❌ No-cors fetch failed for: ${imageUrl}`, error);
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
    console.log(`📦 Fetched blob of size: ${blob.size} bytes, type: ${blob.type}`);
    const objectUrl = URL.createObjectURL(blob);
    
    const img = new Image();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout loading image via blob: ${imageUrl}`);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`✅ Image loaded successfully via blob: ${imageUrl}`);
        resolve(img);
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.warn(`❌ Failed to load image via blob: ${imageUrl}`, error);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      img.src = objectUrl;
    });
    
  } catch (error) {
    console.warn(`❌ Blob fetch failed for: ${imageUrl}`, error);
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
      console.warn(`⏰ Timeout on direct image load: ${imageUrl}`);
      resolve(null);
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ Direct image load successful: ${imageUrl}`);
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn(`❌ Direct image load failed: ${imageUrl}`);
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

/**
 * Draw badge fallback when image fails to load
 */
function drawBadgeFallback(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, badgeName: string): void {
  console.log(`🔄 Drawing fallback for badge: ${badgeName}`);
  
  // Badge background (already drawn in main function)
  // Just add the fallback content
  
  // Badge icon (first letter of badge name or emoji)
  const icon = badgeName.charAt(0).toUpperCase() || '🏆';
  
  // Try to use emoji first, fallback to text
  if (badgeName.toLowerCase().includes('trophy') || badgeName.toLowerCase().includes('winner')) {
    ctx.fillStyle = '#ececf1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', x + size/2, y + size/2 + 5);
  } else if (badgeName.toLowerCase().includes('star') || badgeName.toLowerCase().includes('rating')) {
    ctx.fillStyle = '#ececf1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', x + size/2, y + size/2 + 5);
  } else if (badgeName.toLowerCase().includes('diamond') || badgeName.toLowerCase().includes('premium')) {
    ctx.fillStyle = '#ececf1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💎', x + size/2, y + size/2 + 5);
  } else {
    // Use first letter as fallback
    ctx.fillStyle = '#ececf1';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + size/2, y + size/2 + 4);
  }
}

/**
 * Draw empty badge placeholder
 */
function drawEmptyBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Empty badge background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);

  // Empty badge border
  ctx.strokeStyle = '#5D5D5DFF';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

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
