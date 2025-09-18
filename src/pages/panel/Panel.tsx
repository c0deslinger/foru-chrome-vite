import React, { useEffect, useRef } from 'react';
import '@pages/panel/Panel.css';
import './sidepanel.css';

export default function Panel() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize sidepanel functionality directly
    initializeSidepanel();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initializeSidepanel = async () => {
    try {
      // Import user_tab module to make renderReferralSection available
      await import('../../user/user_tab');
      
      // Import sidepanel modules dynamically
      const { default: initializeSidepanelScripts } = await import('./sidepanel-scripts');
      initializeSidepanelScripts();
    } catch (error) {
      console.error('Failed to initialize sidepanel:', error);
    }
  };

  return (
    <div id="sp-container" ref={containerRef}>
      <div className="sider-header">
        <div className="sider-header-title">ForU IdentiFi</div>
        <img
          src={chrome.runtime.getURL('images/header.png')}
          className="sider-header-image"
          alt="Header Background"
        />
      </div>

      <div className="sider-tabs">
        <button data-tab="profile" className="active">Profile</button>
        <button data-tab="user">User</button>
      </div>

      <div className="sider-content">
        <div id="profile-section"></div>
        <div id="tweets-section"></div>
        <div id="referral-section" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
}
