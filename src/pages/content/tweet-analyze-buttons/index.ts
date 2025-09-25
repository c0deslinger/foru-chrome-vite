// src/inject/tweet-analyze-buttons.ts

import { getBodyBackgroundColor, isLightColor } from '../../../lib/body-color-utils.js';

/**
 * TweetAnalyzeButtons - Class for adding "Analyze Tweet" buttons to tweets
 * Integrates with TweetAnalysisDialog for AI-powered analysis
 */

/**
 * Get dynamic button colors based on body background color
 * If background is light, return light theme colors; if dark, return current colors
 */
function getDynamicButtonColors(): { backgroundColor: string; fontColor: string; borderColor: string } {
  try {
    const bodyColor = getBodyBackgroundColor();
    const isLight = isLightColor(bodyColor);
    
    if (isLight) {
      // Light background: use black button with white text
      return {
        backgroundColor: '#000000',
        fontColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.2)'
      };
    } else {
      // Dark background: use current glassmorphism colors
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        fontColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      };
    }
  } catch (error) {
    console.warn('[ForU Analyze Button] Error getting dynamic button colors:', error);
    // Fallback to current colors
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      fontColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)'
    };
  }
}

// CSS Styles for Analyze Tweet Button
const ANALYZE_BUTTON_CSS = `
/* Analyze Tweet Button Styles - Dynamic Colors */
.foru-analyze-tweet-button {
  background: var(--foru-button-bg, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--foru-button-border, rgba(255, 255, 255, 0.2));
  border-radius: 20px;
  padding: 8px 16px;
  color: var(--foru-button-text, white);
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-left: 8px;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.foru-analyze-tweet-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(114, 70, 206, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.foru-analyze-tweet-button:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.foru-analyze-tweet-button:hover::before {
  opacity: 1;
}

.foru-analyze-tweet-button:active {
  transform: translateY(0);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.foru-analyze-tweet-button:disabled {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.foru-analyze-tweet-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.foru-analyze-tweet-loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .foru-analyze-tweet-button {
    padding: 6px 12px;
    font-size: 11px;
    margin-left: 4px;
  }
  
  .foru-analyze-tweet-icon {
    width: 12px;
    height: 12px;
  }
}
`;

/**
 * TweetAnalyzeButtons Class
 */
class TweetAnalyzeButtons {
  private isStylesInjected = false;
  private processedTweets = new Set<HTMLElement>();
  private observer: MutationObserver | null = null;
  private processTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.injectStyles();
    this.init();
  }

  /**
   * Inject CSS styles into document head
   */
  injectStyles() {
    if (this.isStylesInjected) {
      return;
    }

    // Check if styles already exist
    const existingStyle = document.querySelector('#foru-analyze-tweet-button-styles');
    if (existingStyle) {
      this.isStylesInjected = true;
      return;
    }

    // Get dynamic button colors based on background
    const buttonColors = getDynamicButtonColors();

    const styleElement = document.createElement('style');
    styleElement.id = 'foru-analyze-tweet-button-styles';
    styleElement.textContent = ANALYZE_BUTTON_CSS;
    document.head.appendChild(styleElement);

    // Set CSS custom properties for dynamic colors
    document.documentElement.style.setProperty('--foru-button-bg', buttonColors.backgroundColor);
    document.documentElement.style.setProperty('--foru-button-text', buttonColors.fontColor);
    document.documentElement.style.setProperty('--foru-button-border', buttonColors.borderColor);

    this.isStylesInjected = true;
    
    console.log('Analyze tweet button styles injected with dynamic colors');
  }

  /**
   * Initialize the tweet analyze buttons functionality
   */
  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.startObserving();
        this.addButtonsToExistingTweets();
      });
    } else {
      this.startObserving();
      this.addButtonsToExistingTweets();
    }
  }

  /**
   * Start observing DOM changes to add buttons to new tweets
   */
  startObserving() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new tweet elements were added
              if ((node as Element).querySelector && (
                (node as Element).querySelector('article') ||
                (node as Element).querySelector('div[data-testid="tweet"]') ||
                (node as Element).querySelector('[role="article"]') ||
                (node as Element).matches('article') ||
                (node as Element).matches('div[data-testid="tweet"]') ||
                (node as Element).matches('[role="article"]')
              )) {
                shouldProcess = true;
              }
            }
          });
        }
      });

      if (shouldProcess) {
        // Debounce the processing
        clearTimeout(this.processTimeout);
        this.processTimeout = setTimeout(() => {
          this.addButtonsToExistingTweets();
        }, 500);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('Started observing DOM changes for new tweets');
  }

  /**
   * Add analyze buttons to all existing tweets
   */
  addButtonsToExistingTweets() {
    const tweetSelectors = [
      'article',
      'div[data-testid="tweet"]',
      '[role="article"]'
    ];

    let allTweets: Element[] = [];
    tweetSelectors.forEach(selector => {
      const tweets = document.querySelectorAll(selector);
      allTweets = allTweets.concat(Array.from(tweets));
    });

    // Remove duplicates
    const uniqueTweets = [...new Set(allTweets)];

    uniqueTweets.forEach(tweet => {
      this.addButtonToTweet(tweet as HTMLElement);
    });

    console.log(`Processed ${uniqueTweets.length} tweets for analyze buttons`);
  }

  /**
   * Add analyze button to a specific tweet
   */
  addButtonToTweet(tweetElement: HTMLElement) {
    // Skip if already processed
    if (this.processedTweets.has(tweetElement)) {
      return;
    }

    // Skip if button already exists
    if (tweetElement.querySelector('.foru-analyze-tweet-button')) {
      return;
    }

    // Extract tweet data
    const tweetData = this.extractTweetData(tweetElement);
    
    // Skip if no valid tweet data
    if (!tweetData.text || tweetData.text.trim().length === 0) {
      return;
    }

    // Find the action buttons container
    const actionContainer = this.findActionContainer(tweetElement);
    
    if (!actionContainer) {
      return;
    }

    // Create analyze button
    const analyzeButton = this.createAnalyzeButton(tweetData);
    
    // Insert button into action container
    actionContainer.appendChild(analyzeButton);
    
    // Mark as processed
    this.processedTweets.add(tweetElement);
    
    console.log('Added analyze button to tweet:', tweetData.author || tweetData.handle);
  }

  /**
   * Extract tweet data from tweet element
   */
  extractTweetData(tweetElement: HTMLElement) {
    try {
      // Author name
      let author = "";
      const authorElem = tweetElement.querySelector('div[data-testid="User-Name"] span');
      if (authorElem) {
        author = authorElem.textContent?.trim() || "";
      } else {
        const nameSpans = tweetElement.querySelectorAll('span[dir="ltr"]');
        for (const span of nameSpans) {
          const text = span.textContent?.trim();
          if (text && !text.startsWith("@") && !text.includes("·") && text.length > 0) {
            author = text;
            break;
          }
        }
      }

      // Handle
      let handle = "";
      const handleElem = Array.from(tweetElement.querySelectorAll("span")).find((s) => {
        const txt = s.textContent?.trim() || "";
        return txt.startsWith("@");
      });
      if (handleElem) {
        handle = handleElem.textContent?.trim() || "";
      }

      // Tweet text
      let text = "";
      const textElem = tweetElement.querySelector("div[lang]");
      if (textElem) {
        text = textElem.textContent?.trim() || "";
      } else {
        const textDivs = tweetElement.querySelectorAll('div[data-testid="tweetText"]');
        if (textDivs.length > 0) {
          text = textDivs[0].textContent?.trim() || "";
        } else {
          const allDivs = tweetElement.querySelectorAll("div");
          for (const div of allDivs) {
            const divText = div.textContent?.trim();
            if (divText && divText.length > 10 && 
                !div.querySelector("button") && 
                !div.querySelector("a") && 
                !div.querySelector("time")) {
              text = divText;
              break;
            }
          }
        }
      }

      return { author, handle, text };
    } catch (error) {
      console.error('Error extracting tweet data:', error);
      return { author: "", handle: "", text: "" };
    }
  }

  /**
   * Find the action buttons container in a tweet
   */
  findActionContainer(tweetElement: HTMLElement): HTMLElement | null {
    // Try multiple selectors for action containers
    const selectors = [
      'div[role="group"]',
      'div[data-testid="tweetText"] + div',
      'div[lang] + div',
      'div:has(button[data-testid="like"])',
      'div:has(button[data-testid="reply"])'
    ];

    for (const selector of selectors) {
      const container = tweetElement.querySelector(selector) as HTMLElement;
      if (container && this.hasActionButtons(container)) {
        return container;
      }
    }

    // Fallback: look for any div with action buttons
    const allDivs = tweetElement.querySelectorAll('div');
    for (const div of allDivs) {
      if (this.hasActionButtons(div as HTMLElement)) {
        return div as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Check if a container has action buttons
   */
  hasActionButtons(container: HTMLElement): boolean {
    const actionButtonSelectors = [
      'button[data-testid="reply"]',
      'button[data-testid="retweet"]',
      'button[data-testid="like"]',
      'a[href*="/analytics"]'
    ];

    return actionButtonSelectors.some(selector => 
      container.querySelector(selector)
    );
  }

  /**
   * Create analyze button element
   */
  createAnalyzeButton(tweetData: { author: string; handle: string; text: string }): HTMLElement {
    const button = document.createElement('button');
    button.className = 'foru-analyze-tweet-button';
    button.innerHTML = `Analyze`;
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Disable button and show loading
      button.disabled = true;
      button.innerHTML = `Analyzing...`;
      
      try {
        // Show analysis dialog
        if ((window as any).tweetAnalysisDialog) {
          await (window as any).tweetAnalysisDialog.show(tweetData);
        } else {
          console.error('Tweet analysis dialog not available');
        }
      } catch (error) {
        console.error('Error showing tweet analysis:', error);
      } finally {
        // Re-enable button
        button.disabled = false;
        button.innerHTML = `Analyze`;
      }
    });

    return button;
  }

  /**
   * Clean up processed tweets cache
   */
  cleanup() {
    this.processedTweets.clear();
  }

  /**
   * Stop observing DOM changes
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.cleanup();
    console.log('Tweet analyze buttons destroyed');
  }
}

// Create global instance
const tweetAnalyzeButtons = new TweetAnalyzeButtons();

// Expose to global scope for use in other modules
(window as any).tweetAnalyzeButtons = tweetAnalyzeButtons;

// Export for module usage
export default TweetAnalyzeButtons;