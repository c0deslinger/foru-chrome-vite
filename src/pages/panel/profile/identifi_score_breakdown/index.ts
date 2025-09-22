// src/profile/identifi_score_breakdown/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

/**
 * IdentiFi Score Breakdown Component
 * Renders the score grid with social, reputation, on-chain, and governance scores
 */
export async function renderIdentifiScoreBreakdown(username: string, followersCount: string, impressionScore: number): Promise<string> {
  let reachScore = 0,
    engagementScore = 0,
    avgLikes = 0,
    avgReplies = 0,
    avgReposts = 0,
    avgViews = 0;
  let badgesMinted = 0,
    questCompleted = 0,
    referralCount = 0;
  let onchainScore = 0;
    
  try {
    console.log("🔵 About to fetch scores for", username);
    const headers = await buildForuHeaders("GET", "", null);
    console.log("🟡 Headers built", headers);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    console.log("➡️ Fetching from", url);
    const resp = await fetch(url, { headers });
    console.log("⬅️ Status", resp.status);
    const json = await resp.json();
    console.log("📊 JSON", json);
    if (json.code === 200 && json.data) {
      const d = json.data;
      reachScore = d.reach_score || 0;
      engagementScore = d.engagement_score || 0;
      impressionScore = d.impression_score || 0;
      onchainScore = d.on_chain_score || 0;
      avgLikes = d.average_likes || 0;
      avgReplies = d.average_replies || 0;
      avgReposts = d.average_repost || 0;
      avgViews = d.average_views || 0;
      badgesMinted = d.badges_minted || 0;
      questCompleted = d.quest_completed || 0;
      referralCount = d.referral_count || 0;
    }
  } catch (e) {
    console.error("🔴 Failed to fetch impression scores", e);
  }

  // --- Assemble HTML ---
  const html = `
    <h3>IdentiFi Score Breakdown</h3>
    <div class="score-grid">
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Social</div>
        <div class="value">${reachScore}</div>
        <div class="details">${followersCount} followers & ${impressionScore} impressions</div>
      </div>
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Reputation</div>
        <div class="value">${engagementScore}</div>
        <div class="details">${avgLikes} avg likes, ${avgReplies} avg replies, ${avgReposts} avg retweets</div>
      </div>
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">On Chain</div>
        <div class="value">${onchainScore}</div>
        <div class="details">${badgesMinted} badges minted, ${questCompleted} quests solved, ${referralCount} referrals</div>
      </div>
      <div class="score-card" style="cursor: not-allowed; opacity: 0.6;">
        <div class="label">Governance</div>
        <div class="value">-</div>
        <div class="details">Coming soon</div>
      </div>
    </div>
  `;

  return html;
}

// Expose function so it can be called from other components
(window as any).renderIdentifiScoreBreakdown = renderIdentifiScoreBreakdown;
