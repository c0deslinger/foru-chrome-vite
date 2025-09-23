// src/lib/http-client.ts

import { generateForuSignature, API_BASE_URL, NEXT_PUBLIC_API_PRIVATE_KEY } from './crypto-utils';

/**
 * HTTP Client with caching and UTM parameter support
 * Provides centralized HTTP request handling with automatic caching and UTM tracking
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached entries
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  cacheTTL?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
  requireAuth?: boolean;
  accessToken?: string;
}

interface RequestConfig {
  url: string;
  options: RequestOptions;
}

class HttpClient {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheConfig: CacheConfig;

  constructor() {
    // Initialize cache config from manifest
    this.cacheConfig = this.getCacheConfigFromManifest();
  }

  /**
   * Get cache configuration from manifest
   */
  private getCacheConfigFromManifest(): CacheConfig {
    try {
      // Get manifest data
      const manifest = chrome.runtime.getManifest();
      const cacheConfig = (manifest as any).cacheConfig;
      
      if (cacheConfig) {
        return {
          enabled: cacheConfig.enabled ?? true,
          defaultTTL: cacheConfig.defaultTTL ?? 5 * 60 * 1000, // 5 minutes default
          maxSize: cacheConfig.maxSize ?? 100
        };
      }
    } catch (error) {
      console.warn('[HttpClient] Failed to read cache config from manifest, using defaults:', error);
    }
    
    // Fallback to default configuration
    return {
      enabled: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100
    };
  }

  /**
   * Update cache configuration
   */
  public updateCacheConfig(config: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
    console.log('[HttpClient] Cache configuration updated:', this.cacheConfig);
  }

  /**
   * Get current cache configuration
   */
  public getCacheConfig(): CacheConfig {
    return { ...this.cacheConfig };
  }

  /**
   * Add UTM parameters to URL
   */
  private addUtmParameters(url: string): string {
    const urlObj = new URL(url);
    urlObj.searchParams.set('utm_source', 'chrome-extension');
    urlObj.searchParams.set('utm_medium', 'extension');
    urlObj.searchParams.set('utm_campaign', 'foru-identifi');
    return urlObj.toString();
  }

  /**
   * Generate cache key from URL and options
   */
  private generateCacheKey(url: string, options: RequestOptions): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Manage cache size by removing oldest entries
   */
  private manageCacheSize(): void {
    if (this.cache.size > this.cacheConfig.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.cacheConfig.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cached data if available and valid
   */
  private getCachedData(cacheKey: string): any | null {
    const entry = this.cache.get(cacheKey);
    if (entry && this.isCacheValid(entry)) {
      console.log(`[HttpClient] Cache hit for: ${cacheKey}`);
      return entry.data;
    }
    
    if (entry) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Store data in cache
   */
  private setCachedData(cacheKey: string, data: any, ttl: number): void {
    const now = Date.now();
    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
    
    this.cleanExpiredCache();
    this.manageCacheSize();
  }

  /**
   * Prepare headers for request
   */
  private prepareHeaders(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authentication headers if required
    if (options.requireAuth) {
      const timestamp = Date.now().toString();
      const signature = generateForuSignature(
        options.method || 'GET',
        options.body || '',
        timestamp
      );
      
      headers['x-foru-apikey'] = NEXT_PUBLIC_API_PRIVATE_KEY;
      headers['x-foru-timestamp'] = timestamp;
      headers['x-foru-signature'] = signature;
      
      if (options.accessToken) {
        headers['Authorization'] = `Bearer ${options.accessToken}`;
      }
    }

    return headers;
  }

  /**
   * Make HTTP request with caching and UTM parameters
   */
  async request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    // Add UTM parameters to URL
    const urlWithUtm = this.addUtmParameters(url);
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(urlWithUtm, options);
    
    // Check cache first (only for GET requests with caching enabled)
    if (this.cacheConfig.enabled && options.method === 'GET' && options.cache !== false && !options.forceRefresh) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    console.log(`[HttpClient] Making ${options.method || 'GET'} request to: ${urlWithUtm}`);

    try {
      const headers = this.prepareHeaders(options);
      
      const response = await fetch(urlWithUtm, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. Response: ${errorBody}`);
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if (this.cacheConfig.enabled && options.method === 'GET' && options.cache !== false) {
        const ttl = options.cacheTTL || this.cacheConfig.defaultTTL;
        this.setCachedData(cacheKey, data, ttl);
        console.log(`[HttpClient] Cached response for: ${cacheKey}`);
      }

      return data;
    } catch (error) {
      console.error(`[HttpClient] Request failed for ${urlWithUtm}:`, error);
      throw error;
    }
  }

  /**
   * GET request with caching
   */
  async get<T = any>(url: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[HttpClient] Cache cleared');
  }

  /**
   * Clear cache for specific URL pattern
   */
  clearCacheForUrl(urlPattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(urlPattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[HttpClient] Cleared ${keysToDelete.length} cache entries for pattern: ${urlPattern}`);
  }

  /**
   * Enable or disable cache
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheConfig.enabled = enabled;
    console.log(`[HttpClient] Cache ${enabled ? 'enabled' : 'disabled'}`);
    
    // Clear cache when disabling
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Check if cache is enabled
   */
  isCacheEnabled(): boolean {
    return this.cacheConfig.enabled;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    size: number; 
    maxSize: number;
    enabled: boolean;
    defaultTTL: number;
    entries: Array<{ key: string; expiresAt: number }> 
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      expiresAt: entry.expiresAt
    }));
    
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      enabled: this.cacheConfig.enabled,
      defaultTTL: this.cacheConfig.defaultTTL,
      entries
    };
  }
}

// Create singleton instance
const httpClient = new HttpClient();

// Export both class and instance
export { HttpClient, httpClient };
export default httpClient;

/**
 * Usage Examples:
 * 
 * // Basic usage with cache (enabled by default from manifest)
 * const data = await httpClient.get('/api/users');
 * 
 * // Disable cache for specific request
 * const data = await httpClient.get('/api/users', { cache: false });
 * 
 * // Force refresh (bypass cache)
 * const data = await httpClient.get('/api/users', { forceRefresh: true });
 * 
 * // Custom cache TTL for specific request
 * const data = await httpClient.get('/api/users', { cacheTTL: 60000 }); // 1 minute
 * 
 * // Disable cache globally
 * httpClient.setCacheEnabled(false);
 * 
 * // Enable cache globally
 * httpClient.setCacheEnabled(true);
 * 
 * // Update cache configuration
 * httpClient.updateCacheConfig({
 *   enabled: true,
 *   defaultTTL: 300000, // 5 minutes
 *   maxSize: 200
 * });
 * 
 * // Get cache statistics
 * const stats = httpClient.getCacheStats();
 * console.log('Cache size:', stats.size, 'Max size:', stats.maxSize);
 * 
 * // Clear all cache
 * httpClient.clearCache();
 * 
 * // Clear cache for specific URL pattern
 * httpClient.clearCacheForUrl('/api/users');
 */
