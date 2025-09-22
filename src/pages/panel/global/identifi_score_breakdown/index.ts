// src/pages/panel/global/identifi_score_breakdown/index.ts

import { buildForuHeaders, generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface IdentifiScoreBreakdownApiConfig {
  type: 'public' | 'authenticated';
  username?: string;
  accessToken?: string;
  followersCount?: string;
  impressionScore?: number;
}

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
 * Fetch metrics data from public API (for profile view)
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
 * Fetch metrics data from authenticated API (for user tab)
 */
async function fetchAuthenticatedMetrics(accessToken: string): Promise<MetricsData> {
  try {
    if (!accessToken) {
      console.log("🔵 No access token available for authenticated metrics");
      return {};
    }

    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "", currentTimestamp);

    console.log("[IdentifiScoreBreakdown] Attempting to fetch authenticated metrics...");
    console.log("[IdentifiScoreBreakdown] Headers:", {
      accept: "application/json",
      "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
      Authorization: `Bearer ${accessToken}`,
      "x-foru-timestamp": currentTimestamp,
      "x-foru-signature": signature,
    });

    // Always fetch fresh metrics data
    console.log("[IdentifiScoreBreakdown] Fetching fresh metrics data...");
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
      console.log("[IdentifiScoreBreakdown] Fresh authenticated metrics data fetched successfully");
      return data.data;
    } else {
      console.error(
        "Invalid or missing 'data' in /user/metrics response:",
        data
      );
    }
  } catch (error) {
    console.error("Error fetching authenticated user metrics data:", error);
    console.log("[IdentifiScoreBreakdown] Using default zero values due to error");
  }

  return {};
}

/**
 * Render score grid HTML
 */
function renderScoreGrid(metricsData: MetricsData, config: IdentifiScoreBreakdownApiConfig): string {
  const { type, followersCount, impressionScore } = config;
  
  // Use provided values or fall back to API data
  const reachScore = metricsData.reach_score || 0;
  const engagementScore = metricsData.engagement_score || 0;
  const finalImpressionScore = impressionScore || metricsData.impression_score || 0;
  const onchainScore = metricsData.on_chain_score || 0;
  
  const avgLikes = metricsData.average_likes || 0;
  const avgReplies = metricsData.average_replies || 0;
  const avgReposts = metricsData.average_repost || 0;
  const badgesMinted = metricsData.badges_minted || 0;
  const questCompleted = metricsData.quest_completed || 0;
  const referralCount = metricsData.referral_count || 0;
  
  // For public API, use provided followersCount, for authenticated use API data
  const finalFollowersCount = type === 'public' && followersCount 
    ? followersCount 
    : (metricsData.followers_count || 0);

  return `
    <div class="score-grid">
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Social</div>
        <div class="value">${reachScore}</div>
        <div class="details">${finalFollowersCount} followers & ${finalImpressionScore} impressions</div>
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
}

/**
 * Global IdentiFi Score Breakdown Component
 * Renders the score grid with social, reputation, on-chain, and governance scores
 * Supports both public (profile) and authenticated (user tab) API calls
 */
export async function renderIdentifiScoreBreakdown(config: IdentifiScoreBreakdownApiConfig): Promise<string> {
  const { type, username, accessToken } = config;
  
  // Fetch metrics data based on configuration
  let metricsData: MetricsData = {};
  
  if (type === 'public' && username) {
    metricsData = await fetchPublicMetrics(username);
  } else if (type === 'authenticated' && accessToken) {
    metricsData = await fetchAuthenticatedMetrics(accessToken);
  } else {
    console.error('Invalid configuration for renderIdentifiScoreBreakdown:', config);
    return '<h3>IdentiFi Score Breakdown</h3>' + renderScoreGrid({}, config);
  }

  // Render HTML
  const html = `
    <h3>IdentiFi Score Breakdown</h3>
    ${renderScoreGrid(metricsData, config)}
  `;

  return html;
}

/**
 * Render IdentiFi Score Breakdown for user tab (authenticated context)
 * This function is specifically for the user tab context where we render into a container
 */
export async function renderIdentifiScoreBreakdownForUserTab(
  container: HTMLElement, 
  accessToken: string, 
  forceRefresh = false
): Promise<void> {
  if (!container || !accessToken) {
    console.error("Target container or access token for IdentiFi score breakdown is not provided.");
    return;
  }

  // Show shimmer loading state
  container.innerHTML = `
    <h3>IdentiFi Score Breakdown</h3>
    <div class="score-grid">
      <div class="shimmer score-card" style="height: 60px;"></div>
      <div class="shimmer score-card" style="height: 60px;"></div>
      <div class="shimmer score-card" style="height: 60px;"></div>
      <div class="shimmer score-card" style="height: 60px;"></div>
    </div>
  `;

  try {
    const metricsData = await fetchAuthenticatedMetrics(accessToken);
    const scoreHtml = await renderIdentifiScoreBreakdown({
      type: 'authenticated',
      accessToken
    });
    
    container.innerHTML = scoreHtml;

    // Add tooltip functionality
    (window as any).showTooltip = function(message: string, event: Event) {
      // Remove existing tooltip
      const existingTooltip = document.querySelector('.foru-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'foru-tooltip';
      tooltip.textContent = message;
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        max-width: 250px;
        z-index: 10000;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;

      // Position tooltip
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

      // Add to body
      document.body.appendChild(tooltip);

      // Remove tooltip after 3 seconds
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.remove();
        }
      }, 3000);
    };

    console.log("[IdentifiScoreBreakdown] Score breakdown rendered for user tab");
  } catch (error) {
    console.error("Error rendering IdentiFi score breakdown for user tab:", error);
    // Render with default values on error
    container.innerHTML = '<h3>IdentiFi Score Breakdown</h3>' + renderScoreGrid({}, { type: 'authenticated', accessToken });
  }
}

// Expose functions so they can be called from other components
(window as any).renderIdentifiScoreBreakdown = renderIdentifiScoreBreakdown;
(window as any).renderIdentifiScoreBreakdownForUserTab = renderIdentifiScoreBreakdownForUserTab;
