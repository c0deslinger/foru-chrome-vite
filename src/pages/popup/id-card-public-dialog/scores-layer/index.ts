// src/pages/popup/id-card-public-dialog/scores-layer/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';
import { extractTwitterProfileData } from '../profile/index.js';

/**
 * Scores Layer - Layer 4 (Top layer)
 * Handles loading Anton font and drawing scores with specific positioning
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

export async function loadAntonFont(): Promise<void> {
  try {
    // Load Anton font from Google Fonts
    const font = new FontFace('Anton', 'url(https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm0K0.ttf)');
    await font.load();
    document.fonts.add(font);
    console.log('✅ Anton font loaded successfully');
  } catch (error) {
    console.error('❌ Error loading Anton font:', error);
  }
}

async function getIdentifiScore(username: string): Promise<number> {
  try {
    if (!username) {
      console.log("🔵 No username available for IdentiFi score");
      return 0;
    }

    console.log("🔵 About to fetch IdentiFi score for", username);
    const headers = await buildForuHeaders("GET", "", undefined);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    const resp = await fetch(url, { headers });
    const json = await resp.json();
    
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

async function fetchPublicMetrics(username: string): Promise<any> {
  try {
    if (!username) {
      console.log("🔵 No username available for public metrics");
      return {};
    }

    console.log("🔵 About to fetch public scores for", username);
    const headers = await buildForuHeaders("GET", "", undefined);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    const resp = await fetch(url, { headers });
    const json = await resp.json();
    
    if (json.code === 200 && json.data) {
      const d = json.data;
      return {
        reach_score: d.reach_score || 0,
        engagement_score: d.engagement_score || 0,
        impression_score: d.impression_score || 0,
        on_chain_score: d.on_chain_score || 0,
        followers_count: d.followers_count || 0,
      };
    }
  } catch (e) {
    console.error("🔴 Failed to fetch public metrics", e);
  }

  return {};
}

export async function drawScoresLayer(
  ctx: CanvasRenderingContext2D, 
  cardWidth: number, 
  data: IdCardPublicData
): Promise<void> {
  try {
    // Ensure Anton font is loaded before drawing
    await document.fonts.ready;
    
    // Get Twitter profile data
    const twitterProfileData = extractTwitterProfileData();
    const username = twitterProfileData?.twitter_account?.username || data.username;

    if (!username) {
      console.log('⚠️ No username available for scores');
      return;
    }

    // Fetch scores
    const identifiScore = await getIdentifiScore(username);
    const metricsData = await fetchPublicMetrics(username);
    
    const socialScore = metricsData.reach_score || 0;
    const reputationScore = metricsData.engagement_score || 0;
    const followersCount = metricsData.followers_count || 0;
    const impressionScore = metricsData.impression_score || 0;

    // Configure text properties
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. IdentiFi Score - center X, Y 1295+55, size 92px
    ctx.font = '400 92px Anton, Arial, sans-serif';
    const formattedIdentifiScore = Math.round(identifiScore).toLocaleString();
    ctx.fillText(formattedIdentifiScore, cardWidth / 2, 1295 + 55);

    // Debug: Measure text width to ensure it's not being clipped
    const identifiTextMetrics = ctx.measureText(formattedIdentifiScore);

    // 2. Social Score - X 300, Y 1503+50, size 78px
    ctx.font = '400 78px Anton, Arial, sans-serif';
    const formattedSocialScore = socialScore;
    ctx.fillText(formattedSocialScore, 300, 1503 + 50);

    // Debug: Measure text width
    const socialTextMetrics = ctx.measureText(formattedSocialScore);
    console.log(`📏 Social text width: ${socialTextMetrics.width}px`);

    // 3. Reputation Score - X 780, Y 1503+50, size 78px
    ctx.font = '400 78px Anton, Arial, sans-serif';
    const formattedReputationScore = reputationScore;
    ctx.fillText(formattedReputationScore, 780, 1503 + 50);

    // Debug: Measure text width
    const reputationTextMetrics = ctx.measureText(formattedReputationScore);
    console.log(`📏 Reputation text width: ${reputationTextMetrics.width}px`);

    // 4. Follower Count - X 300, Y 1771, size 78px
    ctx.font = '400 78px Anton, Arial, sans-serif';
    const formattedFollowersCount = followersCount; // No rounding needed
    ctx.fillText(formattedFollowersCount, 300, 1771);

    // Debug: Measure text width
    const followersTextMetrics = ctx.measureText(formattedFollowersCount);
    console.log(`📏 Followers text width: ${followersTextMetrics.width}px`);

    // 5. Impression Score - X 780, Y 1779, size 78px
    ctx.font = '400 78px Anton, Arial, sans-serif';
    const formattedImpressionScore = impressionScore; // No rounding needed
    ctx.fillText(formattedImpressionScore, 780, 1779);

    // Debug: Measure text width
    const impressionTextMetrics = ctx.measureText(formattedImpressionScore);

  } catch (error) {
    console.error('❌ Error drawing scores layer:', error);
  }
}
