// src/profile/collected_badges/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

/**
 * Collected Badges Component
 * Renders the user's collected badges with dialog functionality
 */
export async function renderCollectedBadges(username: string): Promise<string> {
  // --- 7.8) Fetch Badges data from API ---
  let badgesHtml = "";
  try {
    console.log(`🔖 Fetching badges for ${username}`);
    const badgesHeaders = await buildForuHeaders("GET", "status=unlocked", null);
    const badgesUrl = `${API_BASE_URL}/v1/badge-public/twitter/${username}?status=unlocked`;
    console.log("➡️ Fetching badges from", badgesUrl);
    const badgesResp = await fetch(badgesUrl, { headers: badgesHeaders });
    console.log("⬅️ Badges Status", badgesResp.status);

    if (badgesResp.ok) {
      const badgesJson = await badgesResp.json();
      console.log("🔖 Badges JSON", badgesJson);
      if (badgesJson.code === 200 && badgesJson.data) {
        // Extract all unlocked badges from all partners
        const unlockedBadges: any[] = [];
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
        
        if (unlockedBadges.length === 0) {
          badgesHtml = `
            <h3>Collected Badges</h3>
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
        } else {
          // Take only first 6 unlocked badges
          const displayBadges = unlockedBadges.slice(0, 6);
          
          badgesHtml = `<h3>Collected Badges</h3><div class="badges">`;
          
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
        }
        
        console.log(`🔖 Loaded ${unlockedBadges.length} badges`);
      } else {
        console.log("🔖 No badges data available");
        badgesHtml = `
          <h3>Collected Badges</h3>
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
    } else {
      console.error("🔖 Badges API error:", badgesResp.status);
      badgesHtml = `
        <h3>Collected Badges</h3>
        <div class="badges">
          ${Array.from({ length: 6 })
            .map(() => `
          <div class="badge-item badge-empty" data-tooltip="No badges\nEmpty slot">
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
  } catch (error) {
    console.error("🔖 Error fetching badges data:", error);
    badgesHtml = `
      <h3>Collected Badges</h3>
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

  return badgesHtml;
}

/**
 * Create badge dialog popup using shared BadgeDialog class
 */
function createBadgeDialog(badge: any): void {
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
function createManualBadgeDialog(badge: any): void {
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

// Expose functions so they can be called from other components
(window as any).renderCollectedBadges = renderCollectedBadges;
(window as any).createBadgeDialog = createBadgeDialog;
(window as any).addBadgeEventListeners = addBadgeEventListeners;

export { createBadgeDialog, addBadgeEventListeners };
