// src/pages/popup/id-card-dialog/score-breakdown/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

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
 * Fetch metrics data from authenticated API
 */
async function fetchAuthenticatedMetrics(accessToken: string): Promise<MetricsData> {
  try {
    if (!accessToken) {
      console.log("🔵 No access token available for authenticated metrics");
      return {};
    }

    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "", currentTimestamp);

    console.log("[ScoreBreakdown] Fetching authenticated metrics...");
    const metricsResponse = await fetch(
      `${API_BASE_URL}/v1/user/metrics`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
          Authorization: `Bearer ${accessToken}`,
          "x-foru-timestamp": currentTimestamp,
          "x-foru-signature": signature,
        },
      }
    );

    if (!metricsResponse.ok) {
      const errorBody = await metricsResponse.text();
      console.error(
        "[API Error] /v1/user/metrics failed:",
        metricsResponse.status,
        errorBody
      );
      throw new Error(
        `HTTP error! status: ${metricsResponse.status}. Response: ${errorBody}`
      );
    }
    const data = await metricsResponse.json();

    if (data && data.code === 200 && data.data) {
      console.log("[ScoreBreakdown] Authenticated metrics data fetched successfully");
      return data.data;
    } else {
      console.error(
        "Invalid or missing 'data' in /user/metrics response:",
        data
      );
    }
  } catch (error) {
    console.error("Error fetching authenticated user metrics data:", error);
    console.log("[ScoreBreakdown] Using default zero values due to error");
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
  accessToken?: string
): Promise<void> {
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
  ctx.fillText('IdentiFi Score Breakdown', x + 12, y + 20);

  // Fetch real data from API
  let metricsData: MetricsData = {};
  if (accessToken) {
    try {
      metricsData = await fetchAuthenticatedMetrics(accessToken);
    } catch (error) {
      console.error('Error fetching metrics data for score breakdown:', error);
    }
  }

  // Use real data or fallback to default values
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

/**
 * Draw individual score card (grid layout)
 */
function drawScoreCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, value: string, details: string): void {
  // Card background
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Label
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), x + width/2, y + 12);

  // Value
  ctx.fillStyle = '#ececf1';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(value, x + width/2, y + 32);

  // Details (wrapped text)
  ctx.fillStyle = '#aeb0b6';
  ctx.font = '8px Arial';
  const words = details.split(' ');
  let line = '';
  let lineY = y + 45;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > width - 8 && i > 0) {
      ctx.fillText(line, x + width/2, lineY);
      line = words[i] + ' ';
      lineY += 10;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x + width/2, lineY);
}
