// src/inject/score_credibility.ts

console.log("[ForU Score Credibility] Script loading...");

declare global {
  interface Window {
    CryptoJS: any;
    foruMetricsUtils: any;
    badgeDialog: any;
    dnaDialog: any;
  }
}

import { generateForuSignature, API_BASE_URL, NEXT_PUBLIC_API_PRIVATE_KEY } from '../../../lib/crypto-utils.js';

// Use different variable names to avoid conflict
const API_BASE_URL_CRED = API_BASE_URL;
const NEXT_PUBLIC_API_PRIVATE_KEY_CRED = NEXT_PUBLIC_API_PRIVATE_KEY;

/**
 * Local fallback function to fetch metrics
 */
async function fetchUserMetricsLocal(username: string): Promise<any> {
  const ts = Date.now().toString();
  const sig = generateForuSignature("GET", "", ts);
  const url = `${API_BASE_URL_CRED}/v1/public/user/metrics/${username}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY_CRED,
        "x-foru-timestamp": ts,
        "x-foru-signature": sig,
      },
    });

    const json = await res.json();

    if (res.ok && json.data) {
      return {
        identifi_score: json.data.identifi_score || 0,
        reach_score: json.data.reach_score || 0,
        impression_score: json.data.impression_score || 0,
        engagement_score: json.data.engagement_score || 0,
        on_chain_score: json.data.on_chain_score || 0,
      };
    } else {
      if (res.status !== 404) {
        console.error(
          `[ForU Score Credibility Local] API error for ${username}:`,
          json
        );
      }
    }
  } catch (error) {
    // Ignore network errors silently for cleaner console
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
 * Fetch badges from API for a given username
 */
async function fetchPublicBadges(username: string): Promise<any[]> {
  try {
    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "status=unlocked", currentTimestamp);

    const response = await fetch(
      `${API_BASE_URL_CRED}/v1/badge-public/twitter/${username}?status=unlocked`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY_CRED,
          "x-foru-timestamp": currentTimestamp,
          "x-foru-signature": signature,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data?.code === 200 && data.data) {
      const unlockedBadges: any[] = [];
      data.data.forEach((partner: any) => {
        partner.badges.forEach((badge: any) => {
          if (badge.unlocked) {
            unlockedBadges.push({
              name: badge.name,
              image: badge.image,
              description: badge.description || badge.name,
              partnerLogo: partner.logo,
              partnerName: partner.name
            });
          }
        });
      });
      return unlockedBadges;
    }
    return [];
  } catch (error) {
    console.error("Error fetching public badges:", error);
    return [];
  }
}

/**
 * Create badge dialog popup using shared BadgeDialog class
 */
function createBadgeDialog(badge: any) {
  if (window.badgeDialog) {
    window.badgeDialog.show(badge);
  } else {
    console.error('BadgeDialog not available');
  }
}

/**
 * Render badges in horizontal list with smaller size
 */
async function renderBadges(container: HTMLElement, username: string) {
  const row = document.createElement("div");
  row.id = "foru-badge-row";
  Object.assign(row.style, {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px",
  });

  try {
    const unlockedBadges = await fetchPublicBadges(username);
    
    // Always display exactly 6 badges
    for (let i = 0; i < 6; i++) {
      if (i < unlockedBadges.length) {
        // Display real badge
        const badge = unlockedBadges[i];
        const item = document.createElement("div");
        Object.assign(item.style, {
          display: "flex", flexDirection: "column", alignItems: "center", position: "relative",
          cursor: "default", padding: "12px", borderRadius: "8px", backgroundColor: "#1f1b2b",
          border: "1px solid rgba(255, 255, 255, 0.1)", transition: "background 0.3s ease",
          minWidth: "80px", minHeight: "60px",
        });
        const img = document.createElement("img");
        img.src = badge.image;
        img.alt = badge.name;
        Object.assign(img.style, {
          width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", marginBottom: "4px",
        });
        img.addEventListener("error", function() { (this as HTMLImageElement).src = chrome.runtime.getURL("images/badge_empty.png"); });
        item.appendChild(img);
        const name = document.createElement("div");
        Object.assign(name.style, {
          fontSize: "10px", color: "#ececf1", marginTop: "2px", textAlign: "center", maxWidth: "60px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        });
        name.textContent = badge.name;
        item.appendChild(name);
        item.addEventListener("mouseenter", () => { item.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"; });
        item.addEventListener("mouseleave", () => { item.style.background = "#1f1b2b"; });
        item.addEventListener("click", () => createBadgeDialog(badge));
        item.style.cursor = "pointer";
        row.appendChild(item);
      } else {
        // Display empty badge placeholder
        const emptyItem = document.createElement("div");
        Object.assign(emptyItem.style, {
          display: "flex", flexDirection: "column", alignItems: "center", position: "relative",
          cursor: "default", opacity: "0.5", padding: "12px", borderRadius: "8px",
          backgroundColor: "#1f1b2b", border: "1px solid rgba(255, 255, 255, 0.1)",
          minWidth: "80px", minHeight: "60px",
        });
        const img = document.createElement("img");
        img.src = chrome.runtime.getURL("images/badge_empty.png");
        img.alt = "No Badges";
        Object.assign(img.style, {
          width: "32px", height: "32px", objectFit: "contain", marginBottom: "4px",
        });
        emptyItem.appendChild(img);
        const name = document.createElement("div");
        Object.assign(name.style, {
          fontSize: "10px", color: "#80818b", marginTop: "2px",
        });
        name.textContent = "No badges";
        emptyItem.appendChild(name);
        row.appendChild(emptyItem);
      }
    }
    container.appendChild(row);
  } catch (error) {
    console.error("Error rendering badges:", error);
  }
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

// Extend window interface for shareDialog
declare global {
  interface Window {
    shareDialog?: any;
  }
}

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
  
  if (message.action === 'showShareDialog') {
    console.log('Showing share dialog from sidepanel message');
    const shareData = message.shareData;
    
    if (window.shareDialog) {
      // Show dialog and setup
      window.shareDialog.show();
      window.shareDialog.setLoading(true);
      window.shareDialog.setDownloadEnabled(false);
      
      // Generate share image asynchronously
      generateAndDisplayShareImage(shareData);
      
      sendResponse({ success: true, message: 'Share dialog shown' });
    } else {
      console.error('ShareDialog not available in content script');
      sendResponse({ success: false, message: 'ShareDialog not available' });
    }
    return true;
  }
});

/**
 * Generate and display share image
 */
async function generateAndDisplayShareImage(shareData: any): Promise<void> {
  try {
    console.log("[ShareImage] Generating share image...");
    console.log("[ShareImage] Share data:", shareData);
    
    // Import the share image generator
    const { generateShareImage } = await import('../../panel/user_tab/authenticated/share-image-generator/index.js');
    console.log("[ShareImage] Share image generator imported successfully");
    
    // Generate the share image
    console.log("[ShareImage] Calling generateShareImage with data:");
    console.log("- userProfileData:", shareData.userProfileData);
    console.log("- storedData:", shareData.storedData);
    console.log("- scoreBreakdown:", shareData.scoreBreakdown);
    console.log("- digitalDNA:", shareData.digitalDNA);
    console.log("- badges:", shareData.badges);
    
    const imageDataUrl = await generateShareImage(
      shareData.userProfileData,
      shareData.storedData,
      shareData.scoreBreakdown,
      shareData.digitalDNA,
      shareData.badges
    );
    
    console.log("[ShareImage] Image generated, data URL length:", imageDataUrl?.length);
    
    // Display the image
    if (window.shareDialog) {
      window.shareDialog.displayImage(imageDataUrl);
      console.log("[ShareImage] Image displayed in dialog");
    } else {
      console.error("[ShareImage] shareDialog not available on window");
    }
    
    // Setup download functionality
    if (window.shareDialog) {
      window.shareDialog.setDownloadHandler(() => {
        const link = document.createElement('a');
        link.download = `foru-profile-${shareData.userProfileData?.name || 'user'}-${Date.now()}.png`;
        link.href = imageDataUrl;
        link.click();
      });
    }
    
    // Hide loading and enable download
    if (window.shareDialog) {
      window.shareDialog.setLoading(false);
      window.shareDialog.setDownloadEnabled(true);
    }
    
    console.log("[ShareImage] Share image generated successfully");
    
  } catch (error) {
    console.error("[ShareImage] Error generating share image:", error);
    console.error("[ShareImage] Error stack:", error.stack);
    if (window.shareDialog) {
      window.shareDialog.setLoading(false);
    }
  }
}

export default insertCustomProfileScores;
