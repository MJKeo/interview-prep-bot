"use client";

import "./mobile-not-supported-screen.css";

/**
 * Screen component that displays a message indicating that mobile devices are not supported.
 * Shown when a user attempts to access the application from a mobile device.
 */
export default function MobileNotSupportedScreen() {
  return (
    <div className="mobile-not-supported-container">
      <div className="mobile-not-supported-message">
        Mobile is not supported
      </div>
    </div>
  );
}

