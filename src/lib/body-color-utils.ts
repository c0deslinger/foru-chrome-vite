// src/lib/body-color-utils.ts

/**
 * Get body background color dynamically from the current page
 * This function extracts the background color from the document body element
 * and provides fallbacks for various scenarios
 * 
 * @returns {string} The background color in CSS format (e.g., 'rgb(255, 255, 255)', '#ffffff', etc.)
 */
export function getBodyBackgroundColor(): string {
  try {
    const body = document.body;
    if (!body) return '#000000'; // fallback to black
    
    // Get computed style
    const computedStyle = window.getComputedStyle(body);
    const backgroundColor = computedStyle.backgroundColor;
    
    // If background color is transparent or invalid, try to get from inline style
    if (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
      const inlineStyle = body.getAttribute('style') || '';
      const match = inlineStyle.match(/background-color:\s*([^;]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Return the computed background color or fallback
    return backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent' 
      ? backgroundColor 
      : '#000000';
  } catch (error) {
    console.warn('[Body Color Utils] Error getting body background color:', error);
    return '#000000'; // fallback to black
  }
}

/**
 * Get body background color with additional context information
 * This function provides more detailed information about the color detection process
 * 
 * @returns {object} Object containing the color and detection method
 */
export function getBodyBackgroundColorWithContext(): {
  color: string;
  method: 'computed' | 'inline' | 'fallback';
  source: string;
} {
  try {
    const body = document.body;
    if (!body) {
      return {
        color: '#000000',
        method: 'fallback',
        source: 'no-body-element'
      };
    }
    
    // Get computed style
    const computedStyle = window.getComputedStyle(body);
    const backgroundColor = computedStyle.backgroundColor;
    
    // If background color is valid, return it
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
      return {
        color: backgroundColor,
        method: 'computed',
        source: 'getComputedStyle'
      };
    }
    
    // Try to get from inline style
    const inlineStyle = body.getAttribute('style') || '';
    const match = inlineStyle.match(/background-color:\s*([^;]+)/i);
    if (match && match[1]) {
      return {
        color: match[1].trim(),
        method: 'inline',
        source: 'style-attribute'
      };
    }
    
    // Fallback
    return {
      color: '#000000',
      method: 'fallback',
      source: 'default-fallback'
    };
  } catch (error) {
    console.warn('[Body Color Utils] Error getting body background color with context:', error);
    return {
      color: '#000000',
      method: 'fallback',
      source: 'error-fallback'
    };
  }
}

/**
 * Check if a color is light or dark
 * This function helps determine if the background is light or dark theme
 * 
 * @param {string} color - The color to check (CSS color format)
 * @returns {boolean} true if the color is light, false if dark
 */
export function isLightColor(color: string): boolean {
  try {
    // Create a temporary element to get computed color
    const tempDiv = document.createElement('div');
    tempDiv.style.color = color;
    document.body.appendChild(tempDiv);
    
    const computedColor = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    // Extract RGB values
    const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5;
    }
    
    // Fallback: assume light if we can't determine
    return true;
  } catch (error) {
    console.warn('[Body Color Utils] Error checking if color is light:', error);
    return true; // fallback to light
  }
}

/**
 * Get contrasting color for the given background color
 * This function returns a contrasting color (black or white) based on the background
 * 
 * @param {string} backgroundColor - The background color to contrast against
 * @returns {string} Either '#000000' (black) or '#ffffff' (white)
 */
export function getContrastingColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}
