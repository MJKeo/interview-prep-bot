"use client";

import { useRef, useEffect, useState } from "react";
import "./segmented-control.css";

/**
 * Tab configuration for the segmented control.
 */
export interface SegmentedControlTab {
  /**
   * The value of the tab (used as the key).
   */
  value: string;
  /**
   * The label to display for this tab.
   */
  label: string;
}

/**
 * Props for the SegmentedControl component.
 */
interface SegmentedControlProps {
  /**
   * Array of tabs to display in the segmented control.
   */
  tabs: SegmentedControlTab[];
  /**
   * Callback function called when the selection changes.
   * @param value The newly selected value
   */
  onChange: (value: string) => void;
  /**
   * Optional additional CSS classes to apply to the container.
   */
  className?: string;
}

/**
 * Reusable segmented control component with pill-shaped design.
 * Displays tabs within a rounded container, with the active tab
 * highlighted using the vintage grape color and white text.
 * 
 * @param tabs - Array of tabs to display
 * @param onChange - Callback when selection changes
 * @param className - Optional additional CSS classes
 */
export default function SegmentedControl({
  tabs,
  onChange,
  className = "",
}: SegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const sliderRef = useRef<HTMLDivElement>(null);
  const [selectedValue, setSelectedValue] = useState<string>(tabs.length > 0 ? tabs[0].value : "");
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * Calculates and updates the slider position based on the active tab.
   */
  const updateSliderPosition = () => {
    const activeTab = tabRefs.current.get(selectedValue);
    const container = containerRef.current;
    
    if (activeTab && container) {
      // Get the position of the active tab relative to the container
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      // Calculate left offset and width for the slider
      const left = tabRect.left - containerRect.left;
      const width = tabRect.width;
      
      setSliderStyle({ left, width });
    }
  };

  /**
   * Handles the transition end event to turn off animation and enable background color.
   */
  const handleTransitionEnd = () => {
    setIsAnimating(false);
  };

  /**
   * Handles tab click to initiate the sliding animation.
   * @param newValue The value of the clicked tab
   */
  const handleTabClick = (newValue: string) => {
    // Only animate if switching to a different tab
    if (newValue !== selectedValue) {
        setSelectedValue(newValue);
        // First, update slider position to current active tab
        updateSliderPosition();
        // Show slider and start animation
        setIsAnimating(true);
        // Use double requestAnimationFrame to ensure slider is positioned before value change
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
            onChange(newValue);
            });
        });
    }
  };

  /**
   * Updates the slider position when the value changes.
   * Also initializes position on mount.
   */
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateSliderPosition();
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedValue, tabs]);

  /**
   * Sets up the transition end listener when animation starts.
   */
  useEffect(() => {
    const slider = sliderRef.current;
    if (isAnimating && slider) {
      slider.addEventListener("transitionend", handleTransitionEnd);
      return () => {
        slider.removeEventListener("transitionend", handleTransitionEnd);
      };
    }
  }, [isAnimating]);

  /**
   * Sets a ref for each tab button to track their positions.
   * @param optionValue The option value
   * @param element The button element
   */
  const setTabRef = (optionValue: string, element: HTMLButtonElement | null) => {
    if (element) {
      tabRefs.current.set(optionValue, element);
    } else {
      tabRefs.current.delete(optionValue);
    }
  };

  return (
    <div ref={containerRef} className={`segmented-control ${className}`.trim()}>
      {/* Sliding indicator that animates between tabs - hidden when not animating */}
      <div
        ref={sliderRef}
        className={`segmented-control-slider ${isAnimating ? "segmented-control-slider--visible" : ""}`}
        style={{
          left: `${sliderStyle.left}px`,
          width: `${sliderStyle.width}px`,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          ref={(el) => setTabRef(tab.value, el)}
          type="button"
          className={`segmented-control-tab ${
            selectedValue === tab.value ? "segmented-control-tab--active" : ""
          } ${isAnimating ? "segmented-control-tab--animating" : ""}`}
          onClick={() => handleTabClick(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

