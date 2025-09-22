/**
 * Share Image Generator
 * Generates a shareable profile image with all user data
 */

interface UserProfileData {
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
  referral?: {
    used?: boolean;
  };
  [key: string]: any;
}

interface StoredData {
  accessToken?: string;
  id?: string;
  twitterId?: string;
  googleId?: string;
  expiresAt?: string;
  loginType?: string;
  [key: string]: any;
}

interface ScoreBreakdown {
  credibility_score?: number;
  engagement_score?: number;
  influence_score?: number;
  authenticity_score?: number;
  [key: string]: any;
}

interface DigitalDNA {
  id?: string;
  title?: string;
  percentage?: number;
  image?: string;
  created_at?: string;
  tweet_highlight?: string;
  description?: string;
  rank?: string;
  [key: string]: any;
}

interface Badge {
  name?: string;
  image?: string;
  description?: string;
  partnerLogo?: string;
  partnerName?: string;
  [key: string]: any;
}

export async function generateShareImage(
  userProfileData: UserProfileData,
  storedData: StoredData,
  scoreBreakdown: ScoreBreakdown,
  digitalDNA: DigitalDNA[],
  badges: Badge[]
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size - modern aspect ratio like Q1 Recap
      const width = 800;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;

      // Background gradient - purple theme like Q1 Recap
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#4c1d95');
      gradient.addColorStop(0.5, '#5b21b6');
      gradient.addColorStop(1, '#6d28d9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Header section
      await drawHeader(ctx, userProfileData, width);
      
      // Score breakdown section
      await drawScoreBreakdown(ctx, scoreBreakdown, width, 380);
      
      // Digital DNA section
      await drawDigitalDNA(ctx, digitalDNA, width, 520);
      
      // Badges section
      await drawBadges(ctx, badges, width, 720);
      
      // Footer
      drawFooter(ctx, width, height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      resolve(dataUrl);
    } catch (error) {
      console.error('Error generating share image:', error);
      reject(error);
    }
  });
}

async function drawHeader(ctx: CanvasRenderingContext2D, userProfileData: UserProfileData, width: number): Promise<void> {
  // Q1 Recap banner
  const bannerWidth = 200;
  const bannerHeight = 40;
  const bannerX = 40;
  const bannerY = 40;
  
  // Banner background
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);
  
  // Banner text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ForU IdentiFi', bannerX + bannerWidth/2, bannerY + bannerHeight/2 + 6);
  
  // Profile card section
  const cardWidth = 300;
  const cardHeight = 200;
  const cardX = (width - cardWidth) / 2;
  const cardY = 120;
  
  // Profile card background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  
  // Profile picture
  const profilePicSize = 80;
  const profilePicX = cardX + (cardWidth - profilePicSize) / 2;
  const profilePicY = cardY + 20;
  
  if (userProfileData.twitter_account?.profile_picture_url) {
    try {
      const img = await loadImage(userProfileData.twitter_account.profile_picture_url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(profilePicX + profilePicSize/2, profilePicY + profilePicSize/2, profilePicSize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, profilePicX, profilePicY, profilePicSize, profilePicSize);
      ctx.restore();
    } catch (error) {
      console.warn('Could not load profile picture:', error);
      // Draw default avatar
      drawDefaultAvatar(ctx, profilePicX, profilePicY, profilePicSize);
    }
  } else {
    drawDefaultAvatar(ctx, profilePicX, profilePicY, profilePicSize);
  }
  
  // Name and username on purple background
  const nameY = cardY + cardHeight + 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(userProfileData.name || 'User', width / 2, nameY);
  
  // Twitter username
  if (userProfileData.twitter_account?.username) {
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '16px Arial';
    ctx.fillText(`@${userProfileData.twitter_account.username}`, width / 2, nameY + 30);
  }
  
  // Level badge
  if (userProfileData.attributes?.level) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Level ${userProfileData.attributes.level}`, width / 2, nameY + 60);
  }
}

async function drawScoreBreakdown(ctx: CanvasRenderingContext2D, scoreBreakdown: ScoreBreakdown, width: number, startY: number): Promise<void> {
  // Statistics section like Q1 Recap
  const statsY = startY;
  
  // Score items with large numbers like Q1 Recap
  const scores = [
    { name: 'Credibility', value: scoreBreakdown.credibility_score || 0, color: '#10b981' },
    { name: 'Engagement', value: scoreBreakdown.engagement_score || 0, color: '#3b82f6' },
    { name: 'Influence', value: scoreBreakdown.influence_score || 0, color: '#f59e0b' },
    { name: 'Authenticity', value: scoreBreakdown.authenticity_score || 0, color: '#8b5cf6' }
  ];
  
  const itemWidth = (width - 100) / 4;
  const itemHeight = 120;
  
  scores.forEach((score, index) => {
    const x = 50 + index * itemWidth;
    const y = statsY;
    
    // Large score number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`+${score.value.toLocaleString()}`, x + itemWidth/2, y + 40);
    
    // Score label
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '14px Arial';
    ctx.fillText(score.name, x + itemWidth/2, y + 65);
    
    // Progress bar
    const barWidth = itemWidth - 20;
    const barHeight = 8;
    const barX = x + 10;
    const barY = y + 80;
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Fill
    ctx.fillStyle = score.color;
    const fillWidth = (barWidth * score.value) / 100;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
  });
}

async function drawDigitalDNA(ctx: CanvasRenderingContext2D, digitalDNA: DigitalDNA[], width: number, startY: number): Promise<void> {
  // Section title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Digital DNA Traits', 40, startY);
  
  // DNA items in 2x2 grid
  const maxItems = 4;
  const displayedDNA = digitalDNA.slice(0, maxItems);
  
  const itemWidth = (width - 120) / 2;
  const itemHeight = 60;
  const itemSpacing = 20;
  
  displayedDNA.forEach((dna, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    
    const x = 40 + col * (itemWidth + itemSpacing);
    const y = startY + 30 + row * (itemHeight + itemSpacing);
    
    // DNA card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y, itemWidth, itemHeight);
    
    // DNA title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(dna.title || 'Unknown', x + 10, y + 20);
    
    // DNA percentage
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '12px Arial';
    ctx.fillText(`${dna.percentage || 0}% Match`, x + 10, y + 40);
    
    // DNA percentage bar
    const barWidth = itemWidth - 20;
    const barHeight = 6;
    const barX = x + 10;
    const barY = y + 45;
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Fill with gradient colors based on DNA index
    const gradientColors = [
      '#14b8a6', // Teal
      '#f97316', // Orange
      '#3b82f6', // Blue
      '#8b5cf6'  // Purple
    ];
    ctx.fillStyle = gradientColors[index] || '#ff8800';
    const fillWidth = (barWidth * (dna.percentage || 0)) / 100;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
  });
}

async function drawBadges(ctx: CanvasRenderingContext2D, badges: Badge[], width: number, startY: number): Promise<void> {
  // Section title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Collected Badges', 40, startY);
  
  // Badge grid - smaller and more compact
  const badgeSize = 40;
  const badgeSpacing = 15;
  const badgesPerRow = 8;
  const maxBadges = 16;
  
  const displayedBadges = badges.slice(0, maxBadges);
  
  for (let index = 0; index < displayedBadges.length; index++) {
    const badge = displayedBadges[index];
    const row = Math.floor(index / badgesPerRow);
    const col = index % badgesPerRow;
    
    const x = 40 + col * (badgeSize + badgeSpacing);
    const y = startY + 30 + row * (badgeSize + badgeSpacing);
    
    // Badge background with rounded corners effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y, badgeSize, badgeSize);
    
    // Badge image
    if (badge.image) {
      try {
        const img = await loadImage(badge.image);
        ctx.drawImage(img, x, y, badgeSize, badgeSize);
      } catch (error) {
        console.warn('Could not load badge image:', error);
        // Draw default badge
        drawDefaultBadge(ctx, x, y, badgeSize, badge.name || 'Badge');
      }
    } else {
      drawDefaultBadge(ctx, x, y, badgeSize, badge.name || 'Badge');
    }
  }
}

function drawFooter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Footer branding like Q1 Recap
  const footerY = height - 60;
  
  // Left: @ForU_Identifi
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('@ForU_Identifi', 40, footerY);
  
  // Center: ForU IdentiFi logo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ForU IdentiFi', width / 2, footerY);
  
  // Right: ForU.ai
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('ForU.ai', width - 40, footerY);
  
  // Subtitle
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Your Social Identity Verified', width / 2, footerY + 25);
}

function drawDefaultAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Draw a modern avatar placeholder with gradient
  const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
  gradient.addColorStop(0, '#8b5cf6');
  gradient.addColorStop(1, '#6d28d9');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size/3}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('👤', x + size/2, y + size/2 + size/6);
}

function drawDefaultBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, name: string): void {
  // Draw a modern badge placeholder
  const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
  gradient.addColorStop(0, '#fbbf24');
  gradient.addColorStop(1, '#f59e0b');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, size, size);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size/4}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('🏆', x + size/2, y + size/2 + size/8);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
