// src/pages/popup/id-card-public-dialog/score-breakdown/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface MetricsData {
  engagement_score?: number;
  reach_score?: number;
  impression_score?: number;
  on_chain_score?: number;
  followers_count?: number;
  average_likes?: number;
  average_replies?: number;
  average_repost?: number;
  average_views?: number;
  badges_minted?: number;
  quest_completed?: number;
  referral_count?: number;
}

/**
 * Fetch metrics data from public API
 */
async function fetchPublicMetrics(username: string): Promise<MetricsData> {
  try {
    if (!username) {
      console.log("🔵 No username available for public metrics");
      return {};
    }

    console.log("🔵 About to fetch public scores for", username);
    const headers = await buildForuHeaders("GET", "", undefined);
    console.log("🟡 Headers built", headers);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    console.log("➡️ Fetching from", url);
    const resp = await fetch(url, { headers });
    console.log("⬅️ Status", resp.status);
    const json = await resp.json();
    console.log("📊 JSON", json);
    
    if (json.code === 200 && json.data) {
      const d = json.data;
      return {
        reach_score: d.reach_score || 0,
        engagement_score: d.engagement_score || 0,
        impression_score: d.impression_score || 0,
        on_chain_score: d.on_chain_score || 0,
        followers_count: d.followers_count || 0,
        average_likes: d.average_likes || 0,
        average_replies: d.average_replies || 0,
        average_repost: d.average_repost || 0,
        average_views: d.average_views || 0,
        badges_minted: d.badges_minted || 0,
        quest_completed: d.quest_completed || 0,
        referral_count: d.referral_count || 0,
      };
    }
  } catch (e) {
    console.error("🔴 Failed to fetch public impression scores", e);
  }

  return {};
}

/**
 * Draw IdentiFi Score Breakdown card with real API data
 */
export async function drawScoreBreakdownCard(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  username?: string
): Promise<void> {
  // Card background
  ctx.fillStyle = '#1f1b2b';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Title
  ctx.fillStyle = '#ececf1';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('IdentiFi Score Breakdown', x + 12, y + 16);

  // Fetch real data from API
  let metricsData: MetricsData = {};
  if (username) {
    try {
      metricsData = await fetchPublicMetrics(username);
      console.log('📊 Fetched public metrics data for ID card:', metricsData);
    } catch (error) {
      console.error('Error fetching metrics data for score breakdown:', error);
    }
  } else {
    console.log('📊 No username provided for metrics');
  }

  const reachScore = metricsData.reach_score || 0;
  const engagementScore = metricsData.engagement_score || 0;
  const onchainScore = metricsData.on_chain_score || 0;
  const avgLikes = metricsData.average_likes || 0;
  const avgReplies = metricsData.average_replies || 0;
  const avgReposts = metricsData.average_repost || 0;
  const badgesMinted = metricsData.badges_minted || 0;
  const questCompleted = metricsData.quest_completed || 0;
  const referralCount = metricsData.referral_count || 0;
  const followersCount = metricsData.followers_count || 0;
  const impressionScore = metricsData.impression_score || 0;

  // Score grid (2x2) - same layout as panel
  const scoreWidth = (width - 36) / 2;
  const scoreHeight = (height - 50) / 2;
  const scoreStartX = x + 12;
  const scoreStartY = y + 30;

  // Social
  drawScoreCard(ctx, scoreStartX, scoreStartY, scoreWidth, scoreHeight, 'Social', reachScore.toString(), `${followersCount} followers & ${impressionScore} impressions`);
  
  // Reputation
  drawScoreCard(ctx, scoreStartX + scoreWidth + 12, scoreStartY, scoreWidth, scoreHeight, 'Reputation', engagementScore.toString(), `${avgLikes} avg likes, ${avgReplies} avg replies, ${avgReposts} avg retweets`);
  
  // On Chain
  drawScoreCard(ctx, scoreStartX, scoreStartY + scoreHeight + 12, scoreWidth, scoreHeight, 'On Chain', onchainScore.toString(), `${badgesMinted} badges minted, ${questCompleted} quests solved, ${referralCount} referrals`);
  
  // Governance
  drawScoreCard(ctx, scoreStartX + scoreWidth + 12, scoreStartY + scoreHeight + 12, scoreWidth, scoreHeight, 'Governance', '-', 'Coming soon');
}

function drawScoreCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, value: string, details: string): void {
  // Score card background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Label
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 8, y + 12);

  // Value
  ctx.fillStyle = '#FFB005';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width/2, y + 30);

  // Details (wrapped text)
  ctx.fillStyle = '#8a8d93';
  ctx.font = '8px Arial';
  ctx.textAlign = 'left';
  
  const maxWidth = width - 16;
  const words = details.split(' ');
  let line = '';
  let lineY = y + 40;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x + 8, lineY);
      line = words[i] + ' ';
      lineY += 10;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x + 8, lineY);
}
