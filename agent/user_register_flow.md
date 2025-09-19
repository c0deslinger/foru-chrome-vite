# User Registration & Onboarding Flow

> **Berdasarkan analisis lengkap dari `old/foru-identify/src/user/user_tab.js`**

## 📋 Overview

ForU AI Extension memiliki sistem registrasi dan onboarding yang komprehensif dengan multiple authentication methods dan conditional flow berdasarkan status user. Flow ini menangani login, name input, referral code, dan waitlist dengan state management yang robust.

## 🔄 Complete User Flow Diagram

```
┌─────────────────┐
│   User Opens    │
│   Extension     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  Check Storage  │
│  (accessToken)  │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │ Logged In? │
    └─────┬─────┘
          │
    ┌─────▼─────────────────────▼─────┐
    │ NO                        YES   │
    ▼                               ▼
┌─────────────────┐         ┌─────────────────┐
│  Login Options  │         │  Check /v1/user/me │
│  - Twitter      │         │  (User Profile)  │
│  - Email        │         └─────────┬───────┘
└─────────┬───────┘                   │
          │                     ┌─────▼─────┐
          ▼                     │ Has Name? │
┌─────────────────┐             └─────┬─────┘
│  Authentication │                   │
│  Process        │             ┌─────▼─────────────────▼─────┐
└─────────┬───────┘             │ NO                    YES   │
          │                     ▼                           ▼
          ▼                ┌─────────────────┐    ┌─────────────────┐
┌─────────────────┐        │  Name Input     │    │ Referral Used?  │
│  Post-Auth      │        │  Form           │    └─────────┬───────┘
│  Onboarding     │        └─────────┬───────┘              │
└─────────────────┘                  │                ┌─────▼─────────────────▼─────┐
                                     ▼                │ NO                    YES   │
                            ┌─────────────────┐        ▼                           ▼
                            │  Check Referral │   ┌─────────────────┐    ┌─────────────────┐
                            │  Status         │   │  Referral Code  │    │  Full User      │
                            └─────────────────┘   │  Input Form     │    │  Dashboard      │
                                                  └─────────┬───────┘    └─────────────────┘
                                                            │
                                                      ┌─────▼─────┐
                                                      │ Has Code? │
                                                      └─────┬─────┘
                                                            │
                                                ┌───────────▼───────────────▼───────────┐
                                                │ YES                           NO       │
                                                ▼                                       ▼
                                        ┌─────────────────┐                ┌─────────────────┐
                                        │  Verify Code    │                │  Join Waitlist  │
                                        │  Continue Flow  │                │  Form           │
                                        └─────────────────┘                └─────────┬───────┘
                                                                                     │
                                                                                     ▼
                                                                           ┌─────────────────┐
                                                                           │  Waitlist       │
                                                                           │  Success Page   │
                                                                           └─────────────────┘
```

## 🚪 1. Authentication Methods

### 🐦 Twitter OAuth Login
```javascript
// API Endpoint
GET ${API_BASE_URL}/v1/user-auth/twitter?redirect_uri=https://x.com/4UAICrypto

// Flow
1. User clicks "Login with Twitter"
2. Fetch OAuth URL dari backend
3. Open Twitter OAuth di new tab: chrome.tabs.create({ url: data.data })
4. User completes OAuth di Twitter
5. Extension receives callback dan stores access_token
6. Proceed to onboarding flow
```

### 📧 Email + OTP Login
```javascript
// API Endpoints
POST ${API_BASE_URL}/v1/user-auth/otp/request   // Send OTP
POST ${API_BASE_URL}/v1/user-auth/otp/verify    // Verify OTP

// Flow
1. User clicks "Login with Email"
2. Show email input form
3. User enters email + clicks "Send OTP"
4. API call untuk send OTP
5. If email not registered (404): Show registration link
6. If OTP sent (201): Langsung show OTP input form
7. User enters 6-digit OTP + clicks "Submit"
8. API call untuk verify OTP
9. If success: Store access_token + proceed to onboarding
```

#### 📱 OTP Input Features
```javascript
// 6-Digit OTP Input System
- Auto-focus navigation: input-1 → input-2 → ... → input-6
- Backspace navigation: input-6 ← input-5 ← ... ← input-1
- Resend countdown: 60-second timer dengan local storage persistence
- State persistence: Restore OTP form across page reloads
- Input validation: Numeric only, maxlength=1
```

#### 🔄 Email Login State Management
```javascript
// Local Storage Keys
foru_login_state     → 'login_buttons' | 'email_form' | 'otp_form'
foru_current_email   → Email yang sedang digunakan untuk OTP
foru_countdown_time  → Remaining countdown seconds untuk resend
foru_countdown_start → Countdown start timestamp

// State Transitions
login_buttons → email_form → otp_form → (success) → clear state
```

## 👤 2. Post-Authentication Onboarding

### 📝 Name Input Form
```javascript
// Trigger Condition
if (!userProfileData?.name || userProfileData.name.trim() === "") {
  renderNameInputForm();
}

// API Endpoint
PUT ${API_BASE_URL}/v1/user/profile
Body: { name: "User Full Name" }

// Features
- Required field validation
- Enter key submission
- Loading state: "Saving..."
- Success: Auto-proceed to next step
- Back button: Logout + return to login options
```

### 🎫 Referral Code Input Form
```javascript
// Trigger Condition  
if (userProfileData?.referral?.used === false) {
  renderReferralInputForm();
}

// API Endpoint
POST ${API_BASE_URL}/v1/referral/use
Body: { code: "REFERRAL123" }

// Features
- Auto-uppercase input transformation
- Code validation
- Enter key submission
- Loading state: "Verifying..."
- Success: Continue to full dashboard
- "I don't have the code": Go to waitlist form
- Back button: Logout + return to login options
```

## 📋 3. Waitlist System

### 📝 Waitlist Form
```javascript
// Trigger Condition
User clicks "I don't have the code" dari referral form

// API Endpoint
PUT ${API_BASE_URL}/v1/user/profile
Body: { name: "Name", email: "email@example.com" }

// Features
- Conditional name input (jika belum ada)
- Email validation dengan regex
- Loading state: "Joining..."
- Success: Show waitlist success message
- Navigation: Back to referral code atau back to login
```

### 🎉 Waitlist Success Message
```javascript
// Features
- Privacy assurance message
- Social media links (Discord, Twitter X, Telegram)
- Complex icon layering dengan multiple SVG images
- Navigation options:
  - "I have the code": Back to referral input
  - "Back to Login Method": Logout + return to login
```

#### 🔗 Social Media Integration
```javascript
// Discord
href: "https://discord.gg/foruai"
icons: social_bg_circle.svg + discord_icon_1.svg + discord_icon_2.svg

// Twitter X  
href: "https://x.com/4UAICrypto"
icons: social_bg_circle.svg + twitter_x_icon.svg

// Telegram
href: "https://t.me/foruai"  
icons: social_bg_circle.svg + telegram_icon_1.svg + telegram_icon_2.svg
```

## 🔄 4. Flow Decision Logic

### 📊 User Status Check (`/v1/user/me`)

```javascript
// Response Analysis
const userProfileData = response.data;

// Decision Tree
if (!userProfileData?.name || userProfileData.name.trim() === "") {
  // Step 1: Name required
  renderNameInputForm();
} else if (userProfileData?.referral?.used === false) {
  // Step 2: Referral code required  
  renderReferralInputForm();
} else {
  // Step 3: Full access - show dashboard
  renderUserProfileCard() + renderReferralDetails();
}
```

### 🔄 State Transitions
```javascript
// After Name Save Success
1. Re-check /v1/user/me untuk updated data
2. if (name saved && referral not used) → renderReferralInputForm()
3. if (name saved && referral used) → renderReferralSection() (full dashboard)

// After Referral Code Success
1. showCustomNotification("Referral code verified successfully!")
2. setTimeout(() => renderReferralSection(true), 1000) → full dashboard

// After Waitlist Join Success
1. showCustomNotification("Successfully joined the waitlist!")
2. renderWaitlistSuccessMessage() → thanks page dengan social links
```

## 🎨 5. UI/UX Design Patterns

### 🖼️ Visual Elements

```css
/* Consistent Styling Patterns */
Container: {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

ForU Icon: {
  width: 60px;
  height: 60px;
  margin-bottom: 15px;
  border-radius: 50%;
  src: chrome.runtime.getURL("icons/icon128.png");
}

Primary Button: {
  width: 100%;
  padding: 12px;
  background-color: #6c4cb3;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
}

Secondary Button: {
  width: 100%;
  padding: 8px;
  background: transparent;
  color: #aeb0b6;
  border: 1px solid #343541;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

Input Field: {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #343541;
  background: #2a2b2e;
  color: #ececf1;
  font-size: 14px;
  box-sizing: border-box;
}
```

### 🎨 Color Scheme
```css
/* ForU Brand Colors */
Primary Purple:   #6c4cb3    /* Buttons, accents */
Twitter Blue:     #1DA1F2    /* Twitter login button */
Email Green:      #28a745    /* Email login button */
Background Dark:  #20232d    /* Container backgrounds */
Input Dark:       #2a2b2e    /* Input backgrounds */
Border Gray:      #343541    /* Input borders */
Text Light:       #ececf1    /* Primary text */
Text Muted:       #aeb0b6    /* Secondary text */
Error Red:        #d32f2f    /* Error notifications */
```

## 📡 6. API Integration

### 🔑 Authentication Headers
```javascript
// Standard Headers untuk semua API calls
headers: {
  "accept": "application/json",
  "x-foru-apikey": `foru-private-${NEXT_PUBLIC_API_PRIVATE_KEY}`,
  "Authorization": `Bearer ${accessToken}`, // Untuk authenticated calls
  "Content-Type": "application/json",       // Untuk POST/PUT
  "x-foru-timestamp": timestamp,
  "x-foru-signature": signature
}

// Signature Generation
generateForuSignature(method, payload, timestamp)
```

### 🌐 API Endpoints Summary
```javascript
// Authentication
GET  /v1/user-auth/twitter           // Get Twitter OAuth URL
POST /v1/user-auth/otp/request      // Send OTP to email
POST /v1/user-auth/otp/verify       // Verify OTP code

// User Management  
GET  /v1/user/me                    // Get user profile data
PUT  /v1/user/profile               // Update user profile (name, email)

// Referral System
POST /v1/referral/use               // Use referral code
```

## 🎯 7. Error Handling & Edge Cases

### 📧 Email Registration Errors
```javascript
// 404 Email Not Registered
if (response.status === 404) {
  // Show custom notification dengan registration link
  notification.innerHTML = `
    This email is not registered yet, please register on our 
    <span onclick="chrome.tabs.create({url: 'https://social.foruai.io/register'})">
      website
    </span> first.
  `;
}
```

### 🎫 Referral Code Errors
```javascript
// Invalid Referral Code
if (response.status !== 200 && response.status !== 201) {
  showCustomNotification("Invalid referral code, please try again", true);
}
```

### ⏱️ Session Management
```javascript
// Session Expiry Detection
if (!storedData.accessToken) {
  // Return to login options
  renderLoginButtons();
}

// Logout Flow
await chrome.storage.local.remove([
  "accessToken", "id", "twitterId", "googleId", 
  "expiresAt", "loginType", "email"
]);
```

## 🔄 8. State Persistence & Recovery

### 💾 Local Storage Strategy
```javascript
// Login State Persistence
localStorage.setItem('foru_login_state', 'email_form');
localStorage.setItem('foru_current_email', 'user@example.com');

// OTP Countdown Persistence
localStorage.setItem('foru_countdown_time', '45');
localStorage.setItem('foru_countdown_start', Date.now().toString());

// State Recovery Logic
function restoreLoginState() {
  const savedState = getLoginState();
  const savedEmail = getCurrentEmail();
  
  switch (savedState) {
    case 'email_form':
      showEmailForm();
      if (savedEmail) emailInput.value = savedEmail;
      break;
    case 'otp_form':
      showOtpForm();
      clearOTPInputs();
      if (savedEmail) {
        otpMessage.innerHTML = `We've sent a secure link to <strong>${savedEmail}</strong>`;
        restoreCountdown();
      }
      break;
    default:
      showLoginButtons();
  }
}
```

### ⏰ Countdown Timer System
```javascript
// Countdown Implementation
function startCountdown() {
  let timeLeft = getCountdownTime() || 60;
  saveCountdownTime(timeLeft);
  
  const interval = setInterval(() => {
    timeLeft--;
    saveCountdownTime(timeLeft);
    countdownText.textContent = `(${timeLeft}s)`;
    
    if (timeLeft <= 0) {
      clearInterval(interval);
      resendBtn.disabled = false;
      resendBtn.style.background = "#6c4cb3";
      clearCountdownTime();
    }
  }, 1000);
}

// Countdown Persistence Across Page Reloads
function getCountdownTime() {
  const savedTime = localStorage.getItem('foru_countdown_time');
  const savedStart = localStorage.getItem('foru_countdown_start');
  
  if (savedTime && savedStart) {
    const elapsed = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
    return Math.max(0, parseInt(savedTime) - elapsed);
  }
  return 0;
}
```

## 🎮 9. User Interaction Patterns

### ⌨️ Keyboard Navigation
```javascript
// Enter Key Submissions
nameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") saveNameBtn.click();
});

referralInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") continueReferralBtn.click();
});

// OTP Auto-Navigation
otpInput[i].addEventListener("input", (e) => {
  if (e.target.value.length === 1 && i < 6) {
    otpInput[i+1].focus(); // Auto-advance
  }
});

otpInput[i].addEventListener("keydown", (e) => {
  if (e.key === "Backspace" && input.value === "" && i > 1) {
    otpInput[i-1].focus(); // Auto-backtrack
  }
});
```

### 🔄 Form Navigation
```javascript
// Navigation Buttons
"Back to Login Method"    → Logout + clear storage + show login options
"Back to Email Input"     → showEmailForm() + clear OTP + save email state  
"Back to Referral Code"   → renderReferralInputForm()
"I don't have the code"   → Check email in /v1/user/me → waitlist or success
"I have the code"         → renderReferralInputForm()
```

## 🎨 10. Visual Components

### 🖼️ Icon System
```javascript
// ForU Icon (consistent across all forms)
<img src="${chrome.runtime.getURL("icons/icon128.png")}" 
     alt="ForU Icon" 
     style="width:60px;height:60px;margin-bottom:15px;border-radius:50%;" />

// Email Icon (email forms)
<img src="${chrome.runtime.getURL("images/sms_icon.svg")}" 
     alt="Email" 
     style="width:64px;height:64px;" />
```

### 🎨 Social Media Icons (Waitlist Success)
```javascript
// Complex Icon Layering System
<a href="https://discord.gg/foruai" target="_blank">
  <img src="images/social_bg_circle.svg" />        // Background circle
  <div style="position:absolute;top:6px;left:6px;">
    <img src="images/discord_icon_1.svg" />        // Base icon
    <img src="images/discord_icon_2.svg" />        // Overlay icon
  </div>
</a>

// Twitter X (simplified)
<a href="https://x.com/4UAICrypto" target="_blank">
  <img src="images/social_bg_circle.svg" />
  <img src="images/twitter_x_icon.svg" />
</a>

// Telegram (complex layering)
<a href="https://t.me/foruai" target="_blank">
  <img src="images/social_bg_circle.svg" />
  <img src="images/telegram_icon_1.svg" />
  <img src="images/telegram_icon_2.svg" />
</a>
```

## 🔧 11. Implementation Details

### 🎯 Form Rendering Functions
```javascript
// Core Rendering Functions
renderReferralSection(forceRefresh = false)     // Main controller
renderNameInputForm(container, storedData, userProfileData)
renderReferralInputForm(container, storedData, userProfileData)  
renderWaitlistForm(container, storedData, userProfileData)
renderWaitlistSuccessMessage(container)

// Helper Functions
setupLoginHandlers(container)           // Setup all login event listeners
showLoginButtons()                      // Show initial login options
showEmailForm()                         // Show email input form
showOtpForm()                          // Show OTP verification form
```

### 🔄 State Management Functions
```javascript
// State Persistence
saveLoginState(state, email = "")       // Save current form state
getLoginState()                         // Get saved form state
getCurrentEmail()                       // Get saved email
clearLoginState()                       // Clear all login state

// OTP Countdown
saveCountdownTime(remainingTime)        // Save countdown state
getCountdownTime()                      // Calculate remaining time
clearCountdownTime()                    // Clear countdown state
startCountdown()                        // Start 60-second countdown

// Form Helpers
clearOTPInputs()                        // Clear all 6 OTP input fields
isValidEmail(email)                     // Email format validation
```

### 🚨 Error Handling Patterns
```javascript
// API Error Handling
try {
  const response = await fetch(apiUrl, options);
  const data = await response.json();
  
  if (response.ok && data.code === 200) {
    // Success handling
  } else {
    // Error handling dengan specific status codes
    showCustomNotification(data.message || "Operation failed", true);
  }
} catch (error) {
  console.error("API Error:", error);
  showCustomNotification("Network error, please try again", true);
} finally {
  // Reset button states
  button.textContent = originalText;
  button.disabled = false;
}
```

## 📱 12. Notification System

### 🔔 Custom Notification Implementation
```javascript
function showCustomNotification(message, isError = false) {
  // Create or reuse notification element
  let notificationDiv = document.getElementById("custom-notification");
  if (!notificationDiv) {
    notificationDiv = document.createElement("div");
    notificationDiv.id = "custom-notification";
    document.body.appendChild(notificationDiv);
  }

  // Styling
  notificationDiv.style.backgroundColor = isError ? "#d32f2f" : "#6c4cb3";
  notificationDiv.style.position = "fixed";
  notificationDiv.style.bottom = "20px";
  notificationDiv.style.left = "50%";
  notificationDiv.style.transform = "translateX(-50%)";
  notificationDiv.style.zIndex = "1000";
  
  // Animation
  notificationDiv.style.opacity = "0";
  notificationDiv.style.transition = "opacity 0.3s ease-in-out";
  setTimeout(() => notificationDiv.style.opacity = "1", 10);
  
  // Auto-hide
  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    setTimeout(() => notificationDiv.style.display = "none", 300);
  }, isError ? 5000 : 3000);
}
```

## 🔄 13. Complete Flow Summary

### 📋 Registration Flow Steps
```
1. 🚪 Authentication
   ├── Twitter OAuth → Immediate access to onboarding
   └── Email + OTP → 6-digit verification → access to onboarding

2. 👤 Profile Completion  
   ├── Name Input (required) → API call → continue
   └── Skip if name already exists

3. 🎫 Referral System
   ├── Has Referral Code → Verify → Full Access
   └── No Referral Code → Waitlist → Thanks Page

4. 📋 Waitlist (if no referral)
   ├── Join Waitlist → Email notification setup
   └── Social Media Links → Community engagement

5. 🎉 Full Access
   ├── User Dashboard → Profile, Metrics, Badges
   └── Referral Management → Generate & share codes
```

### 🎯 Key Success Metrics
- **Seamless Authentication**: Twitter OAuth atau Email OTP
- **Progressive Onboarding**: Name → Referral → Dashboard
- **Fallback System**: Waitlist untuk users tanpa referral code
- **State Persistence**: Resume flow across page reloads
- **Community Engagement**: Social media integration di waitlist

---

**📝 Note**: Dokumentasi ini berdasarkan analisis lengkap dari `old/foru-identify/src/user/user_tab.js` yang berisi 1827 lines dengan implementasi complete registration dan onboarding flow.
