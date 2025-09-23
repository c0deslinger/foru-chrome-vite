// src/lib/crypto-utils.ts
// Utility functions for cryptographic operations using crypto-js

import CryptoJS from 'crypto-js';

// Get configuration from manifest
const getManifest = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome.runtime.getManifest();
  }
  return null;
};

const manifest = getManifest();
const manifestAny = manifest as any;

// Get environment and select appropriate config
const environment = manifestAny?.environment || "prod";
let foruConfig: any = null;

switch (environment) {
  case "prod":
    foruConfig = manifestAny?.foruConfigProd;
    break;
  case "staging":
    foruConfig = manifestAny?.foruConfigStaging;
    break;
  case "dev":
    foruConfig = manifestAny?.foruConfigDev;
    break;
  default:
    foruConfig = manifestAny?.foruConfigProd; // fallback to prod
}

const NEXT_PUBLIC_API_SECRET_KEY = foruConfig?.secretKey || "";
const NEXT_PUBLIC_API_PRIVATE_KEY = foruConfig?.privateKey || "";
const API_BASE_URL = foruConfig?.apiBaseUrl || "";

/**
 * Generate HMAC-SHA256 signature for ForU API requests
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param payload Request payload (object for POST/PUT, query string for GET)
 * @param timestamp Timestamp in milliseconds as string
 * @returns HMAC-SHA256 signature as hex string
 */
export function generateForuSignature(method: string, payload: any, timestamp: string): string {
  let payloadToSignature = "";

  if (method === "GET") {
    // For GET requests, payloadToSignature is JSON string of URL parameters (including timestamp)
    let queryString = `timestamp=${timestamp}`;
    if (payload && payload.length > 0) {
      queryString = `${payload}&${queryString}`;
    }
    const urlSearchParams = new URLSearchParams(queryString);
    payloadToSignature = JSON.stringify(
      Object.fromEntries(urlSearchParams.entries())
    );
  } else {
    // For non-GET requests, add timestamp to payload and convert to JSON string
    const tempPayload = { ...payload, timestamp: timestamp };
    payloadToSignature = JSON.stringify(tempPayload);
  }

  // Generate HMAC-SHA256 signature using crypto-js
  const signature = CryptoJS.HmacSHA256(payloadToSignature, NEXT_PUBLIC_API_SECRET_KEY);
  return signature.toString(CryptoJS.enc.Hex);
}

/**
 * Build headers for ForU API requests
 * @param method HTTP method
 * @param payload Request payload
 * @param accessToken Optional access token for authenticated requests
 * @returns Headers object for API requests
 */
export async function buildForuHeaders(method: string, payload: any = "", accessToken?: string): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const signature = generateForuSignature(method, payload, timestamp);
  
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-foru-apikey": `${NEXT_PUBLIC_API_PRIVATE_KEY}`,
    "x-foru-timestamp": timestamp,
    "x-foru-signature": signature,
  };
  
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  return headers;
}

/**
 * Check if current environment is staging or dev (for showing debug features)
 * @returns boolean indicating if environment is staging or dev
 */
export function isDebugEnvironment(): boolean {
  const manifest = getManifest();
  const manifestAny = manifest as any;
  const environment = manifestAny?.environment || "prod";
  return environment === "staging" || environment === "dev";
}

/**
 * Get current environment
 * @returns string indicating current environment
 */
export function getCurrentEnvironment(): string {
  const manifest = getManifest();
  const manifestAny = manifest as any;
  return manifestAny?.environment || "prod";
}

/**
 * Export configuration constants
 */
export {
  NEXT_PUBLIC_API_SECRET_KEY,
  NEXT_PUBLIC_API_PRIVATE_KEY,
  API_BASE_URL
};
