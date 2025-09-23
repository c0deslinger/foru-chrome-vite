// src/pages/content/collected_badges/index.ts

console.log("[ForU Collected Badges] Script loading...");

import { API_BASE_URL } from '../../../lib/crypto-utils.js';
import { httpClient } from '../../../lib/http-client.js';

/**
 * Fetch badges from API for a given username
 */
export async function fetchPublicBadges(username: string): Promise<any[]> {
  try {
    const url = `${API_BASE_URL}/v1/badge-public/twitter/${username}?status=unlocked`;
    
    const data = await httpClient.get(url, {
      requireAuth: true,
      cache: true,
      cacheTTL: 300000 // 5 minutes cache for badges
    });

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
export function createBadgeDialog(badge: any) {
  if (window.badgeDialog) {
    window.badgeDialog.show(badge);
  } else {
    console.error('BadgeDialog not available');
  }
}

/**
 * Render badges in horizontal list with smaller size
 */
export async function renderBadges(container: HTMLElement, username: string) {
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

export default {
  fetchPublicBadges,
  createBadgeDialog,
  renderBadges
};
