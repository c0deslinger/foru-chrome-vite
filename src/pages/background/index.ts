// ======================================
// File: src/pages/background/index.ts
// ======================================

// Menggunakan Map untuk menyimpan status visibilitas Side Panel per windowId.
let sidePanelVisibilityStatus = new Map();

// Listener untuk pesan dari content scripts dan lainnya.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(
    "[Background] Received message:",
    message,
    "from tabId:",
    sender.tab?.id
  );

  if (message?.action === "openSidePanel") {
    const tab = sender.tab;
    if (tab && typeof tab.id === "number") {
      // Side Panel akan terbuka jika URL tab cocok dengan 'matches' di manifest.json
      chrome.sidePanel
        .open({ tabId: tab.id })
        .then(() => {
          sendResponse({ opened: true, method: "sidePanel.open" });
        })
        .catch((err) => {
          console.error(
            "[Background] sidePanel.open() (from content script) error:",
            err
          );
          sendResponse({ opened: false, error: err.toString() });
        });
    } else {
      console.error(
        "[Background] No valid tabId to open side panel from content script."
      );
      sendResponse({ opened: false, error: "No valid tabId" });
    }
    return true;
  } else if (message?.action === "getSidePanelVisibility") {
    const tabWindowId = sender.tab?.windowId;
    const isVisible = tabWindowId
      ? sidePanelVisibilityStatus.get(tabWindowId) || false
      : false;
    console.log(
      "[Background] Responding to getSidePanelVisibility, current status for window",
      tabWindowId,
      ":",
      isVisible
    );
    sendResponse({ isVisible: isVisible });
    return true;
  }
});

// Deteksi ketika Side Panel dibuka/ditutup
if (chrome.sidePanel && chrome.sidePanel.onVisibilityChanged) {
  chrome.sidePanel.onVisibilityChanged.addListener((changeInfo) => {
    const isVisible = changeInfo.isVisible;
    const windowId = changeInfo.windowId;

    sidePanelVisibilityStatus.set(windowId, isVisible);
    console.log(
      `[Background] Side Panel visibility changed for window ${windowId}: ${isVisible}`
    );

    chrome.tabs.query(
      { url: ["*://*.twitter.com/*", "*://*.x.com/*"], windowId: windowId },
      (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            console.log(
              `[Background] Sending 'sidePanelVisibilityChanged' to tab ${tab.id} (window ${windowId}), isVisible: ${isVisible}`
            );
            chrome.tabs
              .sendMessage(tab.id, {
                action: "sidePanelVisibilityChanged",
                isVisible: isVisible,
              })
              .catch((error) => {
                if (error.message.includes("Could not establish connection")) {
                  console.warn(
                    `[Background] Content script not ready in tab ${tab.id} or connection lost.`
                  );
                } else {
                  console.error(
                    `[Background] Error sending message to tab ${tab.id}:`,
                    error
                  );
                }
              });
          }
        });
      }
    );
  });
}

// ==========================================================
// PERBAIKAN AKHIR: Gunakan setPanelBehavior untuk klik ikon ekstensi
// ==========================================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setOptions({
      enabled: true,
    })
    .catch((error) =>
      console.error("Error setting initial sidePanel options:", error)
    );

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
});

// Listener untuk perubahan URL (SPA)
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
  const url = new URL(details.url);

  if (details.url.includes("twitter.com/") || details.url.includes("x.com/")) {
    const pathSegments = url.pathname.split("/").filter(Boolean);

    const isProfilePage =
      pathSegments.length === 1 &&
      !url.searchParams.has("f") &&
      !url.searchParams.has("q");
    const isRelevantPage =
      pathSegments.length > 0 &&
      (isProfilePage ||
        ["home", "explore", "notifications", "messages"].includes(
          pathSegments[0]
        ));

    if (isRelevantPage) {
      console.log(
        "[Background] URL changed detected via webNavigation:",
        details.url,
        "for tab:",
        details.tabId
      );
      chrome.tabs
        .sendMessage(details.tabId, { action: "urlChanged", url: details.url })
        .catch((error) => {
          if (error.message.includes("Could not establish connection")) {
            console.warn(
              `[Background] Content script not ready in tab ${details.tabId} or connection lost.`
            );
          } else {
            console.error(
              `[Background] Error sending message (urlChanged) to tab ${details.tabId}:`,
              error
            );
          }
        });
    }

    // --- Perbaikan untuk menangani redirect login Twitter dan Google ---
    const authRedirectHostnames = [
      "x.com",
      "foruai.io",
      "social-analyzer-backend-920680503230.asia-southeast1.run.app",
    ];

    const isAuthRedirectUrl = authRedirectHostnames.some(
      (hostname) =>
        url.hostname === hostname || url.hostname.endsWith(`.${hostname}`)
    );

    if (isAuthRedirectUrl && url.searchParams.has("accessToken")) {
      console.log("[Background] OAuth redirect detected!");

      const id = url.searchParams.get("id");
      const twitterId = url.searchParams.get("twitterId");
      const googleId = url.searchParams.get("googleId");
      const accessToken = url.searchParams.get("accessToken");
      const expiresAt = url.searchParams.get("expiresAt");
      const status = url.searchParams.get("status");

      let loginType = "unknown";
      if (twitterId) {
        loginType = "twitter";
      } else if (googleId) {
        loginType = "google";
      }

      if (status === "success" && accessToken) {
        chrome.storage.local
          .set({
            id: id,
            twitterId: twitterId,
            googleId: googleId,
            accessToken: accessToken,
            expiresAt: expiresAt,
            loginType: loginType,
          })
          .then(() => {
            console.log(
              `[Background] User data stored. Login Type: ${loginType}.`
            );

            // Perbaikan: Kirim pesan ke **semua** halaman ekstensi (termasuk sidepanel)
            // yang dapat menerima pesan dari service worker.
            // Gunakan chrome.runtime.sendMessage tanpa tabId, maka semua listener
            // di halaman ekstensi akan menerimanya.
            chrome.runtime
              .sendMessage({ action: "authSuccessRefreshReferral" }) // Ganti nama action agar unik
              .catch((error) => {
                console.warn(
                  "Failed to send authSuccessRefreshReferral message to extension pages:",
                  error
                );
              });

            // Tutup tab autentikasi setelah berhasil
            chrome.tabs.remove(details.tabId);
          })
          .catch((error) => {
            console.error("Error storing auth data:", error);
          });
      } else {
        console.warn(
          "[Background] OAuth redirect status not success or missing token."
        );
      }
    }
  }
});

console.log('[Background] ForU AI background script loaded');
