// src/user/user_badges_section/index.ts

import {
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
} from "../../../../lib/crypto-utils.js";

/**
 * Fetches user badges from the API
 * @param {string} accessToken - User's access token
 * @returns {Promise<Array>} Array of partner data with badges
 */
async function fetchUserBadges(accessToken: string): Promise<any[]> {
  try {
    const currentTimestamp = Date.now().toString();
    const signature = generateForuSignature("GET", "status=unlocked", currentTimestamp);

    const response = await fetch(
      `${API_BASE_URL}/v1/user/badge/all?status=unlocked`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
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
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return [];
  }
}

/**
 * Renders badges section for user tab with profile tab styling and unlocked badges only
 * @param {HTMLElement} container - Container element to render badges in
 * @param {string} accessToken - User's access token
 */
async function renderUserBadgesSection(container: HTMLElement, accessToken: string): Promise<void> {
  if (!container || !accessToken) return;

  // Show loading state
  container.innerHTML = `
    <h3>Your Collected Badges</h3>
    <div class="badges">
      ${Array.from({ length: 6 }).map(() => '<div class="badge-item collected shimmer"></div>').join('')}
    </div>
  `;

  try {
    const partners = await fetchUserBadges(accessToken);

    if (!partners || partners.length === 0) {
      // Show empty state
      container.innerHTML = `
        <h3>Your Collected Badges</h3>
        <div class="badges">
          ${Array.from({ length: 6 }).map(() => `
            <div class="badge-item badge-empty">
              <div class="icon">
                <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
              </div>
              <div class="name">No badges</div>
            </div>
          `).join('')}
        </div>
      `;
      return;
    }

    // Collect all unlocked badges from all partners
    const allUnlockedBadges: any[] = [];
    partners.forEach(partner => {
      const unlockedBadges = partner.badges.filter((badge: any) => badge.unlocked);
      unlockedBadges.forEach((badge: any) => {
        allUnlockedBadges.push({
          ...badge,
          partnerName: partner.name,
          partnerLogo: partner.logo
        });
      });
    });

    let badgesHtml = `
      <h3>Your Collected Badges</h3>
      <div class="badges">
    `;

    // Show first 6 unlocked badges
    const displayBadges = allUnlockedBadges.slice(0, 6);

    displayBadges.forEach((badge) => {
      console.log('Badge data:', badge); // Debug log
      
      badgesHtml += `
        <div class="badge-item collected" data-badge='${JSON.stringify(badge)}'>
          <div class="icon">
            <img src="${badge.image}" 
                 alt="${badge.name}" 
                 style="width: 48px; height: 48px; object-fit: cover;"
                 data-fallback="${chrome.runtime.getURL("images/badge_empty.png")}">
          </div>
          <div class="name">${badge.name || 'Unknown Badge'}</div>
        </div>
      `;
    });

    // Fill remaining slots if less than 6 badges
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
    
    // Add event listeners for badge clicks
    const badgeItems = container.querySelectorAll('.badge-item.collected');
    console.log('Found', badgeItems.length, 'badge items in user badges section');
    
    badgeItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        console.log('Badge clicked in user badges section:', index);
        const badgeData = item.getAttribute('data-badge');
        if (badgeData) {
          try {
            const badge = JSON.parse(badgeData);
            console.log('Badge data from user badges section:', badge);
            
            // Send message to content script to show badge dialog on web page
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs && tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'showBadgeDialog',
                  badge: badge
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Error sending message to content script:', chrome.runtime.lastError);
                  } else {
                    console.log('Message sent to content script from user badges, response:', response);
                  }
                });
              }
            });
          } catch (error) {
            console.error('Error parsing badge data in user badges section:', error);
          }
        } else {
          console.log('No badge data found in user badges section');
        }
      });
      (item as HTMLElement).style.cursor = 'pointer';
    });
  } catch (error) {
    console.error("Error rendering user badges:", error);
    // Show error state
    container.innerHTML = `
      <h3>Your Collected Badges</h3>
      <div class="badges">
        ${Array.from({ length: 6 }).map(() => `
          <div class="badge-item badge-empty">
            <div class="icon">
              <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
            </div>
            <div class="name">No badges</div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

export { fetchUserBadges, renderUserBadgesSection };
