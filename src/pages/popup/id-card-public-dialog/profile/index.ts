// src/pages/popup/id-card-public-dialog/profile/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';
import { getBodyBackgroundColor, getBodyBackgroundColorWithContext } from '../../../../lib/body-color-utils.js';

/**
 * Get IdentiFi score for a username using public API
 */
async function getIdentifiScore(username: string): Promise<number> {
  try {
    if (!username) {
      console.log("🔵 No username available for IdentiFi score");
      return 0;
    }

    console.log("🔵 About to fetch IdentiFi score for", username);
    const headers = await buildForuHeaders("GET", "", undefined);
    console.log("🟡 Headers built", headers);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    console.log("➡️ Fetching from", url);
    const resp = await fetch(url, { headers });
    console.log("⬅️ Status", resp.status);
    const json = await resp.json();
    console.log("📊 JSON", json);
    
    if (json.code === 200 && json.data) {
      const score = json.data.identifi_score || 0;
      console.log(`✅ Got IdentiFi score for ${username}:`, score);
      return score;
    }
  } catch (e) {
    console.error("🔴 Failed to fetch IdentiFi score", e);
  }

  return 0;
}

/**
 * Extract profile data from Twitter page
 */
export function extractTwitterProfileData(): UserProfileData {
  // --- 1) Get the latest avatar ---
  let avatarUrl = "";
  
  // First try: Look for "Opens profile photo" element
  const profilePhotoContainer = document.querySelector('[aria-label="Opens profile photo"]');
  if (profilePhotoContainer) {
    const img = profilePhotoContainer.querySelector('img') as HTMLImageElement;
    if (img && img.src) {
      avatarUrl = img.src;
    }
  }
  
  // Second try: Look for UserAvatar container
  if (!avatarUrl) {
    const userAvatarContainer = document.querySelector('[data-testid*="UserAvatar-Container"]');
    if (userAvatarContainer) {
      const img = userAvatarContainer.querySelector('img[src*="profile_images"]') as HTMLImageElement;
      if (img && img.src) {
        avatarUrl = img.src;
      }
    }
  }
  
  // Third try: Look in primary column
  if (!avatarUrl) {
    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      const avatarElem = primaryColumn.querySelector(
        'img[src*="profile_images"]'
      ) as HTMLImageElement;
      if (avatarElem) avatarUrl = avatarElem.src;
    }
  }
  
  // Fourth try: Global fallback
  if (!avatarUrl) {
    const fallback = document.querySelector('img[src*="profile_images"]') as HTMLImageElement;
    if (fallback) avatarUrl = fallback.src;
  }

  // --- 2) Get handle (username) from URL ---
  let handle = "";
  const parts = window.location.pathname.split("/").filter((p) => p);
  if (parts.length) handle = parts[0];

  // --- 3) Get display name ---
  let displayName = "";
  const userNameContainer = document.querySelector('div[data-testid="UserName"]');
  if (userNameContainer) {
    // Look for the first span with actual text content (display name)
    const spans = userNameContainer.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim();
      if (text && text.length > 0 && !text.startsWith('@') && !text.includes('Verified account')) {
        displayName = text;
        break;
      }
    }
    
    // Fallback: try to get from h1 if spans don't work
    if (!displayName) {
      const nameElem = userNameContainer.querySelector('h1');
      if (nameElem) displayName = nameElem.textContent?.trim() || "";
    }
  }

  // --- 4) Get bio ---
  let bioText = "";
  const bioElem = document.querySelector('div[data-testid="UserDescription"]');
  if (bioElem) bioText = bioElem.textContent?.replace(/\n/g, " ").trim() || "";

  // --- 4) Get location, occupation, URL, join date, born date ---
  let locationText = "",
    jobText = "",
    urlText = "",
    joinDateText = "",
    bornDateText = "";
  const items = document.querySelector(
    'div[data-testid="UserProfileHeader_Items"]'
  );
  if (items) {
    const spans = Array.from(items.querySelectorAll("span"));
    const links = Array.from(items.querySelectorAll("a"));
    
    // Find join date
    const jSpan = spans.find((s) => s.textContent?.trim().startsWith("Joined "));
    if (jSpan) joinDateText = jSpan.textContent?.trim() || "";
    
    // Find born date
    const bornSpan = spans.find((s) => s.textContent?.trim().startsWith("Born "));
    if (bornSpan) bornDateText = bornSpan.textContent?.trim() || "";
    
    // Find URL
    const linkElem = links.find((a) => (a as HTMLAnchorElement).href?.startsWith("http"));
    if (linkElem) urlText = (linkElem as HTMLAnchorElement).href;
    
    // Get other items (location, job, etc.)
    const others = spans.filter(
      (s) => !s.textContent?.trim().startsWith("Joined ") && 
             !s.textContent?.trim().startsWith("Born ")
    );
    
    if (others.length >= 2) {
      locationText = others[0].textContent?.trim() || "";
      jobText = others[1].textContent?.trim() || "";
    } else if (others.length === 1) {
      // Check if it's location or job based on content
      const text = others[0].textContent?.trim() || "";
      if (text.includes("📍") || text.includes("🌍") || text.includes("🏠")) {
        locationText = text;
      } else {
        jobText = text;
      }
    }
  }

  // --- 5) Get followers & following ---
  let followersCount = "0",
    followingCount = "0";
  const anchors = Array.from(document.querySelectorAll("a"));
  const fA = anchors.find((a) =>
    a.textContent?.toLowerCase().endsWith("followers")
  );
  if (fA) followersCount = fA.textContent?.split(" ")[0] || "0";
  const gA = anchors.find((a) =>
    a.textContent?.toLowerCase().endsWith("following")
  );
  if (gA) followingCount = gA.textContent?.split(" ")[0] || "0";

  return {
    twitter_account: {
      profile_picture_url: avatarUrl,
      username: handle,
      location: locationText
    },
    displayName: displayName,
    bio: bioText,
    location: locationText,
    job: jobText,
    url: urlText,
    joinDate: joinDateText,
    bornDate: bornDateText,
    followersCount: followersCount,
    followingCount: followingCount
  };
}

export interface UserProfileData {
  name?: string;
  email?: string;
  twitter_account?: {
    profile_picture_url?: string;
    username?: string;
    location?: string;
  };
  attributes?: {
    level?: number;
    exp?: number;
    max_exp_on_level?: number;
    exp_progress_percentage?: number;
  };
  // Twitter bio data
  displayName?: string;
  bio?: string;
  location?: string;
  job?: string;
  url?: string;
  joinDate?: string;
  bornDate?: string;
  followersCount?: string;
  followingCount?: string;
  [key: string]: any;
}

export async function drawProfileSection(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, userProfileData?: UserProfileData, identifiScore?: number, scaleFactor: number = 1): Promise<void> {
  // Example usage of body color utility (for demonstration purposes)
  // This shows how the utility function can be used by other classes
  try {
    const bodyColor = getBodyBackgroundColor();
    const bodyColorContext = getBodyBackgroundColorWithContext();
    console.log('[ID Card Profile] Body background color:', bodyColor);
    console.log('[ID Card Profile] Body color context:', bodyColorContext);
  } catch (error) {
    console.warn('[ID Card Profile] Could not get body color (expected in canvas context):', error);
  }

  // // Profile background
  // ctx.fillStyle = '#1f1b2b';
  // ctx.fillRect(x, y, width, height);
  // ctx.strokeStyle = '#2a2535';
  // ctx.lineWidth = 1;
  // ctx.strokeRect(x, y, width, height);

  // Profile photo - scaled size
  const photoSize = 80 * scaleFactor; // Scale profile photo size
  const photoX = x + (12 * scaleFactor);
  const photoY = y + (12 * scaleFactor);
  
  // Get real IdentiFi score if not provided
  let realIdentifiScore = identifiScore;
  if (realIdentifiScore === undefined && userProfileData?.twitter_account?.username) {
    realIdentifiScore = await getIdentifiScore(userProfileData.twitter_account.username);
  }
  
  // Try to load real Twitter profile photo
  if (userProfileData?.twitter_account?.profile_picture_url) {
    try {
      await drawRealProfilePhotoWithBadge(ctx, photoX, photoY, photoSize, userProfileData.twitter_account.profile_picture_url, realIdentifiScore || 0, scaleFactor);
    } catch (error) {
      console.warn('Failed to load profile photo, using placeholder:', error);
      drawProfilePhotoPlaceholderWithBadge(ctx, photoX, photoY, photoSize, realIdentifiScore || 0, scaleFactor);
    }
  } else {
    drawProfilePhotoPlaceholderWithBadge(ctx, photoX, photoY, photoSize, realIdentifiScore || 0, scaleFactor);
  }

  // Display Name (from Twitter profile) - scaled
  ctx.fillStyle = '#ececf1';
  ctx.font = `bold ${18 * scaleFactor}px Arial`; // Scale font size
  ctx.textAlign = 'left';
  const displayName = userProfileData?.displayName || 'Unknown User';
  ctx.fillText(displayName, photoX + photoSize + (12 * scaleFactor), photoY + (25 * scaleFactor));

  // Username (from Twitter handle) - scaled
  ctx.font = `${14 * scaleFactor}px Arial`; // Scale font size
  ctx.fillStyle = '#aeb0b6';
  const username = userProfileData?.twitter_account?.username ? `@${userProfileData.twitter_account.username}` : '';
  if (username) {
    ctx.fillText(username, photoX + photoSize + (12 * scaleFactor), photoY + (45 * scaleFactor));
  }

  // Bio (from Twitter bio - multi-line support) - scaled
  if (userProfileData?.bio) {
    ctx.font = `${10 * scaleFactor}px Arial`; // Scale font size
    ctx.fillStyle = '#ececf1';
    const bio = userProfileData.bio;
    const maxWidth = width - (photoX + photoSize + (12 * scaleFactor)) - (12 * scaleFactor);
    drawWrappedText(ctx, bio, photoX + photoSize + (12 * scaleFactor), photoY + (65 * scaleFactor), maxWidth, 14 * scaleFactor, 3); // Scale line height
  }

  // IdentiFi Score - removed since it's now shown in the badge
  // The score is now displayed in the badge on the profile picture
}

export async function drawRealProfilePhoto(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, imageUrl: string): Promise<void> {
  try {
    const img = await loadProfileImage(imageUrl);
    if (img) {
      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw the image
      ctx.drawImage(img, x, y, size, size);
      
      // Restore context
      ctx.restore();
      
      // Draw border
      ctx.strokeStyle = '#3a3545';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
      ctx.stroke();
      
      console.log('✅ Successfully drew real profile photo');
    } else {
      throw new Error('Failed to load image');
    }
  } catch (error) {
    console.error('❌ Error drawing real profile photo:', error);
    drawProfilePhotoPlaceholder(ctx, x, y, size);
  }
}

export async function drawRealProfilePhotoWithBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, imageUrl: string, identifiScore: number, scaleFactor: number = 1): Promise<void> {
  try {
    const img = await loadProfileImage(imageUrl);
    if (img) {
      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw the image
      ctx.drawImage(img, x, y, size, size);
      
      // Restore context
      ctx.restore();
      
      // Draw border with purple color like in score_profile_picture
      ctx.strokeStyle = '#7349C0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw IdentiFi badge
      drawIdentifiBadge(ctx, x, y, size, identifiScore, scaleFactor);
      
      console.log('✅ Successfully drew real profile photo with badge');
    } else {
      throw new Error('Failed to load image');
    }
  } catch (error) {
    console.error('❌ Error drawing real profile photo with badge:', error);
    drawProfilePhotoPlaceholderWithBadge(ctx, x, y, size, identifiScore);
  }
}

async function loadProfileImage(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    console.log(`🔄 Loading profile image: ${imageUrl}`);
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout loading profile image: ${imageUrl}`);
        resolve(null);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`✅ Profile image loaded successfully: ${imageUrl}`);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`❌ Failed to load profile image: ${imageUrl}`);
        resolve(null);
      };
      
      // Try different loading strategies
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  } catch (error) {
    console.warn(`❌ Error loading profile image:`, error);
    return null;
  }
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number = 3): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesDrawn = 0;
  
  for (let i = 0; i < words.length && linesDrawn < maxLines; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }
  
  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  
  return currentY;
}

export function drawProfilePhotoPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Profile photo background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);
  
  // Profile photo border
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
  
  // Profile photo icon
  ctx.fillStyle = '#aeb0b6';
  ctx.font = `${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('👤', x + size/2, y + size/2 + size * 0.15);
}

export function drawProfilePhotoPlaceholderWithBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, identifiScore: number, scaleFactor: number = 1): void {
  // Profile photo background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, size, size);
  
  // Profile photo border with purple color
  ctx.strokeStyle = '#7349C0';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, size, size);
  
  // Profile photo icon
  ctx.fillStyle = '#aeb0b6';
  ctx.font = `${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('👤', x + size/2, y + size/2 + size * 0.15);
  
  // Draw IdentiFi badge
  drawIdentifiBadge(ctx, x, y, size, identifiScore, scaleFactor);
}

function drawIdentifiBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, identifiScore: number, scaleFactor: number = 1): void {
  // Badge dimensions - positioned below profile photo, scaled
  const badgeWidth = size; // 100% of avatar width
  const badgeHeight = size * 0.3; // 30% of avatar height
  const badgeX = x + (size - badgeWidth) / 2; // Center horizontally
  const badgeY = y + size + (8 * scaleFactor); // Position below profile photo with scaled margin
  
  // Create rounded rectangle path for badge background (50% border radius)
  const radius = badgeHeight / 2; // 50% border radius for fully rounded ends
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
  
  // Badge background (purple like in score_profile_picture)
  ctx.fillStyle = '#7349C0';
  ctx.fill();
  
  // // Badge border (black like in score_profile_picture)
  // ctx.strokeStyle = '#000000';
  // ctx.lineWidth = 2;
  // ctx.stroke();
  
  // Badge text (white) - scaled font size
  ctx.fillStyle = '#ffffff';
  ctx.font = `${badgeHeight * 0.6}px Arial`; // Font size scales with badge height
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Format score with commas
  const formattedScore = identifiScore.toLocaleString();
  ctx.fillText(formattedScore, badgeX + badgeWidth/2, badgeY + badgeHeight/2);
  
  console.log(`✅ Drew IdentiFi badge below profile photo with score: ${formattedScore}`);
}
