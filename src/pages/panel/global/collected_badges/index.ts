// src/pages/panel/global/collected_badges/index.ts

import { buildForuHeaders, generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface BadgeApiConfig {
  type: 'public' | 'authenticated';
  username?: string;
  accessToken?: string;
  title?: string;
}

export interface BadgeData {
  name: string;
  image: string;
  description: string;
  partnerLogo: string;
  partnerName: string;
}

/**
 * Fetch badges from public API (for profile view)
 */
async function fetchPublicBadges(username: string): Promise<BadgeData[]> {
  try {
    console.log(`🔖 Fetching public badges for ${username}`);
    const badgesHeaders = await buildForuHeaders("GET", "status=unlocked", undefined);
    const badgesUrl = `${API_BASE_URL}/v1/badge-public/twitter/${username}?status=unlocked`;
    console.log("➡️ Fetching badges from", badgesUrl);
    const badgesResp = await fetch(badgesUrl, { headers: badgesHeaders });
    console.log("⬅️ Badges Status", badgesResp.status);

    if (!badgesResp.ok) {
      console.error("🔖 Badges API error:", badgesResp.status);
      return [];
    }

    const badgesJson = await badgesResp.json();
    console.log("🔖 Badges JSON", badgesJson);
    
    if (badgesJson.code === 200 && badgesJson.data) {
      // Extract all unlocked badges from all partners
      const unlockedBadges: BadgeData[] = [];
      badgesJson.data.forEach((partner: any) => {
        partner.badges.forEach((badge: any) => {
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
      
      console.log(`🔖 Loaded ${unlockedBadges.length} public badges`);
      return unlockedBadges;
    }
    
    return [];
  } catch (error) {
    console.error("🔖 Error fetching public badges data:", error);
    return [];
  }
}

/**
 * Fetch badges from authenticated API (for user tab)
 */
async function fetchAuthenticatedBadges(accessToken: string): Promise<BadgeData[]> {
  try {
    console.log(`🔖 Fetching authenticated badges`);
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
      // Collect all unlocked badges from all partners
      const allUnlockedBadges: BadgeData[] = [];
      data.data.forEach((partner: any) => {
        const unlockedBadges = partner.badges.filter((badge: any) => badge.unlocked);
        unlockedBadges.forEach((badge: any) => {
          allUnlockedBadges.push({
            name: badge.name,
            image: badge.image,
            description: badge.description,
            partnerLogo: partner.logo,
            partnerName: partner.name
          });
        });
      });
      
      console.log(`🔖 Loaded ${allUnlockedBadges.length} authenticated badges`);
      return allUnlockedBadges;
    }
    
    return [];
  } catch (error) {
    console.error("🔖 Error fetching authenticated badges:", error);
    return [];
  }
}

/**
 * Global Collected Badges Component
 * Renders the user's collected badges with dialog functionality
 * Supports both public (profile) and authenticated (user tab) API calls
 */
export async function renderCollectedBadges(config: BadgeApiConfig): Promise<string> {
  const { type, username, accessToken, title = 'Collected Badges' } = config;
  
  // Fetch badges based on configuration
  let badges: BadgeData[] = [];
  
  if (type === 'public' && username) {
    badges = await fetchPublicBadges(username);
  } else if (type === 'authenticated' && accessToken) {
    badges = await fetchAuthenticatedBadges(accessToken);
  } else {
    console.error('Invalid configuration for renderCollectedBadges:', config);
    return renderEmptyBadges(title);
  }

  // Render badges HTML
  if (badges.length === 0) {
    return renderEmptyBadges(title);
  }

  // Take only first 6 unlocked badges
  const displayBadges = badges.slice(0, 6);
  
  let badgesHtml = `<h3>${title}</h3><div class="badges">`;
  
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
  return badgesHtml;
}

/**
 * Render empty badges state
 */
function renderEmptyBadges(title: string): string {
  return `
    <h3>${title}</h3>
    <div class="badges">
      ${Array.from({ length: 6 })
        .map(() => `
      <div class="badge-item badge-empty">
        <div class="icon">
          <img src="${chrome.runtime.getURL("images/badge_empty.png")}" alt="No Badges" style="width: 48px; height: 48px; object-fit: contain;">
        </div>
        <div class="name">No badges</div>
      </div>
    `)
        .join("")}
    </div>
  `;
}

/**
 * Create badge dialog popup using shared BadgeDialog class
 */
function createBadgeDialog(badge: BadgeData): void {
  console.log('createBadgeDialog called with:', badge);
  console.log('window.badgeDialog available:', !!(window as any).badgeDialog);
  
  if ((window as any).badgeDialog) {
    console.log('Using shared BadgeDialog');
    (window as any).badgeDialog.show(badge);
  } else {
    console.error('BadgeDialog not available, creating manual dialog');
    // Fallback: create dialog manually
    createManualBadgeDialog(badge);
  }
}

/**
 * Create badge dialog manually as fallback
 */
function createManualBadgeDialog(badge: BadgeData): void {
  console.log('Creating manual badge dialog');
  
  // Remove existing dialog if any
  const existingDialog = document.querySelector('.foru-badge-dialog-overlay');
  if (existingDialog) {
    existingDialog.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'foru-badge-dialog-overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'foru-badge-dialog';
  
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'foru-badge-dialog-content-wrapper';
  
  const header = document.createElement('div');
  header.className = 'foru-badge-dialog-header';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'foru-badge-dialog-close';
  closeButton.innerHTML = '<img src="' + chrome.runtime.getURL('images/badge-dialog/close-icon.svg') + '" alt="Close">';
  closeButton.onclick = () => overlay.remove();
  
  header.appendChild(closeButton);
  
  const content = document.createElement('div');
  content.className = 'foru-badge-dialog-content';
  
  // Badge image
  const badgeImage = document.createElement('img');
  badgeImage.className = 'foru-badge-dialog-badge-image';
  badgeImage.src = badge.image;
  badgeImage.alt = badge.name;
  badgeImage.onerror = function(this: HTMLImageElement) {
    this.src = chrome.runtime.getURL('images/badge_empty.png');
  };
  
  // Badge title
  const title = document.createElement('h1');
  title.className = 'foru-badge-dialog-title';
  title.textContent = badge.name;
  
  // Badge description
  const description = document.createElement('p');
  description.className = 'foru-badge-dialog-description';
  description.textContent = badge.description || 'This badge represents your achievement and contribution to the community.';
  
  // Partner section
  const partner = document.createElement('div');
  partner.className = 'foru-badge-dialog-partner';
  
  const partnerText = document.createElement('span');
  partnerText.className = 'foru-badge-dialog-partner-text';
  partnerText.textContent = 'By';
  
  const partnerLogo = document.createElement('img');
  partnerLogo.className = 'foru-badge-dialog-partner-logo';
  partnerLogo.src = badge.partnerLogo || chrome.runtime.getURL('images/badge_empty.png');
  partnerLogo.alt = 'Partner Logo';
  partnerLogo.onerror = function(this: HTMLImageElement) {
    this.src = chrome.runtime.getURL('images/badge_empty.png');
  };
  
  partner.appendChild(partnerText);
  partner.appendChild(partnerLogo);
  
  content.appendChild(badgeImage);
  content.appendChild(title);
  content.appendChild(description);
  content.appendChild(partner);
  
  contentWrapper.appendChild(header);
  contentWrapper.appendChild(content);
  dialog.appendChild(contentWrapper);
  overlay.appendChild(dialog);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
    }
  });
  
  document.body.appendChild(overlay);
  console.log('Manual badge dialog created');
}

/**
 * Add event listeners to badge items using shared BadgeDialog class
 */
function addBadgeEventListeners(): void {
  console.log('addBadgeEventListeners called');
  console.log('window.badgeDialog available:', !!(window as any).badgeDialog);
  
  if ((window as any).badgeDialog) {
    console.log('Adding event listeners to all badge items');
    (window as any).badgeDialog.addEventListenersToAll();
  } else {
    console.error('BadgeDialog not available');
    // Fallback: manually add event listeners
    const badgeItems = document.querySelectorAll('.badge-item.collected');
    console.log('Found', badgeItems.length, 'badge items for manual event listeners');
    badgeItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        console.log('Badge clicked manually:', index);
        const badgeData = item.getAttribute('data-badge');
        if (badgeData) {
          try {
            const badge = JSON.parse(badgeData);
            console.log('Badge data:', badge);
            // Create dialog manually if BadgeDialog not available
            createBadgeDialog(badge);
          } catch (error) {
            console.error('Error parsing badge data:', error);
          }
        } else {
          console.log('No badge data found');
        }
      });
      (item as HTMLElement).style.cursor = 'pointer';
    });
  }
}

/**
 * Render badges section for user tab (authenticated context)
 * This function is specifically for the user tab context where we need to handle
 * badge clicks differently (sending messages to content script)
 */
export async function renderUserBadgesSection(container: HTMLElement, accessToken: string): Promise<void> {
  if (!container || !accessToken) return;

  // Show loading state
  container.innerHTML = `
    <h3>Your Collected Badges</h3>
    <div class="badges">
      ${Array.from({ length: 6 }).map(() => '<div class="badge-item collected shimmer"></div>').join('')}
    </div>
  `;

  try {
    const badges = await fetchAuthenticatedBadges(accessToken);
    const badgesHtml = await renderCollectedBadges({
      type: 'authenticated',
      accessToken,
      title: 'Your Collected Badges'
    });
    
    container.innerHTML = badgesHtml;
    
    // Add event listeners for badge clicks (user tab specific)
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
    container.innerHTML = renderEmptyBadges('Your Collected Badges');
  }
}

// Expose functions so they can be called from other components
(window as any).renderCollectedBadges = renderCollectedBadges;
(window as any).renderUserBadgesSection = renderUserBadgesSection;
(window as any).createBadgeDialog = createBadgeDialog;
(window as any).addBadgeEventListeners = addBadgeEventListeners;

export { createBadgeDialog, addBadgeEventListeners };
