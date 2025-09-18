// src/profile/profile/index.ts

import { generateForuSignature, buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

/**
 * This function runs in the page context.
 * It must return a complete HTML string for the Profile section.
 */
export async function renderProfileSectionOnPage(): Promise<string> {

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

  // 🔍 Debug: verify invocation
  console.log("🟢 renderProfileSectionOnPage called");

  // --- 1) Get the latest avatar ---
  let avatarUrl = "";
  const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
  if (primaryColumn) {
    const avatarElem = primaryColumn.querySelector(
      'img[src*="profile_images"]'
    ) as HTMLImageElement;
    if (avatarElem) avatarUrl = avatarElem.src;
  }
  if (!avatarUrl) {
    const fallback = document.querySelector('img[src*="profile_images"]') as HTMLImageElement;
    if (fallback) avatarUrl = fallback.src;
  }

  // --- 2) Get handle (username) from URL ---
  let handle = "";
  const parts = window.location.pathname.split("/").filter((p) => p);
  if (parts.length) handle = "@" + parts[0];

  // --- 3) Get bio ---
  let bioText = "";
  const bioElem = document.querySelector('div[data-testid="UserDescription"]');
  if (bioElem) bioText = bioElem.textContent?.replace(/\n/g, " ").trim() || "";

  // --- 4) Get location, occupation, URL, join date ---
  let locationText = "",
    jobText = "",
    urlText = "",
    joinDateText = "";
  const items = document.querySelector(
    'div[data-testid="UserProfileHeader_Items"]'
  );
  if (items) {
    const spans = Array.from(items.querySelectorAll("span"));
    const links = Array.from(items.querySelectorAll("a"));
    const jSpan = spans.find((s) => s.textContent?.trim().startsWith("Joined "));
    if (jSpan) joinDateText = jSpan.textContent?.trim() || "";
    const linkElem = links.find((a) => (a as HTMLAnchorElement).href?.startsWith("http"));
    if (linkElem) urlText = (linkElem as HTMLAnchorElement).href;
    const others = spans.filter(
      (s) => !s.textContent?.trim().startsWith("Joined ")
    );
    if (others.length >= 2) {
      locationText = others[0].textContent?.trim() || "";
      jobText = others[1].textContent?.trim() || "";
    } else if (others.length === 1) {
      jobText = others[0].textContent?.trim() || "";
    }
  }

  // --- 5) Get followers & following ---
  let followersCount = "0",
    followingCount = "0";
  const anchors = Array.from(document.querySelectorAll("a"));
  const fA = anchors.find((a) =>
    a.textContent?.toLowerCase().endsWith("followers")
  );
  if (fA) followersCount = fA.textContent?.split(" ")[0] || "0";
  const gA = anchors.find((a) =>
    a.textContent?.toLowerCase().endsWith("following")
  );
  if (gA) followingCount = gA.textContent?.split(" ")[0] || "0";

  // --- 6) Fetch real scores from your API ---
  const username = handle.replace(/^@/, "");

  // --- 7.5) Fetch Digital DNA data from API ---
  let digitalDnaData: any[] = [];
  let isDnaEmpty = false;
  
  // --- 7.6) Fetch Badges data from API ---
  let badgesHtml = "";
  try {
    if (username) {
      console.log(`🧬 Fetching DNA data for ${username}`);
      const dnaHeaders = await buildForuHeaders("GET", "", null);
      const dnaUrl = `${API_BASE_URL}/v1/public/user/dna/${username}`;
      console.log("➡️ Fetching DNA from", dnaUrl);
      const dnaResp = await fetch(dnaUrl, { headers: dnaHeaders });
      console.log("⬅️ DNA Status", dnaResp.status);

      if (dnaResp.ok) {
        const dnaJson = await dnaResp.json();
        console.log("🧬 DNA JSON", dnaJson);
        if (dnaJson.code === 200 && dnaJson.data && dnaJson.data.length > 0) {
          // Take top 4 items
          digitalDnaData = dnaJson.data.slice(0, 4).map((item: any, index: number) => ({
            id: `dna-${index}`,
            title: item.dna?.title || "Unknown",
            percentage: Math.round(item.percentage || 0),
            created_at: `${item.created_at}` || "Unknown",
            tweet_highlight: htmlEncode(item.tweet_highlight) || "Unknown",
            description: htmlEncode(item.dna?.description) || "Unknown",
            image: item.dna?.image || null,
            rank: index === 0 && item.percentage >= 100 ? "Top 5 Global" : null,
          }));
          console.log(`🧬 Loaded ${digitalDnaData.length} DNA items`);
        } else {
          console.log("🧬 No DNA data available");
          isDnaEmpty = true;
        }
      } else if (dnaResp.status === 404) {
        console.log("🧬 404 - No DNA data found for user");
        isDnaEmpty = true;
      } else {
        console.error("🧬 DNA API error:", dnaResp.status);
        isDnaEmpty = true;
      }
    } else {
      console.log("🧬 No username available");
      isDnaEmpty = true;
    }
  } catch (error) {
    console.error("🧬 Error fetching DNA data:", error);
    isDnaEmpty = true;
  }

  let reachScore = 0,
    engagementScore = 0,
    impressionScore = 0,
    onchainScore = 0;
  let avgLikes = 0,
    avgReplies = 0,
    avgReposts = 0,
    avgViews = 0;
  let badgesMinted = 0,
    questCompleted = 0,
    referralCount = 0;
  try {
    console.log("🔵 About to fetch scores for", username);
    const headers = await buildForuHeaders("GET", "", null);
    console.log("🟡 Headers built", headers);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    console.log("➡️ Fetching from", url);
    const resp = await fetch(url, { headers });
    console.log("⬅️ Status", resp.status);
    const json = await resp.json();
    console.log("📊 JSON", json);
    if (json.code === 200 && json.data) {
      const d = json.data;
      reachScore = d.reach_score || 0;
      engagementScore = d.engagement_score || 0;
      impressionScore = d.impression_score || 0;
      onchainScore = d.on_chain_score || 0;
      avgLikes = d.average_likes || 0;
      avgReplies = d.average_replies || 0;
      avgReposts = d.average_repost || 0;
      avgViews = d.average_views || 0;
      badgesMinted = d.badges_minted || 0;
      questCompleted = d.quest_completed || 0;
      referralCount = d.referral_count || 0;
    }
  } catch (e) {
    console.error("🔴 Failed to fetch impression scores", e);
  }

  // --- 7.7) Fetch user level/XP data from API ---
  let userLevelData = {
    exp: 0,
    level: 1,
    max_exp_on_level: 500,
    exp_progress_percentage: 0
  };
  
  try {
    if (username) {
      console.log(`📊 Fetching user level data for ${username}`);
      const userDataHeaders = await buildForuHeaders("GET", "", null);
      const userDataUrl = `${API_BASE_URL}/v1/public/user/data/${username}`;
      console.log("➡️ Fetching user data from", userDataUrl);
      const userDataResp = await fetch(userDataUrl, { headers: userDataHeaders });
      console.log("⬅️ User Data Status", userDataResp.status);

      if (userDataResp.ok) {
        const userDataJson = await userDataResp.json();
        console.log("📊 User Data JSON", userDataJson);
        if (userDataJson.code === 200 && userDataJson.data) {
          userLevelData = {
            exp: userDataJson.data.exp || 0,
            level: userDataJson.data.level || 1,
            max_exp_on_level: userDataJson.data.max_exp_on_level || 500,
            exp_progress_percentage: userDataJson.data.exp_progress_percentage || 0
          };
          console.log(`📊 Loaded user level data: Level ${userLevelData.level}, XP ${userLevelData.exp}/${userLevelData.max_exp_on_level} (${userLevelData.exp_progress_percentage}%)`);
        } else {
          console.log("📊 No user level data available, using defaults");
        }
      } else if (userDataResp.status === 404) {
        console.log("📊 404 - No user level data found for user");
      } else {
        console.error("📊 User Data API error:", userDataResp.status);
      }
    } else {
      console.log("📊 No username available for user level data");
    }
  } catch (error) {
    console.error("📊 Error fetching user level data:", error);
  }

  // --- 7.8) Fetch Badges data from API ---
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

  // --- 8) Assemble final HTML ---
  const html = `
    <div class="profile-header">
      <img src="${avatarUrl}" alt="avatar" />
      <div class="info">
        <span class="username">${handle}</span>
        <span class="location">${locationText}</span>
      </div>
    </div>

    <p class="profile-bio">${bioText}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <div style="color:#aeb0b6;">${jobText ? `💼 ${jobText}` : ""}</div>
      <div style="color:#aeb0b6;">${
        urlText
          ? `🔗 <a href="${urlText}" target="_blank" style="color:#6c4cb3;text-decoration:underline;">${urlText}</a>`
          : ""
      }</div>
      <div style="color:#aeb0b6;">${
        joinDateText ? `📅 ${joinDateText}` : ""
      }</div>
      <div style="color:#aeb0b6;">👥 ${followersCount} Followers · ${followingCount} Following</div>
    </div>

    <!-- Current Level (Profile) - isolated dummy component -->
    <div class="profile-current-level-section current-level-profile" style="margin-top:12px;background-color:#1f1b2b;border-radius:12px;padding:12px;">
      <div class="level-progress">
        <div class="level-progress-ring">
          <svg width="82" height="41" viewBox="0 0 100 50">
            <defs>
              <linearGradient id="progressGradientProfile" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FFB005FF" />
                <stop offset="100%" stop-color="#FF8800FF" />
              </linearGradient>
            </defs>
            <!-- Background Arc -->
            <path d="M10 50 A40 40 0 0 1 90 50" stroke="#5D5D5DFF" stroke-width="8" fill="none" stroke-linecap="round" />
            <!-- Foreground Arc -->
            <path class="ring-fg" id="ringFgProfile" d="M10 50 A40 40 0 0 1 90 50" stroke="url(#progressGradientProfile)" stroke-width="8" fill="none" stroke-linecap="round" />
          </svg>
        </div>
        <div class="level-info">
          <div class="level-header">
            <span class="current-level-text">Current level</span>
            <span class="level-number">${userLevelData.level}</span>
          </div>
          <div class="xp-info">
            <img src="${chrome.runtime.getURL("images/coin.png")}" alt="Coin" class="xp-coin-img" />
            <span class="xp-current">${userLevelData.exp}</span>
            <span class="xp-total">/${userLevelData.max_exp_on_level} Xp</span>
          </div>
        </div>
      </div>
    </div>

    <h3>IdentiFi Score Breakdown</h3>
    <div class="score-grid">
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Social</div>
        <div class="value">${reachScore}</div>
        <div class="details">${followersCount} followers & ${impressionScore} impressions</div>
      </div>
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">Reputation</div>
        <div class="value">${engagementScore}</div>
        <div class="details">${avgLikes} avg likes, ${avgReplies} avg replies, ${avgReposts} avg retweets</div>
      </div>
      <div class="score-card" style="cursor: pointer;" onclick="showTooltip('This score reflects how widely your content is seen. It\\'s driven by impressions and how your audience is expanding.', event)">
        <div class="label">On Chain</div>
        <div class="value">${onchainScore}</div>
        <div class="details">${badgesMinted} badges minted, ${questCompleted} quests solved, ${referralCount} referrals</div>
      </div>
      <div class="score-card" style="cursor: not-allowed; opacity: 0.6;">
        <div class="label">Governance</div>
        <div class="value">-</div>
        <div class="details">Coming soon</div>
      </div>
    </div>

    <h3>Digital DNA</h3>
    ${
      isDnaEmpty
        ? `
      <div class="digital-dna-empty">
        <div class="dna-empty-icon">
          <img src="${chrome.runtime.getURL(
            "images/dna_molecule.png"
          )}" alt="DNA Molecule" style="width:75px;height:82px;object-fit:contain;">
        </div>
        <div class="dna-empty-title">The Digital DNA Is Empty</div>
        <div class="dna-empty-description">
          This user is not yet registered on the FORU platform
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
                ${dna.rank ? `<div class="dna-rank">${dna.rank}</div>` : ""}
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
                      <div class="dna-progress-bar ${
                        dna.id
                      }-bar" style="width: ${dna.percentage}%"></div>
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

    ${badgesHtml}

    <div id="quests-in-profile" style="margin-top:16px;"></div>
  `;

  // Add event listeners after a short delay to ensure DOM is ready
  setTimeout(() => {
    addBadgeEventListeners();
    console.log('Profile badge event listeners added');
  }, 100);

  return html;
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

// Expose function so it can be called from sidepanel.js
(window as any).renderProfileSectionOnPage = renderProfileSectionOnPage;
(window as any).addBadgeEventListeners = addBadgeEventListeners;

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

export { createBadgeDialog, addBadgeEventListeners };
