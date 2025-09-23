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
      metricsSpan.innerHTML = `
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:rgb(231,233,237);">${reach_score.toLocaleString()}</span>Social
        </span>
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:rgb(231,233,237);">${engagement_score.toLocaleString()}</span>Reputation
        </span>
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:rgb(231,233,237);">${impression_score.toLocaleString()}</span>Impression
        </span>
        <span style="display: flex; align-items: center; white-space: nowrap; gap: 4px;">
          <span style="font-weight:700;color:rgb(231,233,237);">${on_chain_score.toLocaleString()}</span>On Chain
        </span>
      `;
      
      foruContainer.appendChild(metricsSpan);
      renderBadges(foruContainer, username);
      
      followerStatsContainer.parentElement?.insertBefore(foruContainer, followerStatsContainer.nextSibling);
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
});

export default insertCustomProfileScores;
