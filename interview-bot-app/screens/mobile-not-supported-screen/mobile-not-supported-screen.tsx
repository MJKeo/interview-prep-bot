"use client";

import "./mobile-not-supported-screen.css";
import sadPhoneImage from "../../images/sad_phone.png";
import interviewIcon from "../../images/interview-icon-white.png";
import githubIcon from "../../images/github-mark.png";
import linkedinIcon from "../../images/InBug-Black.png";

/**
 * Screen component that displays a message indicating that mobile devices are not supported.
 * Shown when a user attempts to access the application from a mobile device.
 */
export default function MobileNotSupportedScreen() {
  return (
    <div className="mobile-not-supported-container">
      {/* Interview Pro top bar */}
      <div className="interview-pro-badge">
        <img 
          src={interviewIcon.src} 
          alt="Interview Pro icon" 
          className="interview-pro-icon"
        />
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
          Mobile devices are not supported, but check out these cool resources!
        </h1>

        {/* Social icons */}
        <div className="mobile-social-icons">
          <button
            type="button"
            className="mobile-social-icon"
            aria-label="GitHub"
            onClick={() => {
              window.open("https://github.com/MJKeo", "_blank", "noopener,noreferrer");
            }}
          >
            <img
              src={githubIcon.src}
              alt="GitHub"
              className="mobile-social-icon-img"
            />
          </button>
          <button
            type="button"
            className="mobile-social-icon"
            aria-label="LinkedIn"
            onClick={() => {
              window.open("https://www.linkedin.com/in/michael-keohane", "_blank", "noopener,noreferrer");
            }}
          >
            <img
              src={linkedinIcon.src}
              alt="LinkedIn"
              className="mobile-social-icon-img"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

