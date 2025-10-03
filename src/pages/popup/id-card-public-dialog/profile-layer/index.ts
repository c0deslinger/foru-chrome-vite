// src/pages/popup/id-card-public-dialog/profile-layer/index.ts

import { extractTwitterProfileData } from '../profile/index.js';

/**
 * Profile Layer - Layer 2
 * Handles loading and drawing the user's profile picture with rounded corners,
 * display name, and username with custom fonts
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

// Load custom fonts
export async function loadCustomFonts(): Promise<void> {
  try {
    // Load Plus Jakarta Sans font
    const plusJakartaFont = new FontFace(
      'Plus Jakarta Sans', 
      'url(https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU7NSg.ttf)'
    );
    await plusJakartaFont.load();
    document.fonts.add(plusJakartaFont);
    console.log('✅ Plus Jakarta Sans font loaded successfully');

    // For Zalando Sans Expanded, we'll use a system fallback since it's not freely available
    // Using Arial Black and Impact as fallbacks for expanded/condensed effect
    console.log('✅ Using system expanded fonts as Zalando Sans fallback');
  } catch (error) {
    console.error('❌ Error loading custom fonts:', error);
  }
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

function drawWrappedText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number, 
  maxLines: number = 2
): number {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];
  let linesDrawn = 0;
  
  // Special case: if it's a single word that exceeds maxWidth, truncate it
  if (words.length === 1) {
    const singleWord = words[0];
    const metrics = ctx.measureText(singleWord);
    if (metrics.width > maxWidth) {
      // Truncate the single word
      let truncatedWord = '';
      for (let i = 0; i < singleWord.length; i++) {
        const testWord = singleWord.substring(0, i + 1) + '...';
        const testMetrics = ctx.measureText(testWord);
        if (testMetrics.width <= maxWidth) {
          truncatedWord = testWord;
        } else {
          break;
        }
      }
      lines.push(truncatedWord || singleWord.substring(0, 1) + '...');
      return 1;
    } else {
      lines.push(singleWord);
      return 1;
    }
  }
  
  // Multi-word handling
  for (let i = 0; i < words.length && linesDrawn < maxLines; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      // If this is the last line and we still have more words, truncate
      if (linesDrawn === maxLines - 1) {
        const truncatedLine = line.trim() + '...';
        lines.push(truncatedLine);
        linesDrawn++;
        break;
      }
      
      lines.push(line.trim());
      line = words[i] + ' ';
      linesDrawn++;
    } else if (metrics.width > maxWidth && i === 0) {
      // Single word that's too long on a new line
      const singleWord = words[i];
      let truncatedWord = '';
      for (let j = 0; j < singleWord.length; j++) {
        const testWord = singleWord.substring(0, j + 1) + '...';
        const testMetrics = ctx.measureText(testWord);
        if (testMetrics.width <= maxWidth) {
          truncatedWord = testWord;
        } else {
          break;
        }
      }
      lines.push(truncatedWord || singleWord.substring(0, 1) + '...');
      linesDrawn++;
      line = '';
    } else {
      line = testLine;
    }
  }
  
  // Add the last line
  if (line && linesDrawn < maxLines) {
    // If this is the last allowed line and text is too long, truncate
    if (linesDrawn === maxLines - 1) {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth) {
        let truncatedLine = '';
        for (const word of line.split(' ')) {
          const testTruncated = truncatedLine + word + '... ';
          if (ctx.measureText(testTruncated).width <= maxWidth) {
            truncatedLine += word + ' ';
          } else {
            truncatedLine = truncatedLine.trim() + '...';
            break;
          }
        }
        lines.push(truncatedLine);
      } else {
        lines.push(line.trim());
      }
    } else {
      lines.push(line.trim());
    }
    linesDrawn++;
  }
  
  return lines.length;
}

function drawNameAndUsername(
  ctx: CanvasRenderingContext2D,
  displayName: string,
  username: string
): void {
  // Ensure fonts are ready
  document.fonts.ready.then(() => {
    // Set up font for measuring
    ctx.font = '74px Arial Black, Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Calculate how many lines the text will need
    const maxWidth = 717;
    const lineHeight = 74;
    const maxHeight = 128;
    const startX = 74;
    const startY = 106;
    
    // First pass: count lines needed
    const lineCount = drawWrappedText(ctx, displayName, startX, startY, maxWidth, lineHeight, 2);
    
    // Calculate vertical centering
    let adjustedY = startY;
    if (lineCount === 1) {
      // Center vertically within the 128px height
      const totalTextHeight = lineHeight;
      const availableHeight = maxHeight;
      const verticalOffset = (availableHeight - totalTextHeight) / 2;
      adjustedY = startY + verticalOffset;
    }
    
    // Set styles for display name
    ctx.fillStyle = '#ffffff'; // White color
    ctx.font = '74px Arial Black, Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Now draw the actual text with proper positioning
    const words = displayName.split(' ');
    
    // Special case: single word handling
    if (words.length === 1) {
      const singleWord = words[0];
      const metrics = ctx.measureText(singleWord);
      if (metrics.width > maxWidth) {
        // Truncate the single word
        let truncatedWord = '';
        for (let i = 0; i < singleWord.length; i++) {
          const testWord = singleWord.substring(0, i + 1) + '...';
          const testMetrics = ctx.measureText(testWord);
          if (testMetrics.width <= maxWidth) {
            truncatedWord = testWord;
          } else {
            break;
          }
        }
        ctx.fillText(truncatedWord || singleWord.substring(0, 1) + '...', startX, adjustedY);
      } else {
        ctx.fillText(singleWord, startX, adjustedY);
      }
    } else {
      // Multi-word handling
      let line = '';
      let currentY = adjustedY;
      let linesDrawn = 0;
      const maxLines = 2;
      
      for (let i = 0; i < words.length && linesDrawn < maxLines; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          // If this is the last line and we still have more words, truncate
          if (linesDrawn === maxLines - 1) {
            const truncatedLine = line.trim() + '...';
            ctx.fillText(truncatedLine, startX, currentY);
            break;
          }
          
          ctx.fillText(line.trim(), startX, currentY);
          line = words[i] + ' ';
          currentY += lineHeight;
          linesDrawn++;
        } else if (metrics.width > maxWidth && i === 0) {
          // Single word that's too long on a new line
          const singleWord = words[i];
          let truncatedWord = '';
          for (let j = 0; j < singleWord.length; j++) {
            const testWord = singleWord.substring(0, j + 1) + '...';
            const testMetrics = ctx.measureText(testWord);
            if (testMetrics.width <= maxWidth) {
              truncatedWord = testWord;
            } else {
              break;
            }
          }
          ctx.fillText(truncatedWord || singleWord.substring(0, 1) + '...', startX, currentY);
          currentY += lineHeight;
          linesDrawn++;
          line = '';
        } else {
          line = testLine;
        }
      }
      
      // Draw the last line
      if (line && linesDrawn < maxLines) {
        // If this is the last allowed line and text is too long, truncate
        if (linesDrawn === maxLines - 1) {
          const metrics = ctx.measureText(line);
          if (metrics.width > maxWidth) {
            let truncatedLine = '';
            for (const word of line.split(' ')) {
              const testTruncated = truncatedLine + word + '... ';
              if (ctx.measureText(testTruncated).width <= maxWidth) {
                truncatedLine += word + ' ';
              } else {
                truncatedLine = truncatedLine.trim() + '...';
                break;
              }
            }
            ctx.fillText(truncatedLine, startX, currentY);
          } else {
            ctx.fillText(line.trim(), startX, currentY);
          }
        } else {
          ctx.fillText(line.trim(), startX, currentY);
        }
      }
    }
    
    // Draw username with Plus Jakarta Sans
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // White with 50% transparency
    ctx.font = '500 40px "Plus Jakarta Sans", Arial, sans-serif'; // Medium weight
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Add @ symbol if not present
    const formattedUsername = username.startsWith('@') ? username : `@${username}`;
    ctx.fillText(formattedUsername, 84, 240);
    
    console.log(`✅ Name and username drawn: "${displayName}" (${lineCount} lines) and "${formattedUsername}"`);
  }).catch(error => {
    console.error('❌ Error waiting for fonts:', error);
  });
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
    // Extract Twitter profile data to get the profile picture URL and user info
    const twitterProfileData = extractTwitterProfileData();
    const profilePictureUrl = twitterProfileData?.twitter_account?.profile_picture_url;
    const displayName = twitterProfileData?.displayName || 'Unknown User';
    const username = twitterProfileData?.twitter_account?.username || 'unknown';
    
    // Draw name and username first (they appear above the profile picture)
    drawNameAndUsername(ctx, displayName, username);
    
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
