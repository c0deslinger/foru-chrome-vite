// src/pages/popup/id-card-dialog/score-breakdown/index.ts

/**
 * Draw IdentiFi Score Breakdown card
 */
export function drawScoreBreakdownCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
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
  ctx.fillText('IdentiFi Score Breakdown', x + 15, y + 25);

  // Score items
  const scoreItems = [
    { label: 'Social Proof', value: '2,450', color: '#ff6b6b' },
    { label: 'Engagement', value: '1,890', color: '#4ecdc4' },
    { label: 'Content Quality', value: '3,120', color: '#45b7d1' },
    { label: 'Network Value', value: '1,540', color: '#96ceb4' }
  ];

  const itemHeight = 25;
  const startY = y + 40;

  scoreItems.forEach((item, index) => {
    drawScoreItem(ctx, x + 15, startY + (index * itemHeight), width - 30, itemHeight, item);
  });
}

/**
 * Draw individual score item
 */
function drawScoreItem(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, item: any): void {
  // Label
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(item.label, x, y + 15);

  // Value
  ctx.fillStyle = item.color;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(item.value, x + width, y + 15);

  // Progress bar background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y + 18, width, 4);

  // Progress bar fill (simulate progress based on value)
  const maxValue = 4000; // Assuming max score is 4000
  const progress = Math.min(parseInt(item.value.replace(',', '')) / maxValue, 1);
  ctx.fillStyle = item.color;
  ctx.fillRect(x, y + 18, width * progress, 4);
}
