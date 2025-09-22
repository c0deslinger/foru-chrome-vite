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

  // --- 6) Assemble HTML ---
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
  `;

  return html;
}

// Expose function so it can be called from other components
(window as any).renderProfileHeader = renderProfileHeader;
