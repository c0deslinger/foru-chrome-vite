// src/pages/panel/user/waitlist/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../lib/crypto-utils.js';
import { showCustomNotification } from '../user_tab/index.js';

/**
 * Render waitlist form
 */
export function renderWaitlistForm(
  container: HTMLElement, 
  storedData: any, 
  userProfileData: any
): void {
  const needsName = !userProfileData?.name || userProfileData.name.trim() === "";

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Join Our Waitlist</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">We'll notify you when it's your turn to access the platform</p>
      
      <div style="width:100%;max-width:300px;">
        ${needsName ? `
        <div style="margin-bottom:15px;">
          <input id="waitlist-name-input" type="text" placeholder="Enter your full name" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        ` : ""}
        <div style="margin-bottom:15px;">
          <input id="waitlist-email-input" type="email" placeholder="Enter your email address" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
        </div>
        <button id="join-waitlist-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Join Wait List
        </button>
        <button id="back-to-referral-btn" style="width:100%;padding:10px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:10px;">
          Back to Referral Code
        </button>
        <button id="back-to-login-waitlist-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Login Method
        </button>
      </div>
    </div>
  `;
}

/**
 * Render waitlist success message
 */
export function renderWaitlistSuccessMessage(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:20px;border-radius:50%;">
      
      <h2 style="color:#ececf1;margin-bottom:15px;text-align:center;font-size:18px;font-weight:600;">Thanks for Joining the Waitlist!</h2>
      
      <div style="background-color:#20232d;border-radius:16px;padding:16px;margin-bottom:24px;width:100%;max-width:350px;">
        <p style="color:#ffffff;font-size:12px;line-height:16px;text-align:center;margin:0;font-family:'Plus Jakarta Sans', sans-serif;">
          We respect your privacy. Your email will only be used to notify you when your access is ready — no spam, ever.
        </p>
      </div>
      
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:24px;text-align:center;line-height:1.5;">
        We'll email you when it's your time to unlock your AI-DID. In the meantime, here's how to stay connected and prepare for launch.
      </p>
      
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
        <p style="color:#ffffff;font-size:14px;font-weight:500;margin:0;font-family:'Plus Jakarta Sans', sans-serif;">
          Don't Miss out on our Updates
        </p>
        
        <div style="display:flex;gap:32px;align-items:center;">
          <!-- Discord -->
          <a href="https://discord.gg/foruai" target="_blank" style="text-decoration:none;position:relative;display:block;width:42px;height:42px;">
            <img src="${chrome.runtime.getURL(
              "images/social_bg_circle.svg"
            )}" alt="" style="width:42px;height:42px;" />
            <div style="position:absolute;top:6px;left:6px;width:30px;height:30px;overflow:hidden;">
              <img src="${chrome.runtime.getURL(
                "images/discord_icon_1.svg"
              )}" alt="" style="position:absolute;top:1.875px;left:1.875px;width:26.25px;height:26.25px;" />
              <img src="${chrome.runtime.getURL(
                "images/discord_icon_2.svg"
              )}" alt="" style="position:absolute;top:7.5px;left:4.6875px;width:20.625px;height:15px;" />
            </div>
          </a>
          
          <!-- Twitter X -->
          <a href="https://x.com/4UAICrypto" target="_blank" style="text-decoration:none;position:relative;display:block;width:42px;height:42px;">
            <img src="${chrome.runtime.getURL(
              "images/social_bg_circle.svg"
            )}" alt="" style="width:42px;height:42px;" />
            <div style="position:absolute;top:11px;left:11px;width:20px;height:20px;overflow:hidden;">
              <img src="${chrome.runtime.getURL(
                "images/twitter_x_icon.svg"
              )}" alt="" style="position:absolute;top:1.875px;left:1.25px;width:17.5px;height:16.25px;" />
            </div>
          </a>
          
          <!-- Telegram -->
          <a href="https://t.me/foruai" target="_blank" style="text-decoration:none;position:relative;display:block;width:42px;height:42px;">
            <img src="${chrome.runtime.getURL(
              "images/social_bg_circle.svg"
            )}" alt="" style="width:42px;height:42px;" />
            <div style="position:absolute;top:6px;left:6px;width:30px;height:30px;overflow:hidden;">
              <img src="${chrome.runtime.getURL(
                "images/telegram_icon_1.svg"
              )}" alt="" style="position:absolute;top:1.875px;left:1.875px;width:26.25px;height:26.25px;" />
              <img src="${chrome.runtime.getURL(
                "images/telegram_icon_2.svg"
              )}" alt="" style="position:absolute;top:8.4375px;left:6.5625px;width:14.0625px;height:12.9375px;" />
            </div>
          </a>
        </div>
      </div>
      
      <div style="margin-top:24px;max-width:350px;">
        <button id="back-to-waitlist-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:10px;">
          I have the code
        </button>
        <button id="back-to-login-thanks-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Login Method
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup waitlist form handlers
 */
export function setupWaitlistHandlers(
  storedData: any,
  userProfileData: any,
  onWaitlistJoined: () => void,
  onBackToReferral: () => void,
  onBackToLogin: () => void
): void {
  const needsName = !userProfileData?.name || userProfileData.name.trim() === "";

  // Event listener untuk join waitlist
  const joinWaitlistBtn = document.getElementById("join-waitlist-btn");
  if (joinWaitlistBtn) {
    joinWaitlistBtn.addEventListener("click", async () => {
      const emailInput = document.getElementById("waitlist-email-input") as HTMLInputElement;
      const email = emailInput?.value.trim();

      let name = userProfileData?.name || "";
      if (needsName) {
        const nameInput = document.getElementById("waitlist-name-input") as HTMLInputElement;
        name = nameInput?.value.trim();
        if (!name) {
          showCustomNotification("Please enter your name", true);
          return;
        }
      }

      if (!email) {
        showCustomNotification("Please enter your email address", true);
        return;
      }

      if (!isValidEmail(email)) {
        showCustomNotification("Please enter a valid email address", true);
        return;
      }

      const originalText = joinWaitlistBtn.textContent;
      joinWaitlistBtn.textContent = "Joining...";
      (joinWaitlistBtn as HTMLButtonElement).disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { name: name, email: email };
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
          showCustomNotification("Successfully joined the waitlist!");
          onWaitlistJoined();
        } else {
          throw new Error(data.message || "Failed to join waitlist");
        }
      } catch (error) {
        console.error("Error joining waitlist:", error);
        showCustomNotification(
          `Failed to join waitlist. Error: ${(error as Error).message || "Unknown error"}`,
          true
        );
      } finally {
        joinWaitlistBtn.textContent = originalText;
        (joinWaitlistBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  // Event listener untuk back to referral
  const backToReferralBtn = document.getElementById("back-to-referral-btn");
  if (backToReferralBtn) {
    backToReferralBtn.addEventListener("click", () => {
      onBackToReferral();
    });
  }

  // Event listener untuk back to login method
  const backToLoginWaitlistBtn = document.getElementById("back-to-login-waitlist-btn");
  if (backToLoginWaitlistBtn) {
    backToLoginWaitlistBtn.addEventListener("click", async () => {
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

        setTimeout(() => {
          onBackToLogin();
        }, 500);
      } catch (error) {
        console.error("Error during logout:", error);
        showCustomNotification("Error occurred, please try again", true);
      }
    });
  }
}

/**
 * Setup waitlist success handlers
 */
export function setupWaitlistSuccessHandlers(
  onBackToReferral: () => void,
  onBackToLogin: () => void
): void {
  // Event listeners untuk thanks message buttons
  setTimeout(() => {
    // Back button (kembali ke referral form)
    const backToWaitlistBtn = document.getElementById("back-to-waitlist-btn");
    if (backToWaitlistBtn) {
      backToWaitlistBtn.addEventListener("click", () => {
        onBackToReferral();
      });
    }

    // Back to login method button
    const backToLoginThanksBtn = document.getElementById("back-to-login-thanks-btn");
    if (backToLoginThanksBtn) {
      backToLoginThanksBtn.addEventListener("click", async () => {
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

          setTimeout(() => {
            onBackToLogin();
          }, 500);
        } catch (error) {
          console.error("Error during logout:", error);
          showCustomNotification("Error occurred, please try again", true);
        }
      });
    }
  }, 100);
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
