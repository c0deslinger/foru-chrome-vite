// src/profile/user_digital_dna/index.ts

import { buildForuHeaders, API_BASE_URL } from '../../../../lib/crypto-utils.js';

/**
 * User Digital DNA Component
 * Renders the user's digital DNA grid or empty state
 */
export async function renderUserDigitalDna(username: string): Promise<string> {
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

  // --- 7.5) Fetch Digital DNA data from API ---
  let digitalDnaData: any[] = [];
  let isDnaEmpty = false;
  
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

  // --- Assemble HTML ---
  const html = `
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
  `;

  return html;
}

// Expose function so it can be called from other components
(window as any).renderUserDigitalDna = renderUserDigitalDna;
