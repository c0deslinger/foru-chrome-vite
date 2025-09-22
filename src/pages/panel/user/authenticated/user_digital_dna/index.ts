// src/pages/panel/user/authenticated/user_digital_dna/index.ts

import {
  generateForuSignature,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL,
} from "../../../../../lib/crypto-utils";

interface UserProfileData {
  name?: string;
  email?: string;
  avatar?: string;
  twitter_account?: {
    profile_picture_url?: string;
    username?: string;
  };
  [key: string]: any;
}

interface DnaData {
  id: string;
  title: string;
  percentage: number;
  image?: string;
  created_at: string;
  tweet_highlight: string;
  description: string;
}

/**
 * Renders the user's digital DNA section
 * @param {HTMLElement} targetContainer - Element where the DNA will be rendered
 * @param {string} accessToken - Access token for API authentication
 * @param {boolean} forceRefresh - Force refresh data
 * @param {UserProfileData} userProfileData - User profile data for DNA dialog
 */
async function renderUserDigitalDna(
  targetContainer: HTMLElement,
  accessToken: string,
  forceRefresh = false,
  userProfileData: UserProfileData | null = null
): Promise<void> {
  
  if (!targetContainer) {
    console.error("Target container for digital DNA is not provided.");
    return;
  }

  // Show loading state
  targetContainer.innerHTML = `
    <h3>Your Digital DNA</h3>
    <div class="digital-dna-grid">
      <div class="shimmer dna-card" style="height: 80px;"></div>
      <div class="shimmer dna-card" style="height: 80px;"></div>
      <div class="shimmer dna-card" style="height: 80px;"></div>
      <div class="shimmer dna-card" style="height: 80px;"></div>
    </div>
  `;

  // Fetch Digital DNA data from API
  let digitalDnaData: DnaData[] = [];
  let isDnaEmpty = false;

  // Helper: HTML encode function
  function htmlEncode(str: string): string {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;") 
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  try {
    console.log(`[DigitalDNA] Fetching DNA data from /v1/user/persona/dna`);
    const dnaTimestamp = Date.now().toString();
    const dnaSignature = generateForuSignature("GET", "", dnaTimestamp);
    const dnaResponse = await fetch(
      `${API_BASE_URL}/v1/user/persona/dna`,
      {
        headers: {
          accept: "application/json",
          "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
          "x-foru-timestamp": dnaTimestamp,
          "x-foru-signature": dnaSignature,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (dnaResponse.ok) {
      const dnaJson = await dnaResponse.json();
      console.log("[DigitalDNA] API Response:", dnaJson);
      if (dnaJson.code === 200 && dnaJson.data && dnaJson.data.length > 0) {
        // Take top 4 items, no rank display
        digitalDnaData = dnaJson.data.slice(0, 4).map((item: any, index: number) => ({
          id: `dna-${index}`,
          title: item.dna?.title || "Unknown",
          percentage: Math.round(item.percentage || 0),
          image: item.dna?.image || null,
          created_at: `${item.created_at}` || "Unknown",
          tweet_highlight: htmlEncode(item.tweet_highlight) || "Unknown",
          description: htmlEncode(item.dna?.description) || "Unknown",
        }));
        console.log(`[DigitalDNA] Loaded ${digitalDnaData.length} DNA items`);
      } else {
        console.log("[DigitalDNA] No DNA data available");
        isDnaEmpty = true;
      }
    } else if (dnaResponse.status === 404) {
      console.log("[DigitalDNA] 404 - No DNA data found for user");
      isDnaEmpty = true;
    } else {
      console.error("[DigitalDNA] API error:", dnaResponse.status);
      isDnaEmpty = true;
    }
  } catch (error) {
    console.error("[DigitalDNA] Error fetching DNA data:", error);
    isDnaEmpty = true;
  }

  // Render DNA section
  const dnaHtml = `
    <h3>Your Digital DNA</h3>
    ${
      isDnaEmpty
        ? `
      <div class="digital-dna-empty">
        <div class="dna-empty-icon">
          <img src="${chrome.runtime.getURL(
            "images/dna_molecule.png"
          )}" alt="DNA Molecule" style="width:75px;height:82px;object-fit:contain;">
        </div>
        <div class="dna-empty-title">Your Digital DNA Is Empty</div>
        <div class="dna-empty-description">
          Connect your socials and wallet to start revealing your identity traits — from interests to on-chain activity.
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
                      <div class="dna-progress-bar ${dna.id}-bar" style="width: ${dna.percentage}%"></div>
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
  `;

  targetContainer.innerHTML = dnaHtml;
  
  // Add event listeners for image fallback
  const dnaImages = targetContainer.querySelectorAll('.dna-shield-img[data-fallback]') as NodeListOf<HTMLImageElement>;
  dnaImages.forEach(img => {
    img.addEventListener('error', function(this: HTMLImageElement) {
      const fallbackUrl = this.getAttribute('data-fallback');
      if (fallbackUrl && this.src !== fallbackUrl) {
        this.src = fallbackUrl;
      }
    });
  });

  // Add event listeners for DNA card clicks
  const dnaCards = targetContainer.querySelectorAll('.dna-card');
  console.log('Found', dnaCards.length, 'DNA cards in user digital DNA');
  
  dnaCards.forEach((item, index) => {
    item.addEventListener('click', () => {
      console.log('DNA card clicked in user digital DNA:', index);
      const dnaData = item.getAttribute('data-dna');
      if (dnaData) {
        try {
          const dna = JSON.parse(dnaData);
          console.log('DNA data from user digital DNA:', dna);
          
          // Send message to content script to show DNA dialog on web page
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showDnaDialog',
                dna: dna,
                userProfileData: userProfileData // Pass userProfileData
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error sending message to content script:', chrome.runtime.lastError);
                } else {
                  console.log('Message sent to content script, response:', response);
                }
              });
            }
          });
        } catch (error) {
          console.error('Error parsing DNA data in user digital DNA:', error);
        }
      } else {
        console.log('No DNA data found in user digital DNA');
      }
    });
  });

  console.log("[UserDigitalDNA] Digital DNA section rendered");
}

export { renderUserDigitalDna };
