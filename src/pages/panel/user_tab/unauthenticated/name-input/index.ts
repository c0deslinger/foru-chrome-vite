// src/pages/panel/user_tab/unauthenticated/name-input/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../../lib/crypto-utils.js';
import { showCustomNotification } from '../../index.js';

/**
 * Render name input form
 */
export function renderNameInputForm(
  container: HTMLElement, 
  storedData: any, 
  userProfileData: any
): void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Complete Your Profile</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">Please enter your name to continue</p>
      
      <div style="width:100%;max-width:300px;">
        <div style="margin-bottom:15px;">
          <input id="name-input" type="text" placeholder="Enter your full name" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        <button id="save-name-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Save Name
        </button>
        <button id="back-to-login-name-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to login method
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup name input handlers
 */
export function setupNameInputHandlers(
  storedData: any,
  onNameSaved: (updatedUserData: any) => void,
  onBackToLogin: () => void
): void {
  // Event listener untuk save name
  const saveNameBtn = document.getElementById("save-name-btn");
  if (saveNameBtn) {
    saveNameBtn.addEventListener("click", async () => {
      const nameInput = document.getElementById("name-input") as HTMLInputElement;
      const name = nameInput?.value.trim();

      if (!name) {
        showCustomNotification("Please enter your name", true);
        return;
      }

      const originalText = saveNameBtn.textContent;
      saveNameBtn.textContent = "Saving...";
      (saveNameBtn as HTMLButtonElement).disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { name: name };
        const signature = generateForuSignature("PUT", payload, currentTimestamp);

        const response = await fetch(`${API_BASE_URL}/v1/user/profile`, {
          method: "PUT",
          headers: {
            accept: "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            Authorization: `Bearer ${storedData.accessToken}`,
            "Content-Type": "application/json",
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.status === 200 && data.code === 200) {
          showCustomNotification("Name saved successfully!");

          // Re-check /v1/user/me to get updated data and continue flow
          try {
            const recheckTimestamp = Date.now().toString();
            const recheckSignature = generateForuSignature("GET", "", recheckTimestamp);

            const recheckResponse = await fetch(`${API_BASE_URL}/v1/user/me`, {
              method: "GET",
              headers: {
                accept: "application/json",
                "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
                Authorization: `Bearer ${storedData.accessToken}`,
                "x-foru-timestamp": recheckTimestamp,
                "x-foru-signature": recheckSignature,
              },
            });

            if (recheckResponse.ok) {
              const recheckData = await recheckResponse.json();
              if (recheckData?.code === 200 && recheckData.data) {
                const updatedUserData = recheckData.data;

                // Check if name is now available and check referral status
                if (updatedUserData.name && updatedUserData.name.trim() !== "") {
                  setTimeout(() => {
                    onNameSaved(updatedUserData);
                  }, 1000);
                } else {
                  // Name still empty, something went wrong
                  setTimeout(() => {
                    onNameSaved(null);
                  }, 1000);
                }
              } else {
                // Fallback to null
                setTimeout(() => {
                  onNameSaved(null);
                }, 1000);
              }
            } else {
              // Fallback to null
              setTimeout(() => {
                onNameSaved(null);
              }, 1000);
            }
          } catch (recheckError) {
            console.error("Error rechecking user data:", recheckError);
            // Fallback to null
            setTimeout(() => {
              onNameSaved(null);
            }, 1000);
          }
        } else {
          throw new Error(data.message || "Failed to save name");
        }
      } catch (error) {
        console.error("Error saving name:", error);
        showCustomNotification(
          `Failed to save name. Error: ${(error as Error).message || "Unknown error"}`,
          true
        );
      } finally {
        saveNameBtn.textContent = originalText;
        (saveNameBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  // Event listener untuk "Back to login method"
  const backToLoginNameBtn = document.getElementById("back-to-login-name-btn");
  if (backToLoginNameBtn) {
    backToLoginNameBtn.addEventListener("click", async () => {
      // Logout current session and return to login methods
      try {
        await chrome.storage.local.remove([
          "accessToken",
          "id",
          "twitterId",
          "googleId",
          "expiresAt",
          "loginType",
          "email",
        ]);

        showCustomNotification("Returning to sign in options");

        // Return to login screen
        setTimeout(() => {
          onBackToLogin();
        }, 500);
      } catch (error) {
        console.error("Error during logout:", error);
        showCustomNotification("Error occurred, please try again", true);
      }
    });
  }

  // Allow Enter key submission
  const nameInput = document.getElementById("name-input");
  if (nameInput) {
    nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const saveBtn = document.getElementById("save-name-btn");
        if (saveBtn) saveBtn.click();
      }
    });
  }
}
