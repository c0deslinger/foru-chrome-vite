// src/pages/panel/global/user_digital_dna/index.ts

import { buildForuHeaders, generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';

export interface UserDigitalDnaApiConfig {
  type: 'public' | 'authenticated';
  username?: string;
  accessToken?: string;
  title?: string;
}

export interface DnaData {
  id: string;
  title: string;
  percentage: number;
  image?: string;
  created_at: string;
  tweet_highlight: string;
  description: string;
  rank?: string;
}

export interface UserProfileData {
  name?: string;
  email?: string;
  avatar?: string;
  twitter_account?: {
    profile_picture_url?: string;
    username?: string;
  };
  [key: string]: any;
}

/**
 * Helper: HTML encode function
 */
function htmlEncode(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;") 
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Fetch Digital DNA data from public API (for profile view)
 */
async function fetchPublicDigitalDna(username: string): Promise<DnaData[]> {
  try {
    if (!username) {
      console.log("🧬 No username available");
      return [];
    }

    console.log(`🧬 Fetching public DNA data for ${username}`);
    const dnaHeaders = await buildForuHeaders("GET", "", undefined);
    const dnaUrl = `${API_BASE_URL}/v1/public/user/dna/${username}`;
    console.log("➡️ Fetching DNA from", dnaUrl);
    const dnaResp = await fetch(dnaUrl, { headers: dnaHeaders });
    console.log("⬅️ DNA Status", dnaResp.status);

    if (dnaResp.ok) {
      const dnaJson = await dnaResp.json();
      console.log("🧬 DNA JSON", dnaJson);
      if (dnaJson.code === 200 && dnaJson.data && dnaJson.data.length > 0) {
        // Take top 4 items with rank
        const digitalDnaData = dnaJson.data.slice(0, 4).map((item: any, index: number) => ({
          id: `dna-${index}`,
          title: item.dna?.title || "Unknown",
          percentage: Math.round(item.percentage || 0),
          created_at: `${item.created_at}` || "Unknown",
          tweet_highlight: htmlEncode(item.tweet_highlight) || "Unknown",
          description: htmlEncode(item.dna?.description) || "Unknown",
          image: item.dna?.image || null,
          rank: index === 0 && item.percentage >= 100 ? "Top 5 Global" : null,
        }));
        console.log(`🧬 Loaded ${digitalDnaData.length} public DNA items`);
        return digitalDnaData;
      } else {
        console.log("🧬 No public DNA data available");
      }
    } else if (dnaResp.status === 404) {
      console.log("🧬 404 - No public DNA data found for user");
    } else {
      console.error("🧬 Public DNA API error:", dnaResp.status);
    }
  } catch (error) {
    console.error("🧬 Error fetching public DNA data:", error);
  }

  return [];
}

/**
 * Fetch Digital DNA data from authenticated API (for user tab)
 */
async function fetchAuthenticatedDigitalDna(accessToken: string): Promise<DnaData[]> {
  try {
    if (!accessToken) {
      console.log("🧬 No access token available for authenticated DNA data");
      return [];
    }

    console.log(`🧬 Fetching authenticated DNA data`);
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
      console.log("🧬 Authenticated DNA JSON", dnaJson);
      if (dnaJson.code === 200 && dnaJson.data && dnaJson.data.length > 0) {
        // Take top 4 items, no rank display
        const digitalDnaData = dnaJson.data.slice(0, 4).map((item: any, index: number) => ({
          id: `dna-${index}`,
          title: item.dna?.title || "Unknown",
          percentage: Math.round(item.percentage || 0),
          image: item.dna?.image || null,
          created_at: `${item.created_at}` || "Unknown",
          tweet_highlight: htmlEncode(item.tweet_highlight) || "Unknown",
          description: htmlEncode(item.dna?.description) || "Unknown",
        }));
        console.log(`🧬 Loaded ${digitalDnaData.length} authenticated DNA items`);
        return digitalDnaData;
      } else {
        console.log("🧬 No authenticated DNA data available");
      }
    } else if (dnaResponse.status === 404) {
      console.log("🧬 404 - No authenticated DNA data found for user");
    } else {
      console.error("🧬 Authenticated DNA API error:", dnaResponse.status);
    }
  } catch (error) {
    console.error("🧬 Error fetching authenticated DNA data:", error);
  }

  return [];
}

/**
 * Render DNA grid with data
 */
function renderDnaGrid(digitalDnaData: DnaData[]): string {
  return `
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
  `;
}

/**
 * Render empty DNA state
 */
function renderEmptyDna(title: string, isPublic: boolean): string {
  const description = isPublic 
    ? "This user is not yet registered on the FORU platform"
    : "Connect your socials and wallet to start revealing your identity traits — from interests to on-chain activity.";
  
  return `
    <div class="digital-dna-empty">
      <div class="dna-empty-icon">
        <img src="${chrome.runtime.getURL(
          "images/dna_molecule.png"
        )}" alt="DNA Molecule" style="width:75px;height:82px;object-fit:contain;">
      </div>
      <div class="dna-empty-title">${isPublic ? 'The Digital DNA Is Empty' : 'Your Digital DNA Is Empty'}</div>
      <div class="dna-empty-description">
        ${description}
      </div>
    </div>
  `;
}

/**
 * Global User Digital DNA Component
 * Renders the user's digital DNA grid or empty state
 * Supports both public (profile) and authenticated (user tab) API calls
 */
export async function renderUserDigitalDna(config: UserDigitalDnaApiConfig): Promise<string> {
  const { type, username, accessToken, title = 'Digital DNA' } = config;
  
  // Fetch DNA data based on configuration
  let digitalDnaData: DnaData[] = [];
  
  if (type === 'public' && username) {
    digitalDnaData = await fetchPublicDigitalDna(username);
  } else if (type === 'authenticated' && accessToken) {
    digitalDnaData = await fetchAuthenticatedDigitalDna(accessToken);
  } else {
    console.error('Invalid configuration for renderUserDigitalDna:', config);
    return renderEmptyDna(title, type === 'public');
  }

  // Render HTML
  const html = `
    <h3>${title}</h3>
    ${digitalDnaData.length === 0 ? renderEmptyDna(title, type === 'public') : renderDnaGrid(digitalDnaData)}
  `;

  return html;
}

/**
 * Render Digital DNA for user tab (authenticated context)
 * This function is specifically for the user tab context where we render into a container
 */
export async function renderUserDigitalDnaForUserTab(
  container: HTMLElement, 
  accessToken: string, 
  forceRefresh = false,
  userProfileData: UserProfileData | null = null
): Promise<void> {
  if (!container || !accessToken) {
    console.error("Target container or access token for digital DNA is not provided.");
    return;
  }

  // Show loading state
  container.innerHTML = `
    <h3>Your Digital DNA</h3>
    <div class="digital-dna-grid">
      <div class="shimmer dna-card" style="height: 80px;"></div>
      <div class="shimmer dna-card" style="height: 80px;"></div>
      <div class="shimmer dna-card" style="height: 80px;"></div>
      <div class="shimmer dna-card" style="height: 80px;"></div>
    </div>
  `;

  try {
    const digitalDnaData = await fetchAuthenticatedDigitalDna(accessToken);
    const dnaHtml = await renderUserDigitalDna({
      type: 'authenticated',
      accessToken,
      title: 'Your Digital DNA'
    });
    
    container.innerHTML = dnaHtml;
    
    // Add event listeners for image fallback
    const dnaImages = container.querySelectorAll('.dna-shield-img[data-fallback]') as NodeListOf<HTMLImageElement>;
    dnaImages.forEach(img => {
      img.addEventListener('error', function(this: HTMLImageElement) {
        const fallbackUrl = this.getAttribute('data-fallback');
        if (fallbackUrl && this.src !== fallbackUrl) {
          this.src = fallbackUrl;
        }
      });
    });

    // Add event listeners for DNA card clicks (user tab specific)
    const dnaCards = container.querySelectorAll('.dna-card');
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

    console.log("[UserDigitalDNA] Digital DNA section rendered for user tab");
  } catch (error) {
    console.error("Error rendering user digital DNA for user tab:", error);
    // Render empty state on error
    container.innerHTML = renderEmptyDna('Your Digital DNA', false);
  }
}

// Expose functions so they can be called from other components
(window as any).renderUserDigitalDna = renderUserDigitalDna;
(window as any).renderUserDigitalDnaForUserTab = renderUserDigitalDnaForUserTab;
