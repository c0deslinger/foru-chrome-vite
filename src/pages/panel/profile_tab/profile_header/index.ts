// src/profile/profile_header/index.ts

/**
 * Profile Header Component
 * Renders the profile avatar, username, location, bio, and profile details
 */
export async function renderProfileHeader(): Promise<string> {
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

  // --- 1) Get the latest avatar ---
  let avatarUrl = "";
  
  // First try: Look for "Opens profile photo" element
  const profilePhotoContainer = document.querySelector('[aria-label="Opens profile photo"]');
  if (profilePhotoContainer) {
    const img = profilePhotoContainer.querySelector('img') as HTMLImageElement;
    if (img && img.src) {
      avatarUrl = img.src;
    }
  }
  
  // Second try: Look for UserAvatar container
  if (!avatarUrl) {
    const userAvatarContainer = document.querySelector('[data-testid*="UserAvatar-Container"]');
    if (userAvatarContainer) {
      const img = userAvatarContainer.querySelector('img[src*="profile_images"]') as HTMLImageElement;
      if (img && img.src) {
        avatarUrl = img.src;
      }
    }
  }
  
  // Third try: Look in primary column
  if (!avatarUrl) {
    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      const avatarElem = primaryColumn.querySelector(
        'img[src*="profile_images"]'
      ) as HTMLImageElement;
      if (avatarElem) avatarUrl = avatarElem.src;
    }
  }
  
  // Fourth try: Global fallback
  if (!avatarUrl) {
    const fallback = document.querySelector('img[src*="profile_images"]') as HTMLImageElement;
    if (fallback) avatarUrl = fallback.src;
  }

  // --- 2) Get handle (username) from URL ---
  let handle = "";
  const parts = window.location.pathname.split("/").filter((p) => p);
  if (parts.length) handle = "@" + parts[0];

  // --- 3) Get display name ---
  let displayName = "";
  const userNameContainer = document.querySelector('div[data-testid="UserName"]');
  if (userNameContainer) {
    // Look for the first span with actual text content (display name)
    const spans = userNameContainer.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim();
      if (text && text.length > 0 && !text.startsWith('@') && !text.includes('Verified account')) {
        displayName = text;
        break;
      }
    }
    
    // Fallback: try to get from h1 if spans don't work
    if (!displayName) {
      const nameElem = userNameContainer.querySelector('h1');
      if (nameElem) displayName = nameElem.textContent?.trim() || "";
    }
  }

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

  // --- 6) Assemble HTML ---
  const html = `
    <div class="profile-header">
      <img src="${avatarUrl}" alt="avatar" />
      <div class="info">
        <div style="font-weight: bold; font-size: 16px; color: #ececf1; margin-bottom: 4px;">
          ${displayName || 'Unknown User'}
        </div>
        <div style="font-size: 12px; color: #8a8d93; margin-bottom: 2px;">
          ${handle}${jobText ? ` - ${jobText || locationText}` : ''}
        </div>
      </div>
    </div>

    <p class="profile-bio">${bioText}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
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

    <div style="margin-top: 16px; text-align: center;">
      <button id="generate-id-card-public-btn" class="generate-id-card-btn" style="
        background: linear-gradient(135deg, #FFB005, #FF8800);
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        color: white;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 160px;
      ">
        Generate ID Card
      </button>
    </div>
  `;

  return html;
}

// Expose function so it can be called from other components
(window as any).renderProfileHeader = renderProfileHeader;
