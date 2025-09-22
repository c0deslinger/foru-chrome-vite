// src/pages/panel/user/unauthenticated/login/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../../lib/crypto-utils.js';
import { showCustomNotification } from '../../user_tab/index.js';

/**
 * Render login buttons (Twitter and Email)
 */
export function renderLoginForm(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;box-sizing:border-box;">
      <img src="${chrome.runtime.getURL(
        "icon-128.png"
      )}" alt="ForU Icon" style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;filter:grayscale(100%);opacity:0.7;">
      <p style="color:#aeb0b6;font-size:14px;margin-bottom:25px;line-height:1.5;">Please log in to get your social profile data.</p>
      <button id="login-twitter-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 25px;background-color:#1DA1F2;color:#ffffff;border:none;border-radius:9999px;cursor:pointer;font-size:15px;font-weight:bold;min-width:200px;box-sizing:border-box;margin-bottom:10px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.21-6.914L4.93 21.75H1.625l7.844-8.914L0 2.25h8.08L12 10.74 18.244 2.25zm-1.54 1.3L8.14 19.5h2.917l7.585-16.25h-2.916z"></path></g></svg>
        Login with Twitter
      </button>

      <button id="login-email-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 25px;background-color:#28a745;color:#ffffff;border:none;border-radius:9999px;cursor:pointer;font-size:15px;font-weight:bold;min-width:200px;box-sizing:border-box;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        Login with Email
      </button>
    </div>
    <div id="email-login-form" style="display:none;padding:20px;box-sizing:border-box;">
      <h3 style="color:#ececf1;margin-bottom:15px;text-align:center;">Login with Email</h3>
      <div style="display:flex;justify-content:center;margin-bottom:20px;">
        <img src="${chrome.runtime.getURL(
          "images/sms_icon.svg"
        )}" alt="Email" style="width:64px;height:64px;" />
      </div>
      <div style="margin-bottom:15px;">
        <input id="email-input" type="email" placeholder="Enter your email address" style="width:100%;padding:12px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:14px;box-sizing:border-box;" />
      </div>
      <button id="email-login-submit-btn" style="width:100%;padding:12px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;margin-bottom:10px;">
        Send OTP
      </button>
      <button id="back-to-login-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
        Back to Login Method
      </button>
    </div>
  `;
}

/**
 * Setup login handlers for Twitter and Email login
 */
export function setupLoginHandlers(onOtpSent: (email: string) => void): void {
  // Twitter login handler
  const twitterBtn = document.getElementById("login-twitter-btn");
  if (twitterBtn) {
    twitterBtn.addEventListener("click", async () => {
      try {
        const backendUrl = `${API_BASE_URL}/v1/user-auth/twitter`;
        const redirectUrlParam = encodeURIComponent("https://x.com/4UAICrypto");
        const fetchUrl = `${backendUrl}?redirect_uri=${redirectUrlParam}`;

        console.log("Fetching Twitter login URL from backend:", fetchUrl);

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}. Response: ${errorBody}`
          );
        }
        const data = await response.json();

        if (
          data &&
          data.code === 200 &&
          typeof data.data === "string" &&
          data.data.startsWith("http")
        ) {
          chrome.tabs.create({ url: data.data });
        } else {
          console.error("Invalid backend response:", data);
          const errorMessage = data.message || "Unknown error format.";
          showCustomNotification(
            `Failed to get authentication URL: ${errorMessage}`,
            true
          );
        }
      } catch (error) {
        console.error("Error during Twitter login initiation:", error);
        showCustomNotification(
          `Failed to start Twitter login process. Error: ${
            (error as Error).message || "Unknown error"
          }. Please try again.`,
          true
        );
      }
    });
  }

  // Email login button handler
  const emailBtn = document.getElementById("login-email-btn");
  if (emailBtn) {
    emailBtn.addEventListener("click", () => {
      console.log('[ForU] Login with email clicked');
      showEmailForm();
      const emailInput = document.getElementById("email-input") as HTMLInputElement;
      if (emailInput) emailInput.focus();
    });
  }

  // Back to login options handler
  const backToLoginBtn = document.getElementById("back-to-login-btn");
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", () => {
      showLoginButtons();
      const emailInput = document.getElementById("email-input") as HTMLInputElement;
      if (emailInput) emailInput.value = "";
    });
  }

  // Email form submit handler
  const emailSubmitBtn = document.getElementById("email-login-submit-btn");
  if (emailSubmitBtn) {
    emailSubmitBtn.addEventListener("click", async () => {
      const emailInput = document.getElementById("email-input") as HTMLInputElement;
      if (!emailInput) return;

      const email = emailInput.value.trim();
      if (!email) {
        showCustomNotification("Please enter your email address", true);
        return;
      }

      if (!isValidEmail(email)) {
        showCustomNotification("Please enter a valid email address", true);
        return;
      }

      try {
        emailSubmitBtn.textContent = "Sending...";
        emailSubmitBtn.style.pointerEvents = "none";

        const timestamp = Date.now().toString();
        const payload = { email };
        const signature = generateForuSignature("POST", payload, timestamp);

        const response = await fetch(`${API_BASE_URL}/v1/user-auth/otp/request`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
            "Content-Type": "application/json",
            "x-foru-timestamp": timestamp,
            "x-foru-signature": signature,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.status === 404) {
          // Email not registered yet
          showCustomNotification("", true);
          setTimeout(() => {
            const notification = document.getElementById("custom-notification");
            if (notification) {
              notification.innerHTML = "";
              const textPart1 = document.createTextNode(
                "This email is not registered yet, please register on our "
              );
              const linkPart = document.createElement("span");
              linkPart.textContent = "website";
              linkPart.style.textDecoration = "underline";
              linkPart.style.cursor = "pointer";
              linkPart.addEventListener("click", () => {
                chrome.tabs.create({
                  url: "https://social.foruai.io/register",
                });
              });
              const textPart2 = document.createTextNode(" first.");
              
              notification.appendChild(textPart1);
              notification.appendChild(linkPart);
              notification.appendChild(textPart2);
            }
          }, 100);
        } else if (response.status === 201 && data.code === 201) {
          // OTP sent successfully
          showCustomNotification("We sent you an OTP code on your email");
          onOtpSent(email);
        } else {
          console.error("Send OTP failed:", data);
          showCustomNotification(data.message || "Failed to send OTP", true);
        }
      } catch (error) {
        console.error("Send OTP error:", error);
        showCustomNotification("Failed to send OTP. Please try again.", true);
      } finally {
        emailSubmitBtn.textContent = "Send OTP";
        emailSubmitBtn.style.pointerEvents = "auto";
      }
    });
  }

  // Allow Enter key submission for email input
  const emailInput = document.getElementById("email-input");
  if (emailInput) {
    emailInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const submitBtn = document.getElementById("email-login-submit-btn");
        if (submitBtn) submitBtn.click();
      }
    });
  }
}

// Helper functions
function showLoginButtons() {
  const loginBtns = document.getElementById("login-twitter-btn")?.parentElement;
  const emailForm = document.getElementById("email-login-form");
  
  if (loginBtns) loginBtns.style.display = "flex";
  if (emailForm) emailForm.style.display = "none";
}

function showEmailForm() {
  console.log('[ForU] Showing email form');
  const loginBtns = document.getElementById("login-twitter-btn")?.parentElement;
  const emailForm = document.getElementById("email-login-form");
  
  if (loginBtns) loginBtns.style.display = "none";
  if (emailForm) emailForm.style.display = "block";
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
