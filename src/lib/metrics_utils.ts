// src/lib/metrics_utils.ts
// Shared utilities for metrics API calls

import { generateForuSignature, API_BASE_URL, NEXT_PUBLIC_API_PRIVATE_KEY } from './crypto-utils.js';

declare global {
  interface Window {
    foruMetricsCache: Record<string, { data: MetricsData; timestamp: number }>;
    foruMetricsUtils: {
      fetchUserMetrics: (username: string, forceRefresh?: boolean) => Promise<MetricsData>;
      getIdentifiScore: (username: string) => Promise<number>;
      generateForuSignature: (method: string, payload: any, timestamp: string) => string;
    };
  }
}

interface MetricsData {
  identifi_score: number;
  reach_score: number;
  impression_score: number;
  engagement_score: number;
  on_chain_score: number;
}

// Global cache shared between all scripts
window.foruMetricsCache = window.foruMetricsCache || {};

/**
 * Fetch metrics from API with caching to avoid redundant calls
 * @param {string} username - Username to fetch metrics for
 * @param {boolean} forceRefresh - Force refresh even if cached data exists
 * @returns {Promise<MetricsData>} Metrics data object
 */
async function fetchUserMetrics(username: string, forceRefresh = false): Promise<MetricsData> {
  const cacheKey = username.toLowerCase();
  const now = Date.now();
  const cached = window.foruMetricsCache[cacheKey];

  // Check cache first (valid for 30 seconds unless forced refresh)
  if (!forceRefresh && cached && now - cached.timestamp < 30000) {
    console.log(`[ForU Metrics] Using cached data for ${username}`);
    return cached.data;
  }

  console.log(`[ForU Metrics] Fetching fresh data for ${username}`);

  const ts = Date.now().toString();
  const sig = generateForuSignature("GET", "", ts);
  const url = `${API_BASE_URL}/v1/public/user/metrics/${username}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-foru-apikey": NEXT_PUBLIC_API_PRIVATE_KEY,
        "x-foru-timestamp": ts,
        "x-foru-signature": sig,
      },
    });

    const json = await res.json();

    if (res.ok && json.data) {
      const metricsData: MetricsData = {
        identifi_score: json.data.identifi_score || 0,
        reach_score: json.data.reach_score || 0,
        impression_score: json.data.impression_score || 0,
        engagement_score: json.data.engagement_score || 0,
        on_chain_score: json.data.on_chain_score || 0,
      };

      // Cache the result
      window.foruMetricsCache[cacheKey] = {
        data: metricsData,
        timestamp: now,
      };

      console.log(
        `[ForU Metrics] Fresh data cached for ${username}:`,
        metricsData
      );
      return metricsData;
    } else {
      // Ignore 404 errors silently
      if (res.status !== 404) {
        console.error(`[ForU Metrics] API error for ${username}:`, json);
      }
    }
  } catch (error) {
    // Ignore network errors silently for cleaner console
  }

  // Return zero values on error - no fallback logic
  const defaultData: MetricsData = {
    identifi_score: 0,
    reach_score: 0,
    impression_score: 0,
    engagement_score: 0,
    on_chain_score: 0,
  };

  // Cache zero data to avoid repeated failed calls
  window.foruMetricsCache[cacheKey] = {
    data: defaultData,
    timestamp: now,
  };

  return defaultData;
}

/**
 * Get identifi_score for a specific username
 * @param {string} username - Username to get score for
 * @returns {Promise<number>} The identifi_score
 */
async function getIdentifiScore(username: string): Promise<number> {
  const metrics = await fetchUserMetrics(username);
  return metrics.identifi_score || 0;
}

// Expose functions globally
window.foruMetricsUtils = {
  fetchUserMetrics,
  getIdentifiScore,
  generateForuSignature,
};

console.log(
  "[ForU Metrics Utils] Utility functions loaded and available globally"
);

export { fetchUserMetrics, getIdentifiScore, generateForuSignature };
export type { MetricsData };
