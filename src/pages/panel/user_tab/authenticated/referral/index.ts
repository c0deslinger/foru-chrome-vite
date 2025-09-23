// src/pages/panel/user_tab/authenticated/referral/index.ts

// Import fungsi yang dibutuhkan
import {
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
} from "../../../../../lib/crypto-utils.js";

import { showCustomNotification } from "../../index.js";

interface UserProfileData {
  name?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Helper untuk escape HTML.
 */
function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Merender bagian detail invitation codes dan daftar invites.
 * @param {object|null} userProfileData - Data profil pengguna (saat ini tidak digunakan secara langsung di sini, tapi bisa untuk data referral dinamis di masa depan).
 * @param {boolean} forceRefresh - Force refresh data from API even if already loaded
 */
async function renderReferralDetails(
  userProfileData: UserProfileData | null,
  forceRefresh = false
): Promise<void> {
  const container = document.getElementById("referral-section");
  if (!container) return;

  // Get access token for API calls
  const storedData = await chrome.storage.local.get(["accessToken"]);
  const accessToken = storedData.accessToken;

  // Always fetch fresh invitation codes from API
  let invitationCodes: any[] = [];
  try {
    if (accessToken) {
      const currentTimestamp = Date.now().toString();
      const signature = generateForuSignature("GET", "", currentTimestamp);

      const response = await fetch(
        `${API_BASE_URL}/v1/referral/usable-referral-codes`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
            Authorization: `Bearer ${accessToken}`,
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.code === 200 && data.data) {
          invitationCodes = data.data.map((item: any) => ({
            id: item.id,
            code: item.code,
            expiredAt: item.expired_at,
          }));
        }
      } else {
        console.error("[InvitationCodes] API error:", response.status);
      }
    }
  } catch (error) {
    console.error("[InvitationCodes] Error fetching codes:", error);
  }

  // Don't use dummy data - if no codes available, hide the component

  // Invites data matching the table structure
  const invitesData = [
    {
      name: "Name",
      handle: "@UserName",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
      invited: "8d ago",
      status: "Joined",
      lvProgress: "3/5",
      currentLevel: 3,
      karmaImpact: "+0 Xp",
    },
    {
      name: "Name",
      handle: "@UserName",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
      invited: "25d ago",
      status: "Joined",
      lvProgress: "Completed",
      currentLevel: 8,
      karmaImpact: "+24 Xp",
    },
    {
      name: "Name",
      handle: "@UserName",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
      invited: "34d ago",
      status: "Banned",
      lvProgress: "Completed",
      currentLevel: 12,
      karmaImpact: "-42 Xp",
    },
  ];

  let detailsHtml = ``;

  // Only show invitation codes if there are any
  if (invitationCodes.length > 0) {
    detailsHtml += `
      <h3 style="margin-top:16px;">Invitation Codes</h3>
      <div class="invitation-codes-list">
        ${invitationCodes
          .map(
            (invite, index) => `
          <div class="invitation-code-item" data-code-index="${index}">
            <div class="code-info">
              <div class="code-text">${invite.code}</div>
            </div>
            <div class="code-actions">
              <button class="copy-link-btn" data-code="${invite.code}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
              <button class="share-btn" data-code="${invite.code}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // Clear any existing invitation codes first
  const existingInvitationCodes = container.querySelector('.invitation-codes-list');
  if (existingInvitationCodes) {
    existingInvitationCodes.remove();
  }
  
  // Add invitation codes after existing content (profile card)
  if (detailsHtml.trim()) {
    container.insertAdjacentHTML("beforeend", detailsHtml);
  } else {
    // Fallback if no content to render
    container.insertAdjacentHTML("beforeend", `
      <div style="padding: 20px; text-align: center; color: #aeb0b6;">
        <p>No invitation codes available at the moment.</p>
      </div>
    `);
  }

  // Event listeners untuk tombol copy link
  document.querySelectorAll(".copy-link-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const code = (btn as HTMLElement).dataset.code;
      const inviteLink = `${code}`;

      navigator.clipboard
        .writeText(inviteLink)
        .then(() => {
          showCustomNotification("Invitation link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy link:", err);
          showCustomNotification("Failed to copy link!", true);
        });
    });
  });

  // Event listeners untuk tombol share
  document.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const code = (btn as HTMLElement).dataset.code;
      const shareText = `Join me on ForU IdentiFi! Use my invitation code: ${code}`;
      const inviteLink = `https://social.foruai.io/signin?code=${code}&utm_source=chrome-extension`;
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(inviteLink)}`;

      chrome.tabs.create({ url: tweetUrl });
    });
  });
}

export { renderReferralDetails, escapeHtml };
