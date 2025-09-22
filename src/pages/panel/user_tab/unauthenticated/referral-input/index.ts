// src/pages/panel/user_tab/unauthenticated/referral-input/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../../lib/crypto-utils.js';
import { showCustomNotification } from '../../index.js';

/**
 * Render referral code input form
 */
export function renderReferralInputForm(
  container: HTMLElement, 
  storedData: any, 
  userProfileData: any
): void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;">
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Enter Referral Code</h3>
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">Do you have a referral code from a friend?</p>
      
      <div style="width:100%;max-width:300px;">
        <div style="margin-bottom:15px;">
          <input id="referral-input" type="text" placeholder="Enter referral code" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;text-transform:uppercase;" />
        </div>
        <button id="continue-referral-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
          Continue
        </button>
        <button id="no-code-btn" style="width:100%;padding:10px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:10px;">
          I don't have the code
        </button>
        <button id="back-to-signin-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to sign in method
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup referral input handlers
 */
export function setupReferralInputHandlers(
  storedData: any,
  userProfileData: any,
  onReferralVerified: () => void,
  onNoCode: () => void,
  onBackToLogin: () => void
): void {
  // Event listener untuk continue dengan referral code
  const continueReferralBtn = document.getElementById("continue-referral-btn");
  if (continueReferralBtn) {
    continueReferralBtn.addEventListener("click", async () => {
      const referralInput = document.getElementById("referral-input") as HTMLInputElement;
      const code = referralInput?.value.trim().toUpperCase();

      if (!code) {
        showCustomNotification("Please enter a referral code", true);
        return;
      }

      const originalText = continueReferralBtn.textContent;
      continueReferralBtn.textContent = "Verifying...";
      (continueReferralBtn as HTMLButtonElement).disabled = true;

      try {
        const currentTimestamp = Date.now().toString();
        const payload = { code: code };
        const signature = generateForuSignature("POST", payload, currentTimestamp);

        const response = await fetch(`${API_BASE_URL}/v1/referral/use`, {
          method: "POST",
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

        if (response.status === 200 || response.status === 201) {
          showCustomNotification("Referral code verified successfully!");
          // Refresh to continue to normal flow
          setTimeout(() => {
            onReferralVerified();
          }, 1000);
        } else {
          showCustomNotification("Invalid referral code, please try again", true);
        }
      } catch (error) {
        console.error("Error verifying referral code:", error);
        showCustomNotification("Invalid referral code, please try again", true);
      } finally {
        continueReferralBtn.textContent = originalText;
        (continueReferralBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  // Event listener untuk "I don't have the code"
  const noCodeBtn = document.getElementById("no-code-btn");
  if (noCodeBtn) {
    noCodeBtn.addEventListener("click", async () => {
      // Cek email di /v1/user/me terlebih dahulu
      try {
        const currentTimestamp = Date.now().toString();
        const signature = generateForuSignature("GET", "", currentTimestamp);

        const meResponse = await fetch(`${API_BASE_URL}/v1/user/me`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            Authorization: `Bearer ${storedData.accessToken}`,
            "x-foru-timestamp": currentTimestamp,
            "x-foru-signature": signature,
          },
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (meData?.code === 200 && meData.data && meData.data.email) {
            // Email sudah terisi, langsung ke Thanks for Joining
            onNoCode();
            return;
          }
        }
      } catch (error) {
        console.error("Error checking user email:", error);
      }

      // Jika email belum terisi atau error, lanjut ke waitlist form
      onNoCode();
    });
  }

  // Event listener untuk "Back to sign in method"
  const backToSigninBtn = document.getElementById("back-to-signin-btn");
  if (backToSigninBtn) {
    backToSigninBtn.addEventListener("click", async () => {
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
  const referralInput = document.getElementById("referral-input");
  if (referralInput) {
    referralInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const continueBtn = document.getElementById("continue-referral-btn");
        if (continueBtn) continueBtn.click();
      }
    });
  }
}
