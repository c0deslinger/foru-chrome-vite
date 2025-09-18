// src/user/user_metrics_card/index.ts

import {
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
} from "../../../../lib/crypto-utils.js";

import { showCustomNotification } from "../user_tab/index.js";

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

interface UserProfileData {
  name?: string;
  email?: string;
  avatar?: string;
  [key: string]: any;
}

/**
 * Merender bagian metrik pengguna, mengambil data dari API /v1/user/metrics.
 * @param {HTMLElement} targetContainer - Elemen DOM tempat metrik card akan dirender.
 * @param {string} accessToken - Token akses untuk otentikasi API.
 * @param {boolean} forceRefresh - Force refresh data.
 * @param {Object} userProfileData - Data profil pengguna untuk DNA dialog.
 */
async function renderUserMetricsCard(
  targetContainer: HTMLElement,
  accessToken: string,
  forceRefresh = false,
  userProfileData: UserProfileData | null = null
): Promise<void> {
  
  if (!targetContainer) {
    console.error("Target container for user metrics card is not provided.");
    return;
  }

  // Tampilkan shimmer atau loading state sementara
  targetContainer.innerHTML = `
        <h3 style="margin-top:16px;">IdentiFi Score Breakdown</h3>
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

    console.log("[UserMetrics] Attempting to fetch metrics...");
    console.log("[UserMetrics] Headers:", {
      accept: "application/json",
      "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
      Authorization: `Bearer ${accessToken}`,
      "x-foru-timestamp": currentTimestamp,
      "x-foru-signature": signature,
    });

    // Always fetch fresh metrics data
    console.log("[UserMetrics] Fetching fresh metrics data...");
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
      console.log("[UserMetrics] Fresh metrics data fetched successfully");
    } else {
      console.error(
        "Invalid or missing 'data' in /user/metrics response:",
        data
      );
    }

    // Badges data will be fetched separately by user_badges_section.js
  } catch (error) {
    console.error("Error fetching user metrics data:", error);
    // Don't show notification, just use default zero values
    console.log("[UserMetrics] Using default zero values due to error");
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

  // Fetch Digital DNA data from API
  let digitalDnaData: any[] = [];
  let isDnaEmpty = false;

   // --- Helper: HTML encode function ---
   function htmlEncode(str: string): string {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;") 
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  try {
    console.log(`[DigitalDNA] Fetching DNA data from /v1/user/persona/dna`);
    const dnaTimestamp = Date.now().toString();
    const dnaSignature = generateForuSignature("GET", "", dnaTimestamp);
    const dnaResponse = await fetch(
      `${API_BASE_URL}/v1/user/persona/dna`,
      {
        headers: {
          accept: "application/json",
          "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
          "x-foru-timestamp": dnaTimestamp,
          "x-foru-signature": dnaSignature,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (dnaResponse.ok) {
      const dnaJson = await dnaResponse.json();
      console.log("[DigitalDNA] API Response:", dnaJson);
      if (dnaJson.code === 200 && dnaJson.data && dnaJson.data.length > 0) {
        // Take top 4 items, no rank display
        digitalDnaData = dnaJson.data.slice(0, 4).map((item: any, index: number) => ({
          id: `dna-${index}`,
          title: item.dna?.title || "Unknown",
          percentage: Math.round(item.percentage || 0),
          image: item.dna?.image || null,
          created_at: `${item.created_at}` || "Unknown",
          tweet_highlight: htmlEncode(item.tweet_highlight) || "Unknown",
          description: htmlEncode(item.dna?.description) || "Unknown",
        }));
        console.log(`[DigitalDNA] Loaded ${digitalDnaData.length} DNA items`);
      } else {
        console.log("[DigitalDNA] No DNA data available");
        isDnaEmpty = true;
      }
    } else if (dnaResponse.status === 404) {
      console.log("[DigitalDNA] 404 - No DNA data found for user");
      isDnaEmpty = true;
    } else {
      console.error("[DigitalDNA] API error:", dnaResponse.status);
      isDnaEmpty = true;
    }
  } catch (error) {
    console.error("[DigitalDNA] Error fetching DNA data:", error);
    isDnaEmpty = true;
  }

  // Badges will be rendered separately by user_badges_section.js

  // Bersihkan container sebelum merender data
  targetContainer.innerHTML = ""; // Menggunakan targetContainer

  // Always render all components, even with zero values
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

    <h3>Your Digital DNA</h3>
    ${
      isDnaEmpty
        ? `
      <div class="digital-dna-empty">
        <div class="dna-empty-icon">
          <img src="${chrome.runtime.getURL(
            "images/dna_molecule.png"
          )}" alt="DNA Molecule" style="width:75px;height:82px;object-fit:contain;">
        </div>
        <div class="dna-empty-title">Your Digital DNA Is Empty</div>
        <div class="dna-empty-description">
          Connect your socials and wallet to start revealing your identity traits — from interests to on-chain activity.
        </div>
      </div>
    `
        : `
      <div class="digital-dna-grid">
        ${digitalDnaData
          .map((dna) => {
            // Use DNA molecule icon if image is null/empty, otherwise use the API image
            const imageUrl = dna.image
              ? dna.image
              : chrome.runtime.getURL("images/dna_molecule.png");

            return `
              <div class="dna-card ${dna.id}" data-dna='${JSON.stringify(dna)}' style="cursor: pointer;">
                <div class="dna-header">
                  <div class="dna-icon">
                    <img src="${imageUrl}" 
                         alt="${dna.title}" 
                         class="dna-shield-img"
                         data-fallback="${chrome.runtime.getURL("images/dna_molecule.png")}">
                  </div>
                  <div class="dna-title">${dna.title}</div>
                </div>
                <div class="dna-content">
                  <div class="dna-progress-container">
                    <div class="dna-progress">
                      <div class="dna-progress-bar ${dna.id}-bar" style="width: ${dna.percentage}%"></div>
                    </div>
                    <div class="dna-percentage">${dna.percentage}%</div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    }
  `;

  targetContainer.innerHTML = metricsHtml;
  
  // Add event listeners for image fallback
  const dnaImages = targetContainer.querySelectorAll('.dna-shield-img[data-fallback]') as NodeListOf<HTMLImageElement>;
  dnaImages.forEach(img => {
    img.addEventListener('error', function(this: HTMLImageElement) {
      const fallbackUrl = this.getAttribute('data-fallback');
      if (fallbackUrl && this.src !== fallbackUrl) {
        this.src = fallbackUrl;
      }
    });
  });

  // Add event listeners for DNA card clicks
  const dnaCards = targetContainer.querySelectorAll('.dna-card');
  console.log('Found', dnaCards.length, 'DNA cards in user tab');
  
  dnaCards.forEach((item, index) => {
    item.addEventListener('click', () => {
      console.log('DNA card clicked in user tab:', index);
      const dnaData = item.getAttribute('data-dna');
      if (dnaData) {
        try {
          const dna = JSON.parse(dnaData);
          console.log('DNA data from user tab:', dna);
          
          // Send message to content script to show DNA dialog on web page
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showDnaDialog',
                dna: dna,
                userProfileData: userProfileData // Pass userProfileData
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error sending message to content script:', chrome.runtime.lastError);
                } else {
                  console.log('Message sent to content script, response:', response);
                }
              });
            }
          });
        } catch (error) {
          console.error('Error parsing DNA data in user tab:', error);
        }
      } else {
        console.log('No DNA data found in user tab');
      }
    });
  });

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
}

export { renderUserMetricsCard };
