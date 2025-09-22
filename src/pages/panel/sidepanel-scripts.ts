// src/pages/panel/sidepanel-scripts.ts
// Converted from sidepanel.js to TypeScript

declare global {
  interface Window {
    Foru: any;
    renderQuestsSection: () => void;
    extractLoadedTweets: () => Promise<any[]>;
    renderReferralSection: (forceRefresh?: boolean) => Promise<void>;
  }
}

/**
 * Run a function in the context of the active Twitter/X tab
 */
function runOnPage(pageFunction: Function, args: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        return reject("No active tab");
      }
      const tabId = tabs[0].id;
      if (!tabId) return reject("No valid tab ID");
      
      chrome.tabs.get(tabId, (tab) => {
        const url = tab.url || "";
        const PROFILE_URL_REGEX =
          /^https?:\/\/(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})(?:\?.*)?$/i;
        const match = url.match(PROFILE_URL_REGEX);
        const username = match ? match[2] : null;
        const reserved = new Set([
          "home", "explore", "notifications", "messages", "compose", "settings",
          "i", "bookmarks", "lists", "communities", "premium", "verified",
          "spaces", "live", "account", "privacy", "help", "search", "hashtag",
          "login", "logout", "about", "tos", "privacy", "cookie_policy", "oauth", "share",
        ]);
        if (!match || reserved.has(username!.toLowerCase())) {
          return reject("Not a valid profile page");
        }
        chrome.scripting
          .executeScript({
            target: { tabId },
            func: pageFunction,
            args,
          })
          .then((results) => {
            if (results && results.length > 0) {
              resolve(results[0].result);
            } else {
              reject("No result from pageFunction");
            }
          })
          .catch((err) => reject(err));
      });
    });
  });
}

/**
 * Render the Profile tab
 */
function loadProfileTab() {
  const container = document.getElementById("profile-section");
  if (!container) return;
  
  container.innerHTML = `
    <div class="shimmer avatar"></div>
    <div class="shimmer text-line"></div>
    <div class="shimmer small-line"></div>
    <div class="shimmer text-line"></div>
    <div class="shimmer text-line"></div>
    <div class="shimmer small-line"></div>
    <div class="shimmer score-card"></div>
    <div class="shimmer score-card"></div>
    <div class="shimmer score-card"></div>
    <div class="shimmer score-card"></div>
    <div class="shimmer badge-item"></div>
    <div class="shimmer badge-item"></div>
    <div class="shimmer badge-item"></div>
    <div class="shimmer badge-item"></div>
    <div class="shimmer badge-item"></div>
    <div class="shimmer badge-item"></div>
    <div class="shimmer quest-item"></div>
    <div class="shimmer quest-item"></div>
    <div class="shimmer quest-item"></div>
  `;
  
  runOnPage(() => {
    // Execute the profile rendering function directly
    if (typeof (window as any).renderProfileSectionOnPage === 'function') {
      return (window as any).renderProfileSectionOnPage();
    }
    return '<p>Profile loading...</p>';
  })
    .then((html) => {
      container.innerHTML = html;
      setupProfileEventListeners(container);
      
      if (typeof window.renderQuestsSection === "function") {
        window.renderQuestsSection();
      }
    })
    .catch((err) => {
      container.innerHTML = `<p style="color:#aeb0b6;">Failed to load profile: ${err}</p>`;
    });
}

/**
 * Setup event listeners for profile section
 */
function setupProfileEventListeners(container: HTMLElement) {
  // Animate profile current-level ring
  const ringPathProfile = container.querySelector('#ringFgProfile') as SVGPathElement;
  if (ringPathProfile && typeof ringPathProfile.getTotalLength === 'function') {
    try {
      const length = ringPathProfile.getTotalLength();
      if (length > 0) {
        ringPathProfile.style.strokeDasharray = length.toString();
        ringPathProfile.style.strokeDashoffset = length.toString();
        ringPathProfile.getBoundingClientRect();
        
        const profileDataElement = container.querySelector('.current-level-profile');
        if (profileDataElement) {
          const xpCurrentEl = profileDataElement.querySelector('.xp-current');
          const xpTotalEl = profileDataElement.querySelector('.xp-total');
          const xpCurrent = xpCurrentEl?.textContent;
          const xpTotal = xpTotalEl?.textContent?.replace('/', '').replace(' Xp', '');
          
          if (xpCurrent && xpTotal) {
            const progressPercent = Math.round((parseInt(xpCurrent) / parseInt(xpTotal)) * 100);
            ringPathProfile.style.transition = 'stroke-dashoffset 1.5s ease-out';
            ringPathProfile.style.strokeDashoffset = (length * (1 - progressPercent / 100)).toString();
          }
        }
      }
    } catch (e) {
      console.warn('Could not animate profile ring:', e);
    }
  }

  // Setup badge click listeners
  const badgeItems = container.querySelectorAll('.badge-item.collected');
  badgeItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      const badgeData = item.getAttribute('data-badge');
      if (badgeData) {
        try {
          const badge = JSON.parse(badgeData);
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showBadgeDialog',
                badge: badge
              });
            }
          });
        } catch (error) {
          console.error('Error parsing badge data:', error);
        }
      }
    });
    (item as HTMLElement).style.cursor = 'pointer';
  });

  // Setup DNA card click listeners
  const dnaCards = container.querySelectorAll('.dna-card');
  dnaCards.forEach((item) => {
    item.addEventListener('click', () => {
      const dnaData = item.getAttribute('data-dna');
      if (dnaData) {
        try {
          const dna = JSON.parse(dnaData);
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showDnaDialog',
                dna: dna
              });
            }
          });
        } catch (error) {
          console.error('Error parsing DNA data:', error);
        }
      }
    });
  });
}

// State for the User tab
let isUserTabContentLoaded = false;
let userTabLoadingPromise: Promise<void> | null = null;
let lastUserTabLoad = 0;
const USER_TAB_DEBOUNCE_TIME = 2000; // 2 seconds debounce

/**
 * Render the User (Referral) tab
 */
function loadUserTab() {
  const container = document.getElementById("referral-section");
  if (!container) return;

  // Debounce to prevent multiple rapid calls
  const now = Date.now();
  if (now - lastUserTabLoad < USER_TAB_DEBOUNCE_TIME) {
    console.log("[UserTab] Debouncing user tab load, too recent");
    return;
  }
  lastUserTabLoad = now;

  // Clear any stuck rendering states first
  if (window.Foru && window.Foru.handleTabSwitch) {
    window.Foru.handleTabSwitch();
  }

  // Always show loading state and force refresh data
  container.innerHTML = `
    <div class="loading-container">
      <div class="shimmer avatar" style="width:60px;height:60px;margin-bottom:15px;"></div>
      <div class="shimmer text-line" style="width:80%;height:16px;margin-bottom:10px;"></div>
      <div class="shimmer small-line" style="width:50%;height:12px;"></div>
      <p class="loading-text">Loading fresh user data...</p>
    </div>
  `;

  isUserTabContentLoaded = false;
  userTabLoadingPromise = (async () => {
    try {
      console.log("[UserTab] Loading user tab with fresh data...");
      // Call the actual renderReferralSection function from user_tab.ts
      if (typeof window.renderReferralSection === 'function') {
        await window.renderReferralSection(true); // Always force refresh
      } else {
        throw new Error("renderReferralSection function not available");
      }
      isUserTabContentLoaded = true;
    } catch (err) {
      console.error("Error loading user tab:", err);
      container.innerHTML = `
        <div class="error-container">
          <p class="error-text">Failed to load user section: ${err}</p>
          <button class="retry-button" onclick="window.Foru?.forceRefreshUserTab?.()">
            Retry
          </button>
        </div>
      `;
      isUserTabContentLoaded = false;
    } finally {
      userTabLoadingPromise = null;
    }
  })();
}

/**
 * Show or hide Profile/Tweets tabs based on URL validity
 */
function setTabVisibility(showProfileTweetsTabs: boolean) {
  const profileBtn = document.querySelector('button[data-tab="profile"]') as HTMLElement;
  const tweetsBtn = document.querySelector('button[data-tab="tweets"]') as HTMLElement;
  const userBtn = document.querySelector('button[data-tab="user"]') as HTMLElement;
  
  if (profileBtn) profileBtn.style.display = showProfileTweetsTabs ? "block" : "none";
  if (tweetsBtn) tweetsBtn.style.display = showProfileTweetsTabs ? "block" : "none";
  if (userBtn) userBtn.style.display = "block";
  
  const active = document.querySelector(".sider-tabs button.active") as HTMLElement;
  const activeTab = active ? active.getAttribute("data-tab") : null;
  
  if (!showProfileTweetsTabs && (activeTab === "profile" || activeTab === "tweets")) {
    userBtn?.click();
  }
}

/**
 * Check URL changes and reload content if needed
 */
let lastUrl = "";
function checkAndReloadContentIfNeeded() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs && tabs[0] ? tabs[0].url || "" : "";
    const PROFILE_URL_REGEX =
      /^https?:\/\/(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})(?:\?.*)?$/i;
    const match = url.match(PROFILE_URL_REGEX);
    const username = match ? match[2] : null;
    const reserved = new Set([
      "home", "explore", "notifications", "messages", "compose", "settings",
      "i", "bookmarks", "lists", "communities", "premium", "verified",
      "spaces", "live", "account", "privacy", "help", "search", "hashtag",
      "login", "logout", "about", "tos", "privacy", "cookie_policy", "oauth", "share",
    ]);
    const validProfile = match && !reserved.has(username!.toLowerCase());
    const active = document.querySelector(".sider-tabs button.active") as HTMLElement;
    const activeTab = active ? active.getAttribute("data-tab") : null;

    if (url === lastUrl && !(activeTab === "user" && !isUserTabContentLoaded)) {
      return;
    }
    lastUrl = url;

    if (validProfile) {
      setTabVisibility(true);
      if (activeTab === "profile") {
        loadProfileTab();
      } else if (activeTab === "user") {
        // Only load if not already loaded recently
        if (!isUserTabContentLoaded) {
          loadUserTab();
        }
      } else {
        (document.querySelector('button[data-tab="profile"]') as HTMLElement)?.click();
      }
    } else {
      setTabVisibility(false);
      const profileSection = document.getElementById("profile-section");
      const tweetsSection = document.getElementById("tweets-section");
      
      if (profileSection) {
        profileSection.innerHTML = `<p style="color:#aeb0b6;">Open a Twitter/X profile to see this tab.</p>`;
      }
      if (tweetsSection) {
        tweetsSection.innerHTML = `<p style="color:#aeb0b6;">Open a Twitter/X profile to see this tab.</p>`;
      }
      
      const userBtn = document.querySelector('button[data-tab="user"]') as HTMLElement;
      if (userBtn) {
        if (!userBtn.classList.contains("active")) {
          userBtn.click();
        } else {
          // Only load if not already loaded recently
          if (!isUserTabContentLoaded) {
            loadUserTab();
          }
        }
      }
    }
  });
}

/**
 * Initialize sidepanel functionality
 */
function initializeSidepanelScripts() {
  console.log('[Sidepanel] Initializing sidepanel scripts...');
  
  // Tab click handlers
  document.querySelectorAll(".sider-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Clear stuck states when switching tabs
      if (window.Foru && window.Foru.handleTabSwitch) {
        window.Foru.handleTabSwitch();
      }
      
      document.querySelectorAll(".sider-tabs button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      
      const profileSection = document.getElementById("profile-section");
      const tweetsSection = document.getElementById("tweets-section");
      const referralSection = document.getElementById("referral-section");
      
      if (profileSection) profileSection.style.display = "none";
      if (tweetsSection) tweetsSection.style.display = "none";
      if (referralSection) referralSection.style.display = "none";
      
      const tab = btn.getAttribute("data-tab");
      if (tab === "profile") {
        if (profileSection) profileSection.style.display = "block";
        loadProfileTab();
      } else if (tab === "user") {
        if (referralSection) referralSection.style.display = "block";
        // Reset debounce when user explicitly clicks tab
        lastUserTabLoad = 0;
        isUserTabContentLoaded = false;
        loadUserTab();
      }
    });
  });

  // Listen for auth refresh messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "authSuccessRefreshReferral") {
      isUserTabContentLoaded = false;
      userTabLoadingPromise = null;
      const userBtn = document.querySelector('button[data-tab="user"]') as HTMLElement;
      if (userBtn) userBtn.click();
    }
  });

  // Initial load
  checkAndReloadContentIfNeeded();
  setInterval(checkAndReloadContentIfNeeded, 1000);
  
  console.log('[Sidepanel] Sidepanel scripts initialized');
}

export default initializeSidepanelScripts;
