import { createRoot } from 'react-dom/client';
import './style.css';

// Import utilities and scripts
import '../../lib/metrics_utils';

console.log('[Content Script] ForU AI content script loaded');

// Initialize everything
const initializeExtension = async () => {
  try {
    // Import and initialize inject scripts
    const { default: initializeInjectScripts } = await import('./inject-scripts');
    await initializeInjectScripts();
    
    console.log('[Content Script] All scripts initialized');
  } catch (error) {
    console.error('[Content Script] Failed to initialize:', error);
  }
};

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Initialize React component for any UI elements if needed
const div = document.createElement('div');
div.id = '__foru_root';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__foru_root');
if (rootContainer) {
  const root = createRoot(rootContainer);
  root.render(
    <div style={{ display: 'none' }} id="foru-content-container">
      {/* Hidden container for React components if needed */}
    </div>
  );
}
