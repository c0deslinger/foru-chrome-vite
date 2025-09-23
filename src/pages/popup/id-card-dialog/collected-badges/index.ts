// src/pages/popup/id-card-dialog/collected-badges/index.ts

/**
 * Draw Collected Badges card
 */
export function drawCollectedBadgesCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  // Card background
  ctx.fillStyle = '#1f1b2b';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Title
  ctx.fillStyle = '#ececf1';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Your Collected Badges', x + 15, y + 25);

  // Badge grid (2x2)
  const badgeSize = 30;
  const badgeSpacing = 10;
  const startX = x + 15;
  const startY = y + 40;
  const badgesPerRow = 2;

  // Draw badges with shimmer effect
  for (let i = 0; i < 4; i++) {
    const row = Math.floor(i / badgesPerRow);
    const col = i % badgesPerRow;
    const badgeX = startX + (col * (badgeSize + badgeSpacing));
    const badgeY = startY + (row * (badgeSize + badgeSpacing));

    if (i < 3) {
      // Draw badge with shimmer
      drawBadgeWithShimmer(ctx, badgeX, badgeY, badgeSize, i);
    } else {
      // Draw empty badge placeholder
      drawEmptyBadge(ctx, badgeX, badgeY, badgeSize);
    }
  }
}

/**
 * Draw badge with shimmer effect
 */
function drawBadgeWithShimmer(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, index: number): void {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
  const color = colors[index] || '#96ceb4';

  // Badge background
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);

  // Badge border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  // Badge icon (simple emoji)
  const icons = ['🏆', '⭐', '💎'];
  const icon = icons[index] || '🏅';
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(icon, x + size/2, y + size/2 + 5);

  // Shimmer effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 5);
  ctx.lineTo(x + size - 5, y + 5);
  ctx.stroke();
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
