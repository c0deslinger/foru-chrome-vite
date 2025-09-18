// src/pages/content/button_view_profile/index.ts

/**
 * Inserts the "View Profile" icon button next to the Follow/Following button.
 * Updates on every navigation.
 */

let isStylesInjected = false;

async function injectStyles() {
  if (isStylesInjected) {
    return;
  }

  // Check if styles already exist
  const existingStyle = document.querySelector('#foru-view-profile-styles');
  if (existingStyle) {
    isStylesInjected = true;
    return;
  }

  // Load CSS content
  const cssResponse = await fetch(chrome.runtime.getURL('src/pages/content/button_view_profile/index.css'));
  const cssContent = await cssResponse.text();

  const styleElement = document.createElement('style');
  styleElement.id = 'foru-view-profile-styles';
  styleElement.textContent = cssContent;
  document.head.appendChild(styleElement);
  isStylesInjected = true;
  
  console.log('View Profile button styles injected');
}

function insertCustomViewProfileButton() {
  // Inject styles first
  injectStyles();

  const parts = window.location.pathname.split("/").filter(Boolean);
  const username = parts[0] || ""; // username from the path

  // Only run on valid profile pages (not home, explore, etc.)
  if (
    !username ||
    username === "home" ||
    username === "explore" ||
    username === "notifications" ||
    username === "messages" ||
    username === "compose" ||
    username === "settings" ||
    username === "i"
  ) {
    removeExistingViewProfileButton(); // Not a profile page, clean up.
    return;
  }

  removeExistingViewProfileButton(); // Clean up previous insertions to prevent duplicates.

  // Use a MutationObserver to wait for the necessary elements to load
  const observer = new MutationObserver((mutations, obs) => {
    // --- Part 2: Move "View Profile" button next to the Follow/Following button ---
    const followButtonPlacementDiv = document.querySelector(
      'div[data-testid="placementTracking"]'
    );
    const parentOfFollowPlacementDiv = followButtonPlacementDiv
      ? followButtonPlacementDiv.parentNode
      : null;

    if (
      parentOfFollowPlacementDiv &&
      !document.getElementById("foru-view-profile-btn")
    ) {
      const iconUrl = chrome.runtime.getURL("icon-128.png");
      const viewBtn = document.createElement("a");
      viewBtn.id = "foru-view-profile-btn"; // Give it an ID to prevent re-insertion
      // viewBtn.href = `https://foruai.io/profile/x/${username}`;
      viewBtn.href = `https://social.foruai.io`;
      viewBtn.target = "_blank";
      viewBtn.rel = "noopener";

      // Mimic Twitter's button styling.
      Object.assign(viewBtn.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        minWidth: "36px",
        minHeight: "36px",
        padding: "0",
        borderRadius: "50%",
        background: "#6c4cb3",
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: "700",
        fontSize: "0",
        cursor: "pointer",
        marginLeft: "12px",
        boxSizing: "border-box",
        verticalAlign: "middle", // Keep this
        lineHeight: "0",

        // --- START OF FINE-TUNING FOR VERTICAL ALIGNMENT ---
        // Adjust this value based on visual testing.
        // Try negative values if it's too low, positive if too high.
        transform: "translateY(-11px)", // Adjusted from 0.5px to -1px (move up)
        flexShrink: "0", // Prevent the button from shrinking
        // --- END OF FINE-TUNING FOR VERTICAL ALIGNMENT ---
      });

      const icon = document.createElement("img");
      icon.src = iconUrl;
      icon.alt = "ForU Profile";
      icon.style.width = "20px";
      icon.style.height = "20px";
      icon.style.objectFit = "contain";
      viewBtn.append(icon);

      followButtonPlacementDiv.insertAdjacentElement("afterend", viewBtn);
      console.log(
        "ForU: View Profile icon button inserted right after placementTracking div."
      );
      obs.disconnect(); // Disconnect observer once button is inserted
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback if elements are not found quickly (for debugging)
  setTimeout(() => {
    if (!document.getElementById("foru-view-profile-btn")) {
      console.warn(
        "ForU: View Profile button not found quickly, observer still running or element not present after timeout."
      );
      if (observer) observer.disconnect();
    }
  }, 5000);
}

function removeExistingViewProfileButton() {
  const existingViewBtn = document.getElementById("foru-view-profile-btn");
  if (existingViewBtn) existingViewBtn.remove();
}

// listen for URL changes from background script
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "urlChanged") {
    console.log(
      "ForU: URL changed detected, re-inserting custom view profile button."
    );
    insertCustomViewProfileButton();
  }
});

// initial run
insertCustomViewProfileButton();

// Expose for debugging (optional)
(window as any).insertCustomProfileButton = insertCustomViewProfileButton;

export default {};
