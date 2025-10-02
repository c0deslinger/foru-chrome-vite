// src/inject/score_credibility.ts

console.log("[ForU Score Credibility] Script loading...");

declare global {
  interface Window {
    CryptoJS: any;
    foruMetricsUtils: {
      fetchUserMetrics: (username: string, forceRefresh?: boolean) => Promise<{
        identifi_score: number;
        reach_score: number;
        impression_score: number;
        engagement_score: number;
        on_chain_score: number;
      }>;
      getIdentifiScore: (username: string) => Promise<number>;
      generateForuSignature: (method: string, payload: any, timestamp: string) => string;
    };
    badgeDialog: any;
    dnaDialog: any;
  }
}

import { API_BASE_URL } from '../../../lib/crypto-utils.js';
import { httpClient } from '../../../lib/http-client.js';
import { renderBadges, createBadgeDialog } from '../collected_badges/index.js';
import { getBodyBackgroundColor, isLightColor } from '../../../lib/body-color-utils.js';

/**
 * Get dynamic font color based on body background color
 * If background is light, return black; if dark, return white
 */
function getDynamicFontColor(): string {
  try {
    const bodyColor = getBodyBackgroundColor();
    const isLight = isLightColor(bodyColor);
    const fontColor = isLight ? '#000000' : 'rgb(231,233,237)';
    
    console.log('[ForU Score Credibility] Body color:', bodyColor, 'Is light:', isLight, 'Font color:', fontColor);
    return fontColor;
  } catch (error) {
    console.warn('[ForU Score Credibility] Error getting dynamic font color:', error);
    return 'rgb(231,233,237)'; // fallback to light gray
  }
}

/**
 * Local fallback function to fetch metrics
 */
async function fetchUserMetricsLocal(username: string): Promise<any> {
  const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;

  try {
    const json = await httpClient.get(url, {
      requireAuth: true,
      cache: true,
      cacheTTL: 600000 // 10 minutes cache for user metrics
    });

    if (json.data) {
      return {
        identifi_score: json.data.identifi_score || 0,
        reach_score: json.data.reach_score || 0,
        impression_score: json.data.impression_score || 0,
        engagement_score: json.data.engagement_score || 0,
        on_chain_score: json.data.on_chain_score || 0,
      };
    }
  } catch (error) {
    // Ignore network errors silently for cleaner console
    if (error instanceof Error && !error.message.includes('404')) {
      console.error(
        `[ForU Score Credibility Local] API error for ${username}:`,
        error.message
      );
    }
  }

  return {
    identifi_score: 0,
    reach_score: 0,
    impression_score: 0,
    engagement_score: 0,
    on_chain_score: 0,
  };
}

/**
 * Remove previously inserted elements
 */
function removeExistingProfileScores() {
  const el = document.getElementById("foru-profile-injection-container");
  if (el) el.remove();
}


/**
 * Insert live metrics into profile, then badges
 */
function insertCustomProfileScores() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const username = parts[0] || "";

  const invalid = [
    "home", "explore", "notifications", "messages", "compose", 
    "settings", "i", "search", "connect_people"
  ];
  if (!username || invalid.includes(username)) {
    removeExistingProfileScores();
    return;
  }

  removeExistingProfileScores();

  const obs = new MutationObserver((_, o) => {
    const followersLink = document.querySelector('a[href*="/verified_followers"]');

    if (!followersLink) {
      return;
    }

    console.log("[ForU Score] Found followers link:", followersLink);
    
    const followerStatsContainer = followersLink.parentElement;
    if (!followerStatsContainer || !followerStatsContainer.parentElement) {
      console.log("[ForU Score] Could not find a suitable parent container for injection.");
      return;
    }

    if (document.getElementById("foru-profile-injection-container")) {
        o.disconnect();
        return;
    }

    o.disconnect();

    const fetchMetrics = window.foruMetricsUtils?.fetchUserMetrics || fetchUserMetricsLocal;

    fetchMetrics(username).then((metrics: any) => {
      if (document.getElementById("foru-profile-injection-container")) return;

      const {
        engagement_score, reach_score, impression_score, on_chain_score,
      } = metrics;

      // Get dynamic font color based on body background
      const dynamicFontColor = getDynamicFontColor();

      const foruContainer = document.createElement("div");
      foruContainer.id = "foru-profile-injection-container";
      Object.assign(foruContainer.style, {
          marginTop: "12px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
      });

      const metricsSpan = document.createElement("span");
      metricsSpan.id = "foru-social-cred-stats";
      Object.assign(metricsSpan.style, {
        display: "flex", flexWrap: "wrap", alignItems: "center",
        gap: "16px", color: "rgb(110,118,125)", fontSize: "14px",
        fontWeight: "400", lineHeight: "16px",
      });
      // metricsSpan.innerHTML = `
      //   <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
      //     <span style="font-weight:700;color:${dynamicFontColor};">${reach_score.toLocaleString()}</span>Social
      //   </span>
      //   <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
      //     <span style="font-weight:700;color:${dynamicFontColor};">${engagement_score.toLocaleString()}</span>Reputation
      //   </span>
      //   <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
      //     <span style="font-weight:700;color:${dynamicFontColor};">${impression_score.toLocaleString()}</span>Impression
      //   </span>
      //   <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
      //     <span style="font-weight:700;color:${dynamicFontColor};">${on_chain_score.toLocaleString()}</span>On Chain
      //   </span>
      // `;
      // Add tooltip styles
      const tooltipStyles = `
        .foru-metric-tooltip {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-left: 4px;
          cursor: help;
        }
        .foru-metric-tooltip-icon {
          content: 'i';
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(110, 118, 125, 0.3);
          color: ${dynamicFontColor};
          font-size: 10px;
          font-weight: bold;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        .foru-metric-tooltip:hover .foru-metric-tooltip-icon {
          opacity: 1;
          background: rgba(110, 118, 125, 0.5);
        }
        .foru-metric-tooltip::after {
          content: attr(data-tooltip);
          position: fixed !important;
          top: var(--tooltip-top, auto) !important;
          left: var(--tooltip-left, auto) !important;
          transform: translateX(-50%) !important;
          background: linear-gradient(135deg, #68666b 0%, #5a5960 100%) !important;
          color: white !important;
          padding: 8px !important;
          border-radius: 12px !important;
          font-size: 12px !important;
          font-weight: normal !important;
          white-space: pre-line !important;
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.2s ease !important;
          z-index: 2147483647 !important;
          min-width: 280px !important;
          max-width: 400px !important;
          text-align: left !important;
          line-height: 1.2 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(10px) !important;
        }
        .foru-metric-tooltip::before {
          content: '' !important;
          position: fixed !important;
          top: var(--arrow-top, auto) !important;
          left: var(--arrow-left, auto) !important;
          transform: var(--arrow-transform, translateX(-50%)) !important;
          width: 0 !important;
          height: 0 !important;
          border-left: 8px solid transparent !important;
          border-right: 8px solid transparent !important;
          border-bottom: 8px solid #68666b !important;
          opacity: 0 !important;
          transition: opacity 0.2s ease !important;
          z-index: 2147483647 !important;
        }
        .foru-metric-tooltip:hover::before,
        .foru-metric-tooltip:hover::after {
          opacity: 1 !important;
        }
      `;
      
      // Add styles to head if not already present
      if (!document.getElementById('foru-tooltip-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'foru-tooltip-styles';
        styleEl.textContent = tooltipStyles;
        document.head.appendChild(styleEl);
      }

      // Add JavaScript for dynamic tooltip positioning
      const addTooltipPositioning = () => {
        const tooltips = document.querySelectorAll('.foru-metric-tooltip');
        tooltips.forEach(tooltip => {
          tooltip.addEventListener('mouseenter', (e) => {
            const target = e.target as HTMLElement;
            const rect = target.getBoundingClientRect();
            
            // Calculate tooltip position
            const tooltipTop = rect.bottom + 8;
            const tooltipLeft = rect.left + (rect.width / 2);
            
            // Determine metric type from parent text content
            const parentSpan = target.closest('span');
            const metricText = parentSpan?.textContent || '';
            
            let arrowLeft, arrowTransform;
            
            if (metricText.includes('Social')) {
              // Social: arrow on left side of tooltip
              arrowLeft = tooltipLeft - 180; // 180px from center to left
              arrowTransform = 'translateX(0)';
            } else if (metricText.includes('Governance')) {
              // Governance: arrow on right side of tooltip  
              arrowLeft = tooltipLeft + 180; // 180px from center to right
              arrowTransform = 'translateX(-100%)';
            } else {
              // Reputation, On Chain: arrow in center
              arrowLeft = tooltipLeft;
              arrowTransform = 'translateX(-50%)';
            }
            
            const arrowTop = rect.bottom + 2;
            
            // Apply positioning via CSS custom properties
            target.style.setProperty('--tooltip-top', `${tooltipTop}px`);
            target.style.setProperty('--tooltip-left', `${tooltipLeft}px`);
            target.style.setProperty('--arrow-top', `${arrowTop}px`);
            target.style.setProperty('--arrow-left', `${arrowLeft}px`);
            target.style.setProperty('--arrow-transform', arrowTransform);
          });
        });
      };

      metricsSpan.innerHTML = `
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:${dynamicFontColor};">${reach_score.toLocaleString()}</span>Social
          <span class="foru-metric-tooltip" data-tooltip="📊 Social Reach Score\n
Quantifies your influence on X/Twitter using AI signal from reach, engagement rate, and post frequency. Weighted by recency + virality.">
            <span class="foru-metric-tooltip-icon">i</span>
          </span>
        </span>
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:${dynamicFontColor};">${engagement_score.toLocaleString()}</span>Reputation
          <span class="foru-metric-tooltip" data-tooltip="🎯 Reputation Score

Assesses semantic tone, trust score, and content alignment with credible traits. Driven by NLP sentiment + longitudinal behavior tracking.">
            <span class="foru-metric-tooltip-icon">i</span>
          </span>
        </span>
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:${dynamicFontColor};">${on_chain_score.toLocaleString()}</span>On Chain
          <span class="foru-metric-tooltip" data-tooltip="⛓️ On-Chain Score

Calculates your on-chain footprint from quest completions, badge mints, and wallet history. Cross-chain normalized. Built On AI-DiD.">
            <span class="foru-metric-tooltip-icon">i</span>
          </span>
        </span>
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:${dynamicFontColor};">-</span>Governance
          <span class="foru-metric-tooltip" data-tooltip="🏛️ Governance Score (Coming Soon)
          
Will track participation in DAO and protocol governance. Based on voting frequency, proposal depth, and alignment with past behavior.">
            <span class="foru-metric-tooltip-icon">i</span>
          </span>
        </span>
      `;
      
      foruContainer.appendChild(metricsSpan);
      renderBadges(foruContainer, username);
      
      followerStatsContainer.parentElement?.insertBefore(foruContainer, followerStatsContainer.nextSibling);
      
      // Apply tooltip positioning after DOM insertion
      setTimeout(() => {
        addTooltipPositioning();
      }, 100);
      
      console.log("[ForU Score] Successfully injected metrics and badges.");
    });
  });

  obs.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (!document.getElementById("foru-profile-injection-container")) {
        console.log("[ForU Score] Timed out. Could not find a suitable injection point ('/followers' link) on this page.");
    }
    obs.disconnect();
  }, 10000);
}

// re-run on navigation
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "urlChanged") {
    insertCustomProfileScores();
  }
});

// initial run
insertCustomProfileScores();

// Listen for messages from sidepanel to show badge dialog
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'showBadgeDialog') {
    console.log('Showing badge dialog from sidepanel message');
    const badge = message.badge;
    
    if (window.badgeDialog) {
      window.badgeDialog.show(badge);
      sendResponse({ success: true, message: 'Badge dialog shown' });
    } else {
      console.error('BadgeDialog not available in content script');
      createBadgeDialog(badge);
      sendResponse({ success: true, message: 'Badge dialog shown manually' });
    }
    return true;
  }
  
  if (message.action === 'showDnaDialog') {
    console.log('Showing DNA dialog from sidepanel message');
    const dna = message.dna;
    const userProfileData = message.userProfileData || null;
    
    if (window.dnaDialog) {
      window.dnaDialog.show(dna, userProfileData);
      sendResponse({ success: true, message: 'DNA dialog shown' });
    } else {
      console.error('DnaDialog not available in content script');
      sendResponse({ success: false, message: 'DnaDialog not available' });
    }
    return true;
  }
  
        if (message.action === 'ping') {
          // Respond to ping to indicate content script is ready
          console.log('Content script ping received');
          sendResponse({ success: true, message: 'Content script ready' });
          return true;
        }

        if (message.action === 'showIdCardDialog') {
          console.log('Showing ID card dialog from sidepanel message');
          const idCardData = message.idCardData || {};
          
          if (window.idCardDialog) {
            window.idCardDialog.show(idCardData);
            sendResponse({ success: true, message: 'ID card dialog shown' });
          } else {
            console.error('IdCardDialog not available in content script');
            sendResponse({ success: false, message: 'IdCardDialog not available' });
          }
          return true;
        }

        if (message.action === 'showIdCardPublicDialog') {
          console.log('Showing ID card public dialog from sidepanel message');
          const idCardData = message.idCardData || {};
          
          if (window.idCardPublicDialog) {
            window.idCardPublicDialog.show(idCardData);
            sendResponse({ success: true, message: 'ID card public dialog shown' });
          } else {
            console.error('IdCardPublicDialog not available in content script');
            sendResponse({ success: false, message: 'IdCardPublicDialog not available' });
          }
          return true;
        }
});

export default insertCustomProfileScores;
