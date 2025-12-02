"use client";

import { useState, useEffect, useRef } from "react";
import "./loading-bar.css";

/**
 * Props for the LoadingBar component.
 */
interface LoadingBarProps {
  /**
   * How long (in seconds) the loading animation should take to reach 90% completion.
   */
  timeToLoad: number;
  /**
   * First message to display while loading.
   */
  initialLoadingMessage: string | null;
  /**
   * Array of messages to display while loading. Messages will be rotated every 5 seconds.
   */
  waitingMessages: string[];
}

/**
 * LoadingBar component that displays a progress bar and rotating waiting messages.
 * 
 * Features:
 * - Progress bar that animates from 0% to 90% over the specified time period
 * - Shimmer effect on the progress bar fill
 * - Rotating messages that change every 5 seconds with fade animations
 * - Messages are shuffled once on mount and cycled through in order
 * 
 * @param timeToLoad - Duration in seconds for the progress bar to reach 90%
 * @param waitingMessages - Array of messages to rotate through during loading
 * @returns A loading bar component with animated progress and rotating messages
 */
export default function LoadingBar({
  timeToLoad,
  initialLoadingMessage,
  waitingMessages,
}: LoadingBarProps) {
  // Shuffled array of messages (shuffled once on mount)
  const [shuffledMessages, setShuffledMessages] = useState<string[]>([]);
  // Current index in the shuffled messages array
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Track if message is transitioning (for fade animation)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  // Track if progress animation has started
  const [progressStarted, setProgressStarted] = useState<boolean>(false);
  
  // Refs for managing intervals and avoiding stale closures
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shuffledMessagesRef = useRef<string[]>([]);

  /**
   * Randomizes an array using Fisher-Yates shuffle algorithm.
   * 
   * @param array - The array to shuffle
   * @returns A new shuffled array
   */
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  /**
   * Rotates to the next message in the shuffled array.
   * Handles the fade out -> change message -> fade in animation.
   */
  const rotateToNextMessage = () => {
    const messages = shuffledMessagesRef.current;
    if (messages.length === 0) return;

    // Start fade out animation
    setIsTransitioning(true);

    // After fade out completes, change message and fade in
    setTimeout(() => {
      // Move to next index, wrapping around if at the end
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
      
      // Fade in the new message
      setIsTransitioning(false);
    }, 300); // Half of animation duration (fade out)
  };


  // Initialize component: shuffle messages and start animations
  useEffect(() => {
    if (waitingMessages.length === 0) return;

    // Shuffle the messages once on mount
    const shuffled = initialLoadingMessage ? [initialLoadingMessage, ...shuffleArray(waitingMessages)] : shuffleArray(waitingMessages);
    setShuffledMessages(shuffled);
    shuffledMessagesRef.current = shuffled;
    setCurrentIndex(0);

    // Start progress animation by triggering CSS transition
    // Use double requestAnimationFrame to ensure the initial state (0% width) is 
    // actually painted by the browser before we trigger the transition to 90%.
    // A simple setTimeout(..., 10) can be skipped during heavy page loads.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setProgressStarted(true);
      });
    });

    // Set up message rotation interval (every 5 seconds)
    messageIntervalRef.current = setInterval(() => {
      rotateToNextMessage();
    }, 4000);

    // Cleanup function
    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, []); // Only run on mount

  // Get current message from shuffled array
  const currentMessage = shuffledMessages.length > 0 ? shuffledMessages[currentIndex] : "";

  return (
    <div className="loading-bar">
      {/* Message label - left-aligned, secondary text, 1rem font */}
      <div className="loading-bar__message-container">
        {currentMessage && (
          <div
            className={`loading-bar__message ${
              isTransitioning ? "loading-bar__message--fade-out" : "loading-bar__message--fade-in"
            }`}
          >
            {currentMessage}
          </div>
        )}
      </div>

      {/* Progress bar container - full width, rounded corners */}
      <div className="loading-bar__progress-container">
        {/* Progress bar fill - vintage-grape colored with shimmer effect */}
        <div
          className={`loading-bar__progress-fill ${
            progressStarted ? "loading-bar__progress-fill--active" : ""
          }`}
          style={{
            transitionDuration: `${timeToLoad}s`,
          }}
        />
      </div>
    </div>
  );
}

