// src/pages/popup/tweet-analysis-dialog/index.ts

import { generateForuSignature, API_BASE_URL, NEXT_PUBLIC_API_PRIVATE_KEY } from '../../../lib/crypto-utils';
import { dialogManager } from '../../../lib/dialog-manager';

/**
 * TweetAnalysisDialog - Class for displaying tweet analysis popup dialogs
 * Uses Gemini API for sentiment analysis, credibility assessment, and other insights
 */

// CSS Styles for Tweet Analysis Dialog
const TWEET_ANALYSIS_DIALOG_CSS = `
/* Tweet Analysis Dialog Styles */
.foru-tweet-analysis-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.foru-tweet-analysis-dialog {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 24px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
}

.foru-tweet-analysis-content-wrapper {
  background: #ffffff;
  border-radius: 22px;
  padding: 32px;
  width: 100%;
  height: 100%;
  position: relative;
}

.foru-tweet-analysis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  position: relative;
}

.foru-tweet-analysis-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: #0a0d14;
  letter-spacing: -0.2px;
  margin: 0;
}

.foru-tweet-analysis-close {
  background: #7246ce;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0px 1px 2px 0px rgba(55, 93, 251, 0.08);
}

.foru-tweet-analysis-close img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
}

.foru-tweet-analysis-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.foru-tweet-preview {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid #7246ce;
}

.foru-tweet-preview-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #0a0d14;
  margin: 0 0 8px 0;
}

.foru-tweet-preview-author {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #525866;
  margin: 0;
}

.foru-analysis-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 0;
}

.foru-analysis-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #7246ce;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.foru-analysis-loading-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #525866;
  text-align: center;
}

.foru-analysis-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.foru-analysis-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
}

.foru-analysis-section-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #0a0d14;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.foru-analysis-section-icon {
  width: 20px;
  height: 20px;
}

.foru-analysis-section-content {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #0a0d14;
  margin: 0;
}

.foru-sentiment-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.foru-sentiment-bar {
  flex: 1;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.foru-sentiment-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.foru-sentiment-fill.positive {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.foru-sentiment-fill.neutral {
  background: linear-gradient(90deg, #6c757d, #adb5bd);
}

.foru-sentiment-fill.negative {
  background: linear-gradient(90deg, #dc3545, #fd7e14);
}

.foru-sentiment-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #525866;
  min-width: 60px;
  text-align: right;
}

.foru-credibility-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.foru-credibility-bar {
  flex: 1;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.foru-credibility-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.foru-credibility-fill.high {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.foru-credibility-fill.medium {
  background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.foru-credibility-fill.low {
  background: linear-gradient(90deg, #dc3545, #e83e8c);
}

.foru-credibility-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #525866;
  min-width: 60px;
  text-align: right;
}

.foru-analysis-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.foru-analysis-error-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #721c24;
  margin: 0;
}

/* Animation */
.foru-tweet-analysis-overlay {
  animation: fadeIn 0.3s ease-out;
}

.foru-tweet-analysis-dialog {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .foru-tweet-analysis-dialog {
    width: 95%;
    padding: 16px;
    border-radius: 24px;
  }
  
  .foru-tweet-analysis-title {
    font-size: 18px;
    line-height: 24px;
  }
}
`;

interface TweetData {
  author: string;
  handle: string;
  text: string;
}

interface AnalysisResult {
  sentiment: any;
  credibility: any;
  content_analysis: any;
  potential_issues: any;
  recommendations: any;
}

/**
 * TweetAnalysisDialog Class
 */
class TweetAnalysisDialog {
  private isDialogOpen = false;
  private isStylesInjected = false;

  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles into document head
   */
  injectStyles() {
    if (this.isStylesInjected) {
      return;
    }

    // Check if styles already exist
    const existingStyle = document.querySelector('#foru-tweet-analysis-dialog-styles');
    if (existingStyle) {
      this.isStylesInjected = true;
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'foru-tweet-analysis-dialog-styles';
    styleElement.textContent = TWEET_ANALYSIS_DIALOG_CSS;
    document.head.appendChild(styleElement);
    this.isStylesInjected = true;
    
    console.log('Tweet analysis dialog styles injected');
  }

  /**
   * Analyze tweet using backend API
   */
  async analyzeTweet(tweetText: string, author: string): Promise<AnalysisResult> {
    const timestamp = Date.now().toString();
    
    // Create payload for signature
    const payload = {
      tweet_text: tweetText,
      author: author
    };
    
    // Generate signature using crypto-utils
    const signature = generateForuSignature('POST', payload, timestamp);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/public/ai/analyze`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-foru-apikey': NEXT_PUBLIC_API_PRIVATE_KEY,
          'Content-Type': 'application/json',
          'x-foru-timestamp': timestamp,
          'x-foru-signature': signature
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Debug: Log the response to see the actual structure
      console.log('Backend API response:', responseData);
      
      // Extract data from the nested structure
      const data = responseData.data;
      
      // Return the analysis data from the nested data object
      return {
        sentiment: data.sentiment,
        credibility: data.credibility,
        content_analysis: data.content_analysis,
        potential_issues: data.potential_issues,
        recommendations: data.recommendations
      };
    } catch (error) {
      console.error('Error analyzing tweet:', error);
      throw error;
    }
  }

  /**
   * Generate signature for API authentication using crypto-utils
   */
  generateSignature(tweetText: string, author: string, timestamp: string): string {
    const payload = {
      tweet_text: tweetText,
      author: author
    };
    
    return generateForuSignature("POST", payload, timestamp);
  }

  /**
   * Create and display tweet analysis dialog
   */
  async show(tweetData: TweetData) {
    // Ensure styles are injected
    this.injectStyles();

    // Close all existing dialogs before opening new one
    dialogManager.closeAllDialogs();

    // Prevent multiple dialogs
    if (this.isDialogOpen) {
      this.close();
    }

    const overlay = document.createElement('div');
    overlay.className = 'foru-tweet-analysis-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'foru-tweet-analysis-dialog';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'foru-tweet-analysis-content-wrapper';
    
    const header = document.createElement('div');
    header.className = 'foru-tweet-analysis-header';
    
    const title = document.createElement('h2');
    title.className = 'foru-tweet-analysis-title';
    title.textContent = 'Tweet Analysis';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'foru-tweet-analysis-close';
    closeButton.innerHTML = '<img src="' + chrome.runtime.getURL('images/badge-dialog/close-icon.svg') + '" alt="Close">';
    closeButton.onclick = () => this.close();
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    const content = document.createElement('div');
    content.className = 'foru-tweet-analysis-content';
    
    // Tweet preview
    const tweetPreview = document.createElement('div');
    tweetPreview.className = 'foru-tweet-preview';
    
    const tweetText = document.createElement('p');
    tweetText.className = 'foru-tweet-preview-text';
    tweetText.textContent = tweetData.text || 'Tweet content not available';
    
    const tweetAuthor = document.createElement('p');
    tweetAuthor.className = 'foru-tweet-preview-author';
    tweetAuthor.textContent = `— ${tweetData.author || tweetData.handle || 'Unknown Author'}`;
    
    tweetPreview.appendChild(tweetText);
    tweetPreview.appendChild(tweetAuthor);
    
    // Loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'foru-analysis-loading';
    
    const spinner = document.createElement('div');
    spinner.className = 'foru-analysis-loading-spinner';
    
    const loadingText = document.createElement('p');
    loadingText.className = 'foru-analysis-loading-text';
    loadingText.textContent = 'Analyzing tweet with AI...';
    
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(loadingText);
    
    content.appendChild(tweetPreview);
    content.appendChild(loadingDiv);
    
    contentWrapper.appendChild(header);
    contentWrapper.appendChild(content);
    dialog.appendChild(contentWrapper);
    overlay.appendChild(dialog);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(overlay);
    this.isDialogOpen = true;
    
    // Start analysis
    try {
      const analysis = await this.analyzeTweet(tweetData.text, tweetData.author || tweetData.handle);
      this.displayResults(content, analysis);
    } catch (error) {
      this.displayError(content, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Display analysis results
   */
  displayResults(content: HTMLElement, analysis: AnalysisResult) {
    // Remove loading state
    const loadingDiv = content.querySelector('.foru-analysis-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'foru-analysis-results';

    // Sentiment Analysis
    if (analysis.sentiment && analysis.sentiment.description) {
      const sentimentSection = this.createAnalysisSection(
        'Sentiment Analysis',
        analysis.sentiment.description,
        '💭'
      );
      
      if (analysis.sentiment.score !== undefined) {
        const sentimentScore = this.createScoreBar(
          analysis.sentiment.score,
          analysis.sentiment.overall,
          'sentiment'
        );
        sentimentSection.appendChild(sentimentScore);
      }
      
      resultsDiv.appendChild(sentimentSection);
    }

    // Credibility Analysis
    if (analysis.credibility && analysis.credibility.description) {
      const credibilitySection = this.createAnalysisSection(
        'Credibility Assessment',
        analysis.credibility.description,
        '🔍'
      );
      
      if (analysis.credibility.score !== undefined) {
        const credibilityScore = this.createScoreBar(
          analysis.credibility.score,
          analysis.credibility.level,
          'credibility'
        );
        credibilitySection.appendChild(credibilityScore);
      }
      
      resultsDiv.appendChild(credibilitySection);
    }

    // Content Analysis
    if (analysis.content_analysis) {
      const contentSection = this.createAnalysisSection(
        'Content Analysis',
        `Topics: ${analysis.content_analysis.topics?.join(', ') || 'N/A'}\nTone: ${analysis.content_analysis.tone || 'N/A'}\nLanguage Quality: ${analysis.content_analysis.language_quality || 'N/A'}`,
        '📝'
      );
      resultsDiv.appendChild(contentSection);
    }

    // Potential Issues
    if (analysis.potential_issues && analysis.potential_issues.length > 0) {
      const issuesSection = this.createAnalysisSection(
        'Potential Issues',
        analysis.potential_issues.join('\n• '),
        '⚠️'
      );
      resultsDiv.appendChild(issuesSection);
    }

    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      const recommendationsSection = this.createAnalysisSection(
        'Recommendations',
        analysis.recommendations.join('\n• '),
        '💡'
      );
      resultsDiv.appendChild(recommendationsSection);
    }

    content.appendChild(resultsDiv);
  }

  /**
   * Create an analysis section
   * @param {string} title - Section title
   * @param {string} content - Section content
   * @param {string} icon - Section icon
   * @returns {HTMLElement} Section element
   */
  createAnalysisSection(title, content, icon) {
    const section = document.createElement('div');
    section.className = 'foru-analysis-section';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'foru-analysis-section-title';
    sectionTitle.innerHTML = `${icon} ${title}`;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'foru-analysis-section-content';
    sectionContent.textContent = content;
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    
    return section;
  }

  /**
   * Create a score bar
   * @param {number} score - Score value (0-100)
   * @param {string} label - Score label
   * @param {string} type - Type of score (sentiment or credibility)
   * @returns {HTMLElement} Score bar element
   */
  createScoreBar(score, label, type) {
    const scoreDiv = document.createElement('div');
    scoreDiv.className = type === 'sentiment' ? 'foru-sentiment-score' : 'foru-credibility-score';
    
    const bar = document.createElement('div');
    bar.className = type === 'sentiment' ? 'foru-sentiment-bar' : 'foru-credibility-bar';
    
    const fill = document.createElement('div');
    fill.className = type === 'sentiment' ? 'foru-sentiment-fill' : 'foru-credibility-fill';
    
    // Set width based on score
    fill.style.width = `${score}%`;
    
    // Set color class based on label
    if (type === 'sentiment') {
      if (label === 'positive') fill.classList.add('positive');
      else if (label === 'negative') fill.classList.add('negative');
      else fill.classList.add('neutral');
    } else {
      if (label === 'high') fill.classList.add('high');
      else if (label === 'low') fill.classList.add('low');
      else fill.classList.add('medium');
    }
    
    const scoreLabel = document.createElement('span');
    scoreLabel.className = type === 'sentiment' ? 'foru-sentiment-label' : 'foru-credibility-label';
    scoreLabel.textContent = `${score}%`;
    
    bar.appendChild(fill);
    scoreDiv.appendChild(bar);
    scoreDiv.appendChild(scoreLabel);
    
    return scoreDiv;
  }

  /**
   * Display error message
   */
  displayError(content: HTMLElement, errorMessage: string) {
    // Remove loading state
    const loadingDiv = content.querySelector('.foru-analysis-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'foru-analysis-error';
    
    const errorText = document.createElement('p');
    errorText.className = 'foru-analysis-error-text';
    errorText.textContent = `Analysis failed: ${errorMessage}`;
    
    errorDiv.appendChild(errorText);
    content.appendChild(errorDiv);
  }

  /**
   * Close the tweet analysis dialog
   */
  close() {
    const dialog = document.querySelector('.foru-tweet-analysis-overlay');
    if (dialog) {
      dialog.remove();
      this.isDialogOpen = false;
      console.log('Tweet analysis dialog closed');
    }
  }
}

// Create global instance
const tweetAnalysisDialog = new TweetAnalysisDialog();

// Expose to global scope for use in other modules
(window as any).tweetAnalysisDialog = tweetAnalysisDialog;

// Export for module usage
export default TweetAnalysisDialog;
