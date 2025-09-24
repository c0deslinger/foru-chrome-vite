// src/inject/score_profile_picture.ts

import { API_BASE_URL } from '../../../lib/crypto-utils.js';
import { httpClient } from '../../../lib/http-client.js';
import { getBodyBackgroundColor } from '../../../lib/body-color-utils.js';

console.log("[ForU Score Profile Picture] Script loading...");

(function () {
  const STYLE_ID = "foru-credibility-style";
  const BORDER_CLASS = "foru-avatar-border";
  const BADGE_WRAPPER_CLASS = "credibility-badge-wrapper";
  const BADGE_CONTAINER_CLASS = "credibility-badge-container";
  const POINT_CLASS = "credibility-badge-point";
  const ICON_CLASS = "credibility-badge-icon";

  const ICON_URL = chrome.runtime.getURL("images/old_icon.png");
  let observer: MutationObserver;
  let bodyObserver: MutationObserver;


  /**
   * Get identifi_score for a username using shared utility or local fallback
   */
  async function getIdentifiScore(username: string): Promise<number> {
    // Try to use shared utility first
    if ((window as any).foruMetricsUtils && (window as any).foruMetricsUtils.getIdentifiScore) {
      try {
        const score = await (window as any).foruMetricsUtils.getIdentifiScore(username);
        console.log(
          `[ForU Profile Picture] Got identifi_score for ${username}:`,
          score
        );
        return score;
      } catch (error) {
        console.error(
          `[ForU Profile Picture] Error getting identifi_score for ${username}:`,
          error
        );
      }
    }

    // Fallback to local function
    console.log(`[ForU Profile Picture] Using local fallback for ${username}`);
    return await getIdentifiScoreLocal(username);
  }

  /**
   * Local fallback function to get identifi_score
   */
  async function getIdentifiScoreLocal(username: string): Promise<number> {
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;

    try {
      const json = await httpClient.get(url, {
        requireAuth: true,
        cache: true,
        cacheTTL: 600000 // 10 minutes cache for user metrics
      });

      if (json.data) {
        return json.data.identifi_score || 0;
      }
    } catch (error) {
      // Ignore network errors silently for cleaner console
      if (error instanceof Error && !error.message.includes('404')) {
        console.error(
          `[ForU Profile Picture Local] API error for ${username}:`,
          error.message
        );
      }
    }

    return 0;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    
    // Get dynamic body background color
    const bodyBackgroundColor = getBodyBackgroundColor();
    console.log('[ForU Profile Picture] Using body background color for border:', bodyBackgroundColor);
    
    const css = `
        .${BORDER_CLASS} {
          border: 2px solid #7349C0 !important;
        }
        .${BORDER_CLASS}.rounded {
          border-radius: 50% !important;
        }
        .${BORDER_CLASS}.square {
          border-radius: 10% !important;
        }
  
        .${BADGE_WRAPPER_CLASS} {
          position: absolute !important;
          bottom: -5px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
        }
        .${BADGE_CONTAINER_CLASS} {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 78px !important;
          height: 28px !important;
          background-color: #7349C0 !important;
          border-radius: 14px !important;
          color: #fff !important;
          font-size: 12px !important;
          overflow: hidden !important;
          padding: 0 !important;
          margin: 0 auto !important;
          box-shadow: inset 0 0 0 2px ${bodyBackgroundColor} !important;
        }
        .${ICON_CLASS} {
          width: 16px !important;
          height: 16px !important;
          margin-right: 2px !important;
          object-fit: contain !important;
        }
        .${POINT_CLASS} {
          margin: 0 !important;
          line-height: 1 !important;
        }
      `;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function removeExistingBadges() {
    document
      .querySelectorAll(`.${BADGE_WRAPPER_CLASS}`)
      .forEach((el) => el.remove());
    document.querySelectorAll(`.${BORDER_CLASS}`).forEach((container) => {
      container.classList.remove(BORDER_CLASS, "square", "rounded");
      (container as HTMLElement).style.position = "";
    });
  }

  async function decorateAvatars() {
    const avatars = document.querySelectorAll('img[src*="profile_images"]');

    for (const img of avatars) {
      const container = (img as HTMLImageElement).closest('div[data-testid^="UserAvatar-Container"]') as HTMLElement;
      if (!container || container.classList.contains(BORDER_CLASS)) continue;

      // 1) pull the handle from data-testid
      const testid = container.getAttribute("data-testid") || "";
      const parts = testid.split("-");
      const profileHandle = parts[parts.length - 1] || "";

      if (!profileHandle) continue;

      // 2) border shape
      const isRounded = (img as HTMLImageElement).alt && (img as HTMLImageElement).alt.includes("Square profile picture");
      container.classList.add(BORDER_CLASS, isRounded ? "square" : "rounded");
      if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
      }

      // 3) wrapper
      const wrapper = document.createElement("div");
      wrapper.className = `${BADGE_WRAPPER_CLASS} profile-badge`;
      wrapper.setAttribute("data-handle", profileHandle);

      // 4) badge container
      const badge = document.createElement("div");
      badge.className = BADGE_CONTAINER_CLASS;
      badge.setAttribute("data-handle", profileHandle);

      // always half avatar width
      const avatarWidth = container.getBoundingClientRect().width;
      badge.style.setProperty("width", `${avatarWidth * 0.75}px`, "important");

      // override if inline style height: 40px
      const inlineStyle = container.getAttribute("style") || "";
      if (inlineStyle.includes("height: 40px")) {
        badge.style.width = "36px";
        badge.style.height = "10px";
      }

      // icon
      const icon = document.createElement("img");
      icon.className = ICON_CLASS;
      icon.src = ICON_URL;
      icon.alt = "";

      // 5) Get identifi_score from shared utility or local fallback
      const scoreValue = await getIdentifiScore(profileHandle);
      const point = document.createElement("div");
      point.className = POINT_CLASS;
      point.textContent = scoreValue.toLocaleString();

      if (avatarWidth == 0) {
        badge.style.setProperty("width", `40px`, "important");
        badge.style.setProperty("height", `15px`, "important");
        icon.style.setProperty("width", `10px`, "important");
        icon.style.setProperty("height", `10px`, "important");
        point.style.setProperty("font-size", `8px`, "important");
      } else if (avatarWidth <= 35) {
        badge.style.setProperty("width", `0px`, "important");
        badge.style.setProperty("height", `0px`, "important");
        icon.style.setProperty("width", `0px`, "important");
        icon.style.setProperty("height", `0px`, "important");
        point.style.setProperty("font-size", `0px`, "important");
      } else if (avatarWidth <= 40) {
        badge.style.setProperty("width", `40px`, "important");
        badge.style.setProperty("height", `18px`, "important");
        icon.style.setProperty("width", `0px`, "important");
        icon.style.setProperty("height", `0px`, "important");
        point.style.setProperty("font-size", `7px`, "important");
      } else if (avatarWidth <= 64) {
        badge.style.setProperty("width", `64px`, "important");
        badge.style.setProperty("height", `20px`, "important");
        icon.style.setProperty("width", `10px`, "important");
        icon.style.setProperty("height", `10px`, "important");
        point.style.setProperty("font-size", `8px`, "important");
      }

      console.log(
        `[Custom Badges] Decorating avatar for handle: ${profileHandle}, score: ${scoreValue} width ${avatarWidth}`
      );

      // assemble
      badge.append(icon, point);
      wrapper.appendChild(badge);
      container.appendChild(wrapper);
    }
  }

  function observeDOM() {
    if (observer) return;
    observer = new MutationObserver(decorateAvatars);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function observeBodyStyle() {
    if (bodyObserver) return;
    
    bodyObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' && 
            mutation.target === document.body) {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate) {
        updateStyles();
      }
    });
    
    // Observe body element for style attribute changes
    if (document.body) {
      bodyObserver.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    }
  }

  function init() {
    injectStyles();
    observeDOM();
    observeBodyStyle();
    decorateAvatars();
  }

  function updateBadges() {
    removeExistingBadges();
    decorateAvatars();
  }

  function updateStyles() {
    // Remove existing styles
    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Re-inject styles with updated body background color
    injectStyles();
    
    // Re-decorate avatars to apply new styles
    updateBadges();
  }

  // re-run on SPA navigation or side-panel toggle
  chrome.runtime.onMessage.addListener((message) => {
    if (
      message.action === "urlChanged" ||
      message.action === "sidePanelVisibilityChanged"
    ) {
      updateBadges();
    }
  });

  init();
})();

export default {};