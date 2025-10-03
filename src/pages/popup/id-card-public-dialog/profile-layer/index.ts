// src/pages/popup/id-card-public-dialog/profile-layer/index.ts

import { extractTwitterProfileData } from '../profile/index.js';

/**
 * Profile Layer - Layer 2
 * Handles loading and drawing the user's profile picture with rounded corners
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

export async function loadProfileImageForCard(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    console.log(`🔄 Loading profile image for card: ${imageUrl}`);
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout loading profile image: ${imageUrl}`);
        resolve(null);
      }, 10000); // 10 second timeout
      
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
      
      // Set crossOrigin for Twitter images
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  } catch (error) {
    console.warn(`❌ Error loading profile image:`, error);
    return null;
  }
}

export function drawProfilePicturePlaceholder(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  borderRadius: number
): void {
  // Save context
  ctx.save();
  
  // Create rounded rectangle clipping path
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.clip();
  
  // Draw placeholder background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, width, height);
  
  // Restore context
  ctx.restore();
  
  // Draw rounded border
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.stroke();
  
  // Draw placeholder icon
  ctx.fillStyle = '#aeb0b6';
  ctx.font = `${width * 0.2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤', x + width/2, y + height/2);
  
  console.log(`✅ Profile picture placeholder drawn at (${x}, ${y}) with size ${width}x${height}`);
}

export async function drawProfileLayer(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  borderRadius: number,
  data: IdCardPublicData
): Promise<void> {
  try {
    // Extract Twitter profile data to get the profile picture URL
    const twitterProfileData = extractTwitterProfileData();
    const profilePictureUrl = twitterProfileData?.twitter_account?.profile_picture_url;
    
    if (profilePictureUrl) {
      const img = await loadProfileImageForCard(profilePictureUrl);
      if (img) {
        // Save context for clipping
        ctx.save();
        
        // Create rounded rectangle clipping path
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, borderRadius);
        ctx.clip();
        
        // Draw the profile image
        ctx.drawImage(img, x, y, width, height);
        
        // Restore context
        ctx.restore();
        
        console.log(`✅ Profile layer drawn at (${x}, ${y}) with size ${width}x${height} and border radius ${borderRadius}`);
      } else {
        // Draw placeholder if image fails to load
        drawProfilePicturePlaceholder(ctx, x, y, width, height, borderRadius);
      }
    } else {
      // Draw placeholder if no profile picture URL
      drawProfilePicturePlaceholder(ctx, x, y, width, height, borderRadius);
    }
  } catch (error) {
    console.error('❌ Error drawing profile layer:', error);
    drawProfilePicturePlaceholder(ctx, x, y, width, height, borderRadius);
  }
}
