// src/profile/profile_tab/index.ts

import { generateForuSignature, buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';
import { renderProfileHeader } from '../profile_header/index.js';
import { renderCurrentLevel } from '../current_level/index.js';
import { renderIdentifiScoreBreakdown } from '../identifi_score_breakdown/index.js';
import { renderUserDigitalDna } from '../user_digital_dna/index.js';
import { renderCollectedBadges, addBadgeEventListeners } from '../collected_badges/index.js';

/**
 * This function runs in the page context.
 * It must return a complete HTML string for the Profile section.
 */
export async function renderProfileSectionOnPage(): Promise<string> {
  // 🔍 Debug: verify invocation
  console.log("🟢 renderProfileSectionOnPage called");

  // --- Get handle (username) from URL ---
  let handle = "";
  const parts = window.location.pathname.split("/").filter((p) => p);
  if (parts.length) handle = "@" + parts[0];
  const username = handle.replace(/^@/, "");

  // --- Get followers count for score breakdown ---
  let followersCount = "0";
  const anchors = Array.from(document.querySelectorAll("a"));
  const fA = anchors.find((a) =>
    a.textContent?.toLowerCase().endsWith("followers")
  );
  if (fA) followersCount = fA.textContent?.split(" ")[0] || "0";

  // --- Get impression score for score breakdown ---
  let impressionScore = 0;
  try {
    console.log("🔵 About to fetch scores for", username);
    const headers = await buildForuHeaders("GET", "", undefined);
    const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;
    const resp = await fetch(url, { headers });
    const json = await resp.json();
    if (json.code === 200 && json.data) {
      impressionScore = json.data.impression_score || 0;
    }
  } catch (e) {
    console.error("🔴 Failed to fetch impression scores", e);
  }

  // --- Render all components ---
  const profileHeaderHtml = await renderProfileHeader();
  const currentLevelHtml = await renderCurrentLevel(username);
  const scoreBreakdownHtml = await renderIdentifiScoreBreakdown(username, followersCount, impressionScore);
  const digitalDnaHtml = await renderUserDigitalDna(username);
  const badgesHtml = await renderCollectedBadges(username);

  // --- Assemble final HTML from components ---
  const html = `
    ${profileHeaderHtml}
    ${currentLevelHtml}
    ${scoreBreakdownHtml}
    ${digitalDnaHtml}
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


// Expose function so it can be called from sidepanel.js
(window as any).renderProfileSectionOnPage = renderProfileSectionOnPage;

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
