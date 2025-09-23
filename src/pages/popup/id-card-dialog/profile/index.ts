// src/pages/popup/id-card-dialog/profile/index.ts

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
  [key: string]: any;
}

/**
 * Draw Profile Section
 */
export function drawProfileSection(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  userProfileData?: UserProfileData, 
  identifiScore?: number
): void {
  // Card background
  ctx.fillStyle = '#1f1b2b';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Get profile data
  const profilePic = userProfileData?.twitter_account?.profile_picture_url || null;
  const userName = userProfileData?.name || 'N/A';
  const twitterHandle = userProfileData?.twitter_account?.username ? `@${userProfileData.twitter_account.username}` : 'N/A';
  const currentLevel = userProfileData?.attributes?.level || 1;
  const xpCurrent = userProfileData?.attributes?.exp || 0;
  const xpTotal = userProfileData?.attributes?.max_exp_on_level || 500;
  const progressPercent = userProfileData?.attributes?.exp_progress_percentage || 0;
  const score = identifiScore || 0;

  // Profile photo
  const photoSize = 60;
  const photoX = x + 20;
  const photoY = y + 20;
  
  // For now, draw placeholder (async image loading would require canvas regeneration)
  // In a real implementation, you might want to preload the image or use a different approach
  drawProfilePhotoPlaceholder(ctx, photoX, photoY, photoSize);

  // Name
  ctx.fillStyle = '#ececf1';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(userName, photoX + photoSize + 15, photoY + 25);

  // Username
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '12px Arial';
  ctx.fillText(twitterHandle, photoX + photoSize + 15, photoY + 45);

  // Level and XP
  ctx.fillStyle = '#7246ce';
  ctx.font = '10px Arial';
  ctx.fillText(`Level ${currentLevel} • ${xpCurrent}/${xpTotal} XP`, photoX + photoSize + 15, photoY + 65);

  // IdentiFi Score
  ctx.fillStyle = '#ffb005';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`IdentiFi Score: ${score.toLocaleString()}`, photoX + photoSize + 15, photoY + 80);
}

/**
 * Draw profile photo placeholder
 */
function drawProfilePhotoPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Profile photo background
  ctx.fillStyle = '#7246ce';
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, 2 * Math.PI);
  ctx.fill();
  
  // Profile photo border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Profile photo icon (simple person icon)
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('👤', x + size/2, y + size/2 + 8);

  // Shimmer effect on profile photo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2 - 5, 0, Math.PI);
  ctx.stroke();
}
