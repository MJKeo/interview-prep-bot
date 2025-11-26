"use client";

import "./mobile-not-supported-screen.css";
import sadPhoneImage from "../../images/sad_phone.png";

/**
 * Screen component that displays a message indicating that mobile devices are not supported.
 * Shown when a user attempts to access the application from a mobile device.
 */
export default function MobileNotSupportedScreen() {
  return (
    <div className="mobile-not-supported-container">
      {/* Interview Pro top bar */}
      <div className="interview-pro-badge">
        Interview Pro
      </div>

      <div className="mobile-not-supported-content">
        {/* Sad phone image */}
        <img 
          src={typeof sadPhoneImage === 'string' ? sadPhoneImage : sadPhoneImage.src} 
          alt="Sad phone illustration" 
          className="sad-phone-image"
        />

        {/* Header text */}
        <h1 className="mobile-not-supported-header">
          Mobile devices are not supported
        </h1>
      </div>
    </div>
  );
}

