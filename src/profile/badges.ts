// src/profile/badges.js

import { generateForuSignature, buildForuHeaders, API_BASE_URL, NEXT_PUBLIC_API_PRIVATE_KEY } from '../lib/crypto-utils.js';

/**
 * Fetches public badges for a Twitter username
 * @param {string} username - Twitter username without @
 * @returns {Promise<Array>} Array of unlocked badges
 */
async function fetchPublicBadges(username) {
  try {
    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "status=unlocked", currentTimestamp);

    const response = await fetch(
      `${API_BASE_URL}/v1/badge-public/twitter/${username}?status=unlocked`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
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
      // Extract all unlocked badges from all partners
      const unlockedBadges = [];
      data.data.forEach(partner => {
        partner.badges.forEach(badge => {
          if (badge.unlocked) {
            unlockedBadges.push({
              name: badge.name,
              image: badge.image,
              description: badge.description,
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
 * Renders badges section for profile tab using existing grid layout
 * @param {string} containerId - ID of the container element
 * @param {string} username - Twitter username without @
 */
async function renderBadgesSection(containerId, username) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <h3>Collected Badges</h3>
    <div class="badges">
      <div class="shimmer badge-item"></div>
      <div class="shimmer badge-item"></div>
      <div class="shimmer badge-item"></div>
      <div class="shimmer badge-item"></div>
      <div class="shimmer badge-item"></div>
      <div class="shimmer badge-item"></div>
    </div>
  `;

  try {
    const unlockedBadges = await fetchPublicBadges(username);
    
    if (unlockedBadges.length === 0) {
      container.innerHTML = `
        <h3>Collected Badges</h3>
        <div class="badges">
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
        </div>
      `;
      return;
    }

    // Take only first 6 unlocked badges
    const displayBadges = unlockedBadges.slice(0, 6);

    let badgesHtml = `
      <h3>Collected Badges</h3>
      <div class="badges">
    `;

    displayBadges.forEach(badge => {
      badgesHtml += `
        <div class="badge-item collected" data-badge='${JSON.stringify(badge)}'>
          <div class="icon">
            <img src="${badge.image}" 
                 alt="${badge.name}" 
                 style="width: 48px; height: 48px; object-fit: cover;"
                 data-fallback="${chrome.runtime.getURL("images/badge_empty.png")}">
          </div>
          <div class="name">${badge.name}</div>
        </div>
      `;
    });

    // Fill remaining slots with empty badges if less than 6
    const remainingSlots = 6 - displayBadges.length;
    for (let i = 0; i < remainingSlots; i++) {
      badgesHtml += `
        <div class="badge-item badge-empty">
          <div class="icon">
            <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
          </div>
          <div class="name">No badges</div>
        </div>
      `;
    }

    badgesHtml += `</div>`;
    container.innerHTML = badgesHtml;
    
    // Add event listeners for image fallback
    const badgeImages = container.querySelectorAll('.badge-item img[data-fallback]');
    badgeImages.forEach(img => {
      img.addEventListener('error', function() {
        const fallbackUrl = this.getAttribute('data-fallback');
        if (fallbackUrl && this.src !== fallbackUrl) {
          this.src = fallbackUrl;
        }
      });
    });

    // Add event listeners for badge clicks using shared BadgeDialog class
    if (window.badgeDialog) {
      const badgeItems = container.querySelectorAll('.badge-item.collected');
      window.badgeDialog.addEventListeners(badgeItems);
      console.log('Badge event listeners added for', badgeItems.length, 'items');
    } else {
      console.error('BadgeDialog not available');
    }

  } catch (error) {
    console.error("Error rendering profile badges:", error);
          container.innerHTML = `
        <h3>Collected Badges</h3>
        <div class="badges">
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
        </div>
      `;
  }
}

/**
 * Create badge dialog popup using shared BadgeDialog class
 */
function createBadgeDialog(badge) {
  if (window.badgeDialog) {
    window.badgeDialog.show(badge);
  } else {
    console.error('BadgeDialog not available');
  }
}

// Expose to global
window.renderBadgesSection = renderBadgesSection;
