// src/pages/panel/user/authenticated/identifi_score_breakdown/index.ts

import {
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
} from "../../../../../lib/crypto-utils";

interface MetricsData {
  engagement_score?: number;
  reach_score?: number;
  impression_score?: number;
  on_chain_score?: number;
  followers_count?: number;
  average_likes?: number;
  average_replies?: number;
  average_repost?: number;
  badges_minted?: number;
  quest_completed?: number;
  referral_count?: number;
}

/**
 * Renders the IdentiFi Score Breakdown section
 * @param {HTMLElement} targetContainer - Element where the scores will be rendered
 * @param {string} accessToken - Access token for API authentication
 * @param {boolean} forceRefresh - Force refresh data
 */
async function renderIdentifiScoreBreakdown(
  targetContainer: HTMLElement,
  accessToken: string,
  forceRefresh = false
): Promise<void> {
  
  if (!targetContainer) {
    console.error("Target container for IdentiFi score breakdown is not provided.");
    return;
  }

  // Show shimmer loading state
  targetContainer.innerHTML = `
    <h3>IdentiFi Score Breakdown</h3>
    <div class="score-grid">
      <div class="shimmer score-card" style="height: 60px;"></div>
      <div class="shimmer score-card" style="height: 60px;"></div>
      <div class="shimmer score-card" style="height: 60px;"></div>
      <div class="shimmer score-card" style="height: 60px;"></div>
    </div>
  `;

  let metricsData: MetricsData | null = null;

  try {
    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "", currentTimestamp);

    console.log("[IdentifiScoreBreakdown] Attempting to fetch metrics...");
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
      metricsData = data.data;
      console.log("[IdentifiScoreBreakdown] Fresh metrics data fetched successfully");
    } else {
      console.error(
        "Invalid or missing 'data' in /user/metrics response:",
        data
      );
    }
  } catch (error) {
    console.error("Error fetching user metrics data:", error);
    // Don't show notification, just use default zero values
    console.log("[IdentifiScoreBreakdown] Using default zero values due to error");
  }

  // Use default zero values if metrics data is null
  if (!metricsData) {
    metricsData = {
      engagement_score: 0,
      reach_score: 0,
      impression_score: 0,
      on_chain_score: 0,
      followers_count: 0,
      average_likes: 0,
      average_replies: 0,
      average_repost: 0,
      badges_minted: 0,
      quest_completed: 0,
      referral_count: 0,
    };
  }

  // Render score breakdown
  const metricsHtml = `
    <h3>IdentiFi Score Breakdown</h3>
    <div class="score-grid">
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Social</div>
        <div class="value">${metricsData.reach_score || 0}</div>
        <div class="details">${metricsData.followers_count || 0} followers & ${metricsData.impression_score || 0} impressions</div>
      </div>
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Reputation</div>
        <div class="value">${metricsData.engagement_score || 0}</div>
        <div class="details">${metricsData.average_likes || 0} avg likes, ${metricsData.average_replies || 0} avg replies, ${metricsData.average_repost || 0} avg retweets</div>
      </div>
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">On Chain</div>
        <div class="value">${metricsData.on_chain_score || 0}</div>
        <div class="details">${metricsData.badges_minted || 0} badges minted, ${metricsData.quest_completed || 0} quests solved, ${metricsData.referral_count || 0} referrals</div>
      </div>
      <div class="score-card" style="cursor: not-allowed; opacity: 0.6;">
        <div class="label">Governance</div>
        <div class="value">-</div>
        <div class="details">Coming soon</div>
      </div>
    </div>
  `;

  targetContainer.innerHTML = metricsHtml;

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

  console.log("[IdentifiScoreBreakdown] Score breakdown rendered");
}

export { renderIdentifiScoreBreakdown };
