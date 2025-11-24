"use client";

import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./screen-popup.css";
import Button from "@/components/button";
import { ButtonType } from "@/types";

/**
 * Props for a button in the popup footer.
 */
interface PopupButton {
  /**
   * The label text to display on the button.
   */
  label: string;
  /**
   * The visual variant type of the button (primary or secondary).
   */
  type: ButtonType;
  /**
   * The function to call when the button is clicked.
   */
  onClick: () => void;
}

/**
 * Props for the ScreenPopup component.
 */
interface ScreenPopupProps {
  /**
   * The markdown text content to display in the popup.
   */
  markdownText: string;
  /**
   * Array of buttons to display in the footer.
   * Each button has a label and an onClick handler.
   */
  buttons?: PopupButton[];
  /**
   * Function called when the popup should be closed.
   * This is triggered by clicking the X button or clicking outside the popup.
   */
  onClose: () => void;
  /**
   * Optional custom CSS class name to apply to the popup container.
   * Useful for customizing the popup appearance in specific contexts.
   */
  className?: string;
}

/**
 * ScreenPopup component that displays a centered modal popup with markdown content.
 * 
 * Features:
 * - Centered vertically and horizontally within its parent
 * - Dark semi-transparent backdrop overlay
 * - White smoke background with rounded corners
 * - Close button (X) in the top right corner
 * - Click outside to close functionality
 * - Scrollable markdown content area
 * - Footer with customizable action buttons
 * 
 * @param markdownText - The markdown content to display
 * @param buttons - Optional array of buttons to display in the footer
 * @param onClose - Function called when the popup should be closed
 * @returns A modal popup component
 */
export default function ScreenPopup({
  markdownText,
  buttons = [],
  onClose,
  className = "",
}: ScreenPopupProps) {
  // Ref to track the popup container for click outside detection
  const popupRef = useRef<HTMLDivElement>(null);
  // Ref to track the scrollable content area
  const contentRef = useRef<HTMLDivElement>(null);
  // State to track if scrollbar should be visible
  const [isScrolling, setIsScrolling] = useState(false);
  // Ref to store the timeout ID for hiding scrollbar
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Effect hook that handles clicking outside the popup to close it.
   * Closes the popup when a click occurs outside the popup container.
   */
  useEffect(() => {
    /**
     * Handles clicks outside the popup to close it.
     * 
     * @param event - The click event
     */
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add event listener when component mounts
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  /**
   * Effect hook that handles scroll events to show/hide the scrollbar.
   * Shows the scrollbar when scrolling starts and hides it 1 second after scrolling stops.
   */
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    /**
     * Handles scroll events to show the scrollbar and set a timeout to hide it.
     */
    const handleScroll = () => {
      // Show scrollbar immediately when scrolling
      setIsScrolling(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set timeout to hide scrollbar after 1 second of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    // Add scroll event listener
    contentElement.addEventListener("scroll", handleScroll);

    // Cleanup event listener and timeout on unmount
    return () => {
      contentElement.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles clicking on the overlay backdrop.
   * Closes the popup when the backdrop is clicked.
   * 
   * @param e - The click event
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay (not on a child element)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handles clicking on the popup container.
   * Prevents event propagation to avoid closing when clicking inside the popup.
   * 
   * @param e - The click event
   */
  const handlePopupClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Stop propagation to prevent closing when clicking inside the popup
    e.stopPropagation();
  };

  return (
    <div className="screen-popup-overlay" onClick={handleOverlayClick}>
      <div
        ref={popupRef}
        className={`screen-popup-container ${className}`.trim()}
        onClick={handlePopupClick}
      >
        {/* Header with close button */}
        <div className="screen-popup-header">
          <button
            type="button"
            className="screen-popup-close-button"
            onClick={onClose}
            aria-label="Close popup"
          >
            ×
          </button>
        </div>

        {/* Scrollable content area with markdown */}
        <div 
          ref={contentRef}
          className={`screen-popup-content ${isScrolling ? "screen-popup-content-scrolling" : ""}`}
        >
          <div className="screen-popup-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdownText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer with action buttons */}
        {buttons.length > 0 && (
          <div className="screen-popup-footer">
            {buttons.map((button, index) => (
              <Button
                key={index}
                htmlType="button"
                type={button.type}
                onClick={button.onClick}
              >
                {button.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

