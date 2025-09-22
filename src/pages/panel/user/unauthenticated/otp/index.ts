// src/pages/panel/user/unauthenticated/otp/index.ts

import { generateForuSignature, NEXT_PUBLIC_API_PRIVATE_KEY, API_BASE_URL } from '../../../../../lib/crypto-utils.js';
import { showCustomNotification } from '../../user_tab/index.js';

interface OtpState {
  email: string;
  countdownInterval: NodeJS.Timeout | null;
}

let otpState: OtpState = {
  email: "",
  countdownInterval: null
};

/**
 * Render OTP verification form
 */
export function renderOtpForm(container: HTMLElement, email: string): void {
  // If email is provided, save it to localStorage and state
  if (email) {
    otpState.email = email;
    localStorage.setItem('foru_current_email', email);
  } else {
    // Try to get email from localStorage if not provided
    const savedEmail = localStorage.getItem('foru_current_email') || "";
    otpState.email = savedEmail;
    email = savedEmail;
  }
  
  container.innerHTML = `
    <div id="otp-verification-form" style="display:block;padding:20px;box-sizing:border-box;">
      <!-- 1. Logo email (on black background) -->
      <img src="${chrome.runtime.getURL(
        "images/sms_icon.svg"
      )}" alt="Email Icon" style="width:60px;height:60px;margin-bottom:15px;display:block;margin-left:auto;margin-right:auto;">
      
      <!-- 2. Text check your email (on black background) -->
      <h3 style="color:#ececf1;margin-bottom:10px;text-align:center;">Check your email</h3>
      
      <!-- 3. Text we've sent... (on black background) -->
      <p id="otp-message" style="color:#aeb0b6;font-size:14px;margin-bottom:25px;text-align:center;line-height:1.5;">We've sent a secure link to <strong>${email}</strong></p>
      
      <!-- 4. 6 input digit -->
      <div style="margin-bottom:15px;">
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:15px;">
          <input id="otp-input-1" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
          <input id="otp-input-2" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
          <input id="otp-input-3" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
          <input id="otp-input-4" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
          <input id="otp-input-5" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
          <input id="otp-input-6" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" style="width:40px;height:40px;padding:8px;border-radius:8px;border:1px solid #343541;background:#2a2b2e;color:#ececf1;font-size:16px;text-align:center;box-sizing:border-box;" />
        </div>
      </div>
      
      <!-- 5. Tombol submit OTP -->
      <button id="otp-verify-btn" style="width:100%;padding:8px;background-color:#6c4cb3;color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:15px;">
        Submit OTP
      </button>
      
      <!-- 6. Tulisan didn't receive it... -->
      <div style="text-align:center;margin-bottom:10px;">
        <p style="color:#aeb0b6;font-size:12px;margin:0 0 4px 0;">Didn't receive it?</p>
        <p style="color:#aeb0b6;font-size:12px;margin:0 0 4px 0;">Check your spam or promotions folder</p>
        <p style="color:#aeb0b6;font-size:12px;margin:0;">or</p>
      </div>
      
      <!-- 7. Tombol resend OTP -->
      <button id="resend-otp-btn" style="width:100%;padding:8px;background:transparent;color:#9ca3af;border:1px solid #343541;border-radius:8px;cursor:not-allowed;font-size:14px;margin-bottom:10px;" disabled>
        <span id="resend-text">Resend OTP</span> <span id="countdown-text">(60s)</span>
      </button>
      
      <!-- 8. Tombol back to email input -->
      <button id="back-to-email-btn" style="width:100%;padding:8px;background:transparent;color:#aeb0b6;border:1px solid #343541;border-radius:8px;cursor:pointer;font-size:14px;">
        Back to Email Input
      </button>
    </div>
  `;
}

/**
 * Setup OTP handlers
 */
export function setupOtpHandlers(
  onVerificationSuccess: () => void,
  onBackToEmail: () => void
): void {
  // Restore email from localStorage if not already set
  if (!otpState.email) {
    const savedEmail = localStorage.getItem('foru_current_email') || "";
    if (savedEmail) {
      otpState.email = savedEmail;
      console.log('[ForU OTP] Email restored from localStorage:', savedEmail);
      
      // Update the message with the restored email
      const otpMessage = document.getElementById("otp-message");
      if (otpMessage) {
        otpMessage.innerHTML = `We've sent a secure link to <strong>${savedEmail}</strong>`;
      }
    }
  }

  setupOtpInputHandlers();
  setupOtpVerifyHandler(onVerificationSuccess);
  setupResendHandler();
  setupBackToEmailHandler(onBackToEmail);
  
  // Start countdown
  startCountdown(60);
  
  // Focus first input
  const firstInput = document.getElementById("otp-input-1") as HTMLInputElement;
  if (firstInput) firstInput.focus();
}

/**
 * Setup OTP input handlers for auto-focus and validation
 */
function setupOtpInputHandlers(): void {
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
    if (input) {
      // Keypress validation - only allow numbers
      input.addEventListener("keypress", (e) => {
        if (!/[0-9]/.test(e.key)) {
          e.preventDefault();
          return;
        }
      });

      // Input event - move to next field
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        
        // Remove any non-numeric characters
        const numericOnly = value.replace(/[^0-9]/g, '');
        
        // Limit to 1 digit
        const limitedValue = numericOnly.substring(0, 1);
        
        // Update the input value if it changed
        if (value !== limitedValue) {
          target.value = limitedValue;
        }

        // Move to next field if value is entered
        if (limitedValue && i < 6) {
          const nextInput = document.getElementById(`otp-input-${i + 1}`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
          }
        }

        // Auto-submit if all 6 digits are entered
        if (i === 6 && limitedValue) {
          const fullOTP = getOTPValue();
          if (fullOTP.length === 6) {
            setTimeout(() => {
              const verifyBtn = document.getElementById("otp-verify-btn");
              if (verifyBtn) verifyBtn.click();
            }, 100);
          }
        }
      });

      // Backspace handling
      input.addEventListener("keydown", (e) => {
        const target = e.target as HTMLInputElement;
        if (e.key === "Backspace" && !target.value && i > 1) {
          const prevInput = document.getElementById(`otp-input-${i - 1}`) as HTMLInputElement;
          if (prevInput) {
            prevInput.focus();
          }
        }
      });

      // Paste handling
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || (window as any).clipboardData).getData('text');
        const numericOnly = pastedText.replace(/[^0-9]/g, '');
        
        if (numericOnly.length > 0) {
          // Distribute pasted numbers across all fields
          for (let j = 1; j <= 6; j++) {
            const fieldInput = document.getElementById(`otp-input-${j}`) as HTMLInputElement;
            if (fieldInput) {
              fieldInput.value = numericOnly.charAt(j - 1) || '';
            }
          }
          
          // Focus on the last filled field or first empty field
          const lastFilledIndex = Math.min(numericOnly.length, 6);
          const focusInput = document.getElementById(`otp-input-${lastFilledIndex}`) as HTMLInputElement;
          if (focusInput) {
            focusInput.focus();
          }
        }
      });

      // Prevent drop
      input.addEventListener("drop", (e) => {
        e.preventDefault();
      });

      // Allow Enter key submission
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const verifyBtn = document.getElementById("otp-verify-btn");
          if (verifyBtn) verifyBtn.click();
        }
      });
    }
  }
}

/**
 * Setup OTP verification handler
 */
function setupOtpVerifyHandler(onSuccess: () => void): void {
  const otpVerifyBtn = document.getElementById("otp-verify-btn");
  if (otpVerifyBtn) {
    otpVerifyBtn.addEventListener("click", async () => {
      const otpCode = getOTPValue();

      if (otpCode.length !== 6) {
        showCustomNotification("Please enter the complete 6-digit OTP", true);
        return;
      }

      if (!otpState.email) {
        // Try to restore email from localStorage one more time
        const savedEmail = localStorage.getItem('foru_current_email') || "";
        if (savedEmail) {
          otpState.email = savedEmail;
          console.log('[ForU OTP] Email restored during verification:', savedEmail);
        } else {
          console.error('[ForU OTP] No email found in state or localStorage');
          showCustomNotification("Session expired, please start again", true);
          return;
        }
      }

      console.log('[ForU OTP] Verifying OTP for email:', otpState.email);

      try {
        otpVerifyBtn.textContent = "Verifying...";
        otpVerifyBtn.style.pointerEvents = "none";

        const timestamp = Date.now().toString();
        const payload = { email: otpState.email, otp: otpCode };
        const signature = generateForuSignature("POST", payload, timestamp);

        const response = await fetch(`${API_BASE_URL}/v1/user-auth/otp/verify`, {
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

        if (response.ok && data.code === 201 && data.data) {
          // Save login data
          await chrome.storage.local.set({
            accessToken: data.data.token,
            expiresAt: data.data.expires_at,
            loginType: "email",
            email: otpState.email,
          });

          showCustomNotification("Login successful!");

          // Trigger auth refresh message
          chrome.runtime.sendMessage({
            action: "authSuccessRefreshReferral",
          });

          // Clear state
          clearOTPInputs();
          clearCountdownTime();
          
          onSuccess();
        } else {
          console.error("OTP verification failed:", data);
          showCustomNotification(data.message || "Invalid OTP", true);
        }
      } catch (error) {
        console.error("OTP verification error:", error);
        showCustomNotification("Failed to verify OTP. Please try again.", true);
      } finally {
        otpVerifyBtn.textContent = "Submit OTP";
        otpVerifyBtn.style.pointerEvents = "auto";
      }
    });
  }
}

/**
 * Setup resend OTP handler
 */
function setupResendHandler(): void {
  const resendBtn = document.getElementById("resend-otp-btn");
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if ((resendBtn as HTMLButtonElement).disabled) {
        const countdownText = document.getElementById("countdown-text");
        const remainingTime = countdownText?.textContent?.replace(/[()]/g, '') || '';
        showCustomNotification(`Please wait until ${remainingTime} to resend`, true);
        return;
      }

      if (!otpState.email) {
        // Try to restore email from localStorage
        const savedEmail = localStorage.getItem('foru_current_email') || "";
        if (savedEmail) {
          otpState.email = savedEmail;
          console.log('[ForU OTP] Email restored during resend:', savedEmail);
        } else {
          console.error('[ForU OTP] No email found for resend');
          showCustomNotification("Session expired, please start again", true);
          return;
        }
      }

      try {
        resendBtn.textContent = "Sending...";
        resendBtn.style.pointerEvents = "none";

        const timestamp = Date.now().toString();
        const payload = { email: otpState.email };
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

        if (response.status === 201) {
          showCustomNotification("OTP resent successfully");
          clearCountdownTime();
          startCountdown(60);
        } else {
          const data = await response.json();
          console.error("Resend OTP failed:", data);
          showCustomNotification(data.message || "Failed to resend OTP", true);
        }
      } catch (error) {
        console.error("Resend OTP error:", error);
        showCustomNotification("Failed to resend OTP. Please try again.", true);
      } finally {
        resendBtn.innerHTML = '<span id="resend-text">Resend OTP</span> <span id="countdown-text">(60s)</span>';
        const resendElement = resendBtn as HTMLButtonElement;
        if (resendElement.disabled) {
          resendBtn.style.background = "transparent";
          resendBtn.style.color = "#9ca3af";
          resendBtn.style.cursor = "not-allowed";
        } else {
          resendBtn.style.background = "transparent";
          resendBtn.style.color = "#aeb0b6";
          resendBtn.style.cursor = "pointer";
        }
        resendBtn.style.pointerEvents = "auto";
      }
    });
  }
}

/**
 * Setup back to email handler
 */
function setupBackToEmailHandler(onBackToEmail: () => void): void {
  const backToEmailBtn = document.getElementById("back-to-email-btn");
  if (backToEmailBtn) {
    backToEmailBtn.addEventListener("click", () => {
      clearOTPInputs();
      if (otpState.countdownInterval) {
        clearInterval(otpState.countdownInterval);
      }
      clearCountdownTime();
      // Clear email from localStorage when going back to email input
      localStorage.removeItem('foru_current_email');
      otpState.email = "";
      console.log('[ForU OTP] Email cleared when going back to email input');
      onBackToEmail();
    });
  }
}

/**
 * Start countdown for resend button
 */
function startCountdown(initialCountdown: number = 60): void {
  const countdownTextElement = document.getElementById("countdown-text");
  const resendBtn = document.getElementById("resend-otp-btn") as HTMLButtonElement;
  
  if (!countdownTextElement || !resendBtn) {
    console.log('[ForU] Countdown elements not found');
    return;
  }

  let countdown = initialCountdown;
  resendBtn.disabled = true;
  resendBtn.style.background = "transparent";
  resendBtn.style.color = "#9ca3af";
  resendBtn.style.cursor = "not-allowed";

  countdownTextElement.textContent = `(${countdown}s)`;

  if (otpState.countdownInterval) {
    clearInterval(otpState.countdownInterval);
  }

  otpState.countdownInterval = setInterval(() => {
    countdown--;
    countdownTextElement.textContent = `(${countdown}s)`;
    
    saveCountdownTime(countdown);

    if (countdown <= 0) {
      clearInterval(otpState.countdownInterval!);
      resendBtn.disabled = false;
      countdownTextElement.textContent = "";
      resendBtn.style.background = "transparent";
      resendBtn.style.color = "#aeb0b6";
      resendBtn.style.cursor = "pointer";
      clearCountdownTime();
    }
  }, 1000);

  console.log('[ForU] Countdown started with', countdown, 'seconds');
}

// Helper functions
function getOTPValue(): string {
  let otp = '';
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
    if (input) {
      otp += input.value;
    }
  }
  return otp;
}

function clearOTPInputs(): void {
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }
}

function saveCountdownTime(remainingTime: number): void {
  localStorage.setItem('foru_countdown_time', remainingTime.toString());
  localStorage.setItem('foru_countdown_start', Date.now().toString());
}

function clearCountdownTime(): void {
  localStorage.removeItem('foru_countdown_time');
  localStorage.removeItem('foru_countdown_start');
}

/**
 * Clear all OTP-related localStorage data
 */
export function clearOtpSession(): void {
  localStorage.removeItem('foru_current_email');
  localStorage.removeItem('foru_countdown_time');
  localStorage.removeItem('foru_countdown_start');
  localStorage.removeItem('foru_login_state');
  otpState.email = "";
  if (otpState.countdownInterval) {
    clearInterval(otpState.countdownInterval);
    otpState.countdownInterval = null;
  }
  console.log('[ForU OTP] All OTP session data cleared');
}

export function getEmail(): string {
  return otpState.email;
}

export function setEmail(email: string): void {
  otpState.email = email;
  localStorage.setItem('foru_current_email', email);
  console.log('[ForU OTP] Email saved to localStorage:', email);
}
