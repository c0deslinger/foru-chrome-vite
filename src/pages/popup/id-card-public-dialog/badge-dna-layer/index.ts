// src/pages/popup/id-card-public-dialog/badge-dna-layer/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';
import { extractTwitterProfileData } from '../profile-layer/index.js';

/**
 * Badge DNA Layer - Layer between profile and overlay
 * Handles loading and drawing DNA items and badges with title images
 */

interface IdCardPublicData {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  generatedAt?: Date;
  userProfileData?: any;
  identifiScore?: number;
  username?: string;
}

interface DnaData {
  id: string;
  title: string;
  percentage: number;
  image?: string;
  created_at: string;
  tweet_highlight: string;
  description: string;
  rank?: string;
}

interface BadgeData {
  name: string;
  image: string;
  description: string;
  partnerLogo: string;
  partnerName: string;
}

// Load title images
async function loadDnaTitleImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ DNA title image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading DNA title image:', error);
      resolve(null);
    };
    
    setTimeout(() => {
      if (!img.complete) {
        console.warn('⚠️ DNA title image loading timeout');
        resolve(null);
      }
    }, 5000);
    
    img.src = chrome.runtime.getURL('images/card/card_dna_title.png');
  });
}

async function loadBadgeTitleImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Badge title image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading badge title image:', error);
      resolve(null);
    };
    
    setTimeout(() => {
      if (!img.complete) {
        console.warn('⚠️ Badge title image loading timeout');
        resolve(null);
      }
    }, 5000);
    
    img.src = chrome.runtime.getURL('images/card/card_badge_title.png');
  });
}

async function loadDnaPlaceholderImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ DNA placeholder image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading DNA placeholder image:', error);
      resolve(null);
    };
    
    setTimeout(() => {
      if (!img.complete) {
        console.warn('⚠️ DNA placeholder image loading timeout');
        resolve(null);
      }
    }, 5000);
    
    img.src = chrome.runtime.getURL('images/card/card_dna_placeholder.png');
  });
}

async function loadBadgePlaceholderImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Badge placeholder image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading badge placeholder image:', error);
      resolve(null);
    };
    
    setTimeout(() => {
      if (!img.complete) {
        console.warn('⚠️ Badge placeholder image loading timeout');
        resolve(null);
      }
    }, 5000);
    
    img.src = chrome.runtime.getURL('images/card/card_badge_placeholder.png');
  });
}

// Fetch DNA data from API (following digital-dna/index.ts implementation)
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
        // Take max 4 items for the layer
        const digitalDnaData = dnaJson.data.slice(0, 4).map((item: any, index: number) => ({
          id: `dna-${index}`,
          title: item.dna?.title || "Unknown",
          percentage: Math.round(item.percentage || 0),
          image: item.dna?.image || null,
          created_at: `${item.created_at}` || "Unknown",
          tweet_highlight: item.tweet_highlight || "Unknown",
          description: item.dna?.description || "Unknown",
          rank: index === 0 && item.percentage >= 100 ? "Top 5 Global" : null,
        }));
        console.log(`🧬 Loaded ${digitalDnaData.length} public DNA items for badge-dna layer`);
        
        // Log each DNA item for debugging
        digitalDnaData.forEach((item, index) => {
          console.log(`🧬 DNA ${index + 1}: "${item.title}" - Percentage: ${item.percentage}% - Image: "${item.image}"`);
        });
        
        return digitalDnaData;
      } else {
        console.log("🧬 No public DNA data available for badge-dna layer");
      }
    } else if (dnaResp.status === 404) {
      console.log("🧬 404 - No public DNA data found for user");
    } else {
      console.error("🧬 Public DNA API error:", dnaResp.status);
    }
  } catch (error) {
    console.error("🧬 Error fetching public DNA data for badge-dna layer:", error);
  }

  return [];
}

// Fetch badges data from API (following collected-badges/index.ts implementation)
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
      
      // Take max 3 badges for the layer
      const limitedBadges = unlockedBadges.slice(0, 3);
      console.log(`🔖 Loaded ${limitedBadges.length} public badges for badge-dna layer`);
      
      // Log each badge item for debugging
      limitedBadges.forEach((badge, index) => {
        console.log(`🔖 Badge ${index + 1}: "${badge.name}" - Image URL: "${badge.image}"`);
      });
      
      return limitedBadges;
    }
    
    return [];
  } catch (error) {
    console.error("🔖 Error fetching public badges for badge-dna layer:", error);
    return [];
  }
}

export async function drawBadgeDnaLayer(
  ctx: CanvasRenderingContext2D,
  data: IdCardPublicData
): Promise<void> {
  try {
    // Get Twitter profile data
    const twitterProfileData = extractTwitterProfileData();
    const username = twitterProfileData?.twitter_account?.username || data.username;

    if (!username) {
      console.log('⚠️ No username available for badge-dna layer');
      return;
    }

    // Load title images
    const [dnaTitleImg, badgeTitleImg] = await Promise.all([
      loadDnaTitleImage(),
      loadBadgeTitleImage()
    ]);

    // Draw title images
    if (dnaTitleImg) {
      ctx.drawImage(dnaTitleImg, 0, 337);
      console.log('✅ DNA title image drawn at (0, 337)');
    }

    if (badgeTitleImg) {
      ctx.drawImage(badgeTitleImg, 689, 337);
      console.log('✅ Badge title image drawn at (689, 337)');
    }

    // Fetch data in parallel
    const [dnaItems, badgeItems] = await Promise.all([
      fetchPublicDigitalDna(username),
      fetchPublicBadges(username)
    ]);

    // Draw DNA items if available (more than 1)
    if (dnaItems.length > 1) {
      await drawDnaItems(ctx, dnaItems);
    }

    // Draw badge items if available (more than 1)
    if (badgeItems.length > 1) {
      await drawBadgeItems(ctx, badgeItems);
    }

    console.log(`✅ Badge-DNA layer drawn with ${dnaItems.length} DNA items and ${badgeItems.length} badges`);

  } catch (error) {
    console.error('❌ Error drawing badge-dna layer:', error);
  }
}

async function drawDnaItems(ctx: CanvasRenderingContext2D, dnaItems: DnaData[]): Promise<void> {
  const dnaPlaceholderImg = await loadDnaPlaceholderImage();
  const maxItems = Math.min(4, dnaItems.length);
  
  for (let i = 0; i < maxItems; i++) {
    const x = 42;
    const y = 468 + (i * (172 + 30)); // Start from Y 468 with 172 height + 30 vertical spacing
    const width = 328;
    const height = 172;
    const padding = 21;
    
    // Draw background placeholder
    if (dnaPlaceholderImg) {
      ctx.drawImage(dnaPlaceholderImg, x, y, width, height);
    }
    
    // Draw DNA item data
    const dnaItem = dnaItems[i];
    
    // Row 1: DNA image (83x83) and percentage text
    const imageSize = 83;
    const imageX = x + padding;
    const imageY = y + padding;
    
    // Try to load and draw DNA image
    if (dnaItem.image && dnaItem.image.trim() && dnaItem.image !== 'null' && dnaItem.image !== 'undefined') {
      try {
        const dnaImage = await loadDnaImage(dnaItem.image);
        if (dnaImage) {
          // Draw the DNA image with 16px border radius
          ctx.save();
          
          // Create rounded rectangle clipping path
          const borderRadius = 16;
          ctx.beginPath();
          ctx.roundRect(imageX, imageY, imageSize, imageSize, borderRadius);
          ctx.clip();
          
          // Draw the DNA image
          ctx.drawImage(dnaImage, imageX, imageY, imageSize, imageSize);
          
          // Restore context
          ctx.restore();
        } else {
          drawDnaPlaceholderIcon(ctx, imageX, imageY, imageSize);
        }
      } catch (error) {
        console.error(`❌ Error loading DNA image: ${dnaItem.image}`, error);
        drawDnaPlaceholderIcon(ctx, imageX, imageY, imageSize);
      }
    } else {
      drawDnaPlaceholderIcon(ctx, imageX, imageY, imageSize);
    }
    
    // Percentage text - center vertically with image, left aligned horizontally
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const percentageX = imageX + imageSize + 20; // 20px spacing from image
    const percentageY = imageY + (imageSize / 2); // Center vertically with image
    ctx.fillText(`${dnaItem.percentage}%`, percentageX, percentageY);
    
    // Row 2: DNA description text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const descriptionX = x + padding;
    const descriptionY = imageY + imageSize + 10; // 10px spacing below image
    const maxDescriptionWidth = width - (padding * 2);
    
    // Truncate description if too long
    let displayDescription = dnaItem.title; // Using title as description
    const descriptionMetrics = ctx.measureText(dnaItem.title);
    if (descriptionMetrics.width > maxDescriptionWidth) {
      let truncated = dnaItem.title;
      while (ctx.measureText(truncated + '...').width > maxDescriptionWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      displayDescription = truncated + '...';
    }
    
    ctx.fillText(displayDescription, descriptionX, descriptionY);
    
    console.log(`✅ DNA item ${i + 1} drawn: "${displayDescription}" at (${x}, ${y})`);
  }
}

async function drawBadgeItems(ctx: CanvasRenderingContext2D, badgeItems: BadgeData[]): Promise<void> {
  const badgePlaceholderImg = await loadBadgePlaceholderImage();
  const maxItems = Math.min(3, badgeItems.length);
  
  for (let i = 0; i < maxItems; i++) {
    const x = 791;
    const y = 504 + (i * (216 + 20)); // Start from Y 504 with 216 height + 20 vertical spacing
    const width = 248;
    const height = 216;
    
    // Draw background placeholder
    if (badgePlaceholderImg) {
      ctx.drawImage(badgePlaceholderImg, x, y, width, height);
    }
    
    // Draw badge image (180x180) centered
    const badgeImageSize = 180;
    const badgeImageX = x + (width - badgeImageSize) / 2; // Center horizontally
    const badgeImageY = y + (height - badgeImageSize) / 2; // Center vertically
    
    const badgeItem = badgeItems[i];
    
    // Try to load and draw badge image
    if (badgeItem.image && badgeItem.image.trim() && badgeItem.image !== 'null' && badgeItem.image !== 'undefined') {
      try {
        const badgeImage = await loadBadgeImage(badgeItem.image);
        if (badgeImage) {
          // Draw the badge image
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCanvas.width = badgeImageSize;
          tempCanvas.height = badgeImageSize;
          tempCtx.drawImage(badgeImage, 0, 0, badgeImageSize, badgeImageSize);
          ctx.drawImage(tempCanvas, badgeImageX, badgeImageY);
        } else {
          drawBadgePlaceholderIcon(ctx, badgeImageX, badgeImageY, badgeImageSize);
        }
      } catch (error) {
        console.error(`❌ Error loading badge image: ${badgeItem.image}`, error);
        drawBadgePlaceholderIcon(ctx, badgeImageX, badgeImageY, badgeImageSize);
      }
    } else {
      drawBadgePlaceholderIcon(ctx, badgeImageX, badgeImageY, badgeImageSize);
    }
    
    console.log(`✅ Badge item ${i + 1} drawn: "${badgeItem.name}" at (${x}, ${y})`);
  }
}

// Helper function to draw DNA placeholder icon
function drawDnaPlaceholderIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Draw DNA molecule icon as fallback
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧬', x + size/2, y + size/2);
}

// Helper function to draw badge placeholder icon
function drawBadgePlaceholderIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Draw badge icon as fallback
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆', x + size/2, y + size/2);
}

// Helper function to load DNA image with multiple strategies
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

// Helper function to load badge image with multiple strategies
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

// Strategy 1: Try direct image loading first
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

// Strategy 2: Load image via background script proxy
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
    console.warn(`❌ Background proxy failed for image: ${imageUrl}`, error);
    return null;
  }
}

// Strategy 3: Load image via no-cors fetch
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
    console.warn(`❌ No-cors fetch failed for image: ${imageUrl}`, error);
    return null;
  }
}

// Strategy 4: Load image via blob conversion
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
    console.log(`📦 Fetched image blob of size: ${blob.size} bytes, type: ${blob.type}`);
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
    console.warn(`❌ Blob fetch failed for image: ${imageUrl}`, error);
    return null;
  }
}
