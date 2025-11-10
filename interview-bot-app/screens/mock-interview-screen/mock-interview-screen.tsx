"use client";

import { useState, useRef, useEffect } from "react";
import "./mock-interview-screen.css";
import Button from "@/components/button";

/**
 * Type definition for a chat message.
 */
interface Message {
  /**
   * The role of the message sender - either "user" or "assistant".
   */
  role: "user" | "assistant";
  /**
   * The content/text of the message.
   */
  content: string;
}

/**
 * Props for the MockInterviewScreen component.
 */
interface MockInterviewScreenProps {
  /**
   * Callback function to navigate to the perform analysis screen.
   * Called when the user confirms the final review warning.
   * 
   * @param messages - The conversation history to pass to the analysis screen
   */
  onPerformFinalReview: (messages: Message[]) => void;
}

/**
 * Screen component for the mock interview.
 * Displays a chatbot interface with message bubbles, scrollable chat history,
 * and testing controls to send messages as either user or assistant.
 */
export default function MockInterviewScreen({ onPerformFinalReview }: MockInterviewScreenProps) {
  // State to store the array of messages in the conversation
  const [messages, setMessages] = useState<Message[]>([]);
  // State to store the current input field value
  const [inputValue, setInputValue] = useState<string>("");
  // State to control the visibility of the warning modal
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  // Ref to the messages container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Effect hook that scrolls to the bottom of the messages container
   * whenever a new message is added.
   */
  useEffect(() => {
    // Scroll to the bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Handler function to send a message as the user.
   * Adds a new message with role "user" to the messages array.
   */
  const handleSendAsUser = () => {
    // Only add message if input is not empty
    if (inputValue.trim()) {
      // Add new user message to the messages array
      setMessages((prev) => [...prev, { role: "user", content: inputValue }]);
      // Clear the input field
      setInputValue("");
    }
  };

  /**
   * Handler function to send a message as the assistant.
   * Adds a new message with role "assistant" to the messages array.
   */
  const handleSendAsAssistant = () => {
    // Only add message if input is not empty
    if (inputValue.trim()) {
      // Add new assistant message to the messages array
      setMessages((prev) => [...prev, { role: "assistant", content: inputValue }]);
      // Clear the input field
      setInputValue("");
    }
  };

  /**
   * Handler function to start over and clear the entire conversation history.
   * Resets the messages array to empty.
   */
  const handleStartOver = () => {
    // Clear all messages from the conversation
    setMessages([]);
  };

  /**
   * Handler function to show the warning modal when perform final review is clicked.
   * Opens the warning popup to confirm navigation to final review.
   */
  const handlePerformFinalReview = () => {
    // Show the warning modal
    setShowWarningModal(true);
  };

  /**
   * Handler function to close the warning modal.
   * Called when cancel is clicked or when clicking outside the modal.
   */
  const handleCloseModal = () => {
    // Hide the warning modal
    setShowWarningModal(false);
  };

  /**
   * Handler function to confirm navigation to final review.
   * Closes the modal and navigates to the perform analysis screen with messages.
   */
  const handleConfirmFinalReview = () => {
    // Close the modal
    setShowWarningModal(false);
    // Navigate to perform analysis screen with conversation history
    onPerformFinalReview(messages);
  };

  /**
   * Handler function to handle clicks on the modal overlay.
   * Closes the modal when clicking outside the modal content.
   * 
   * @param e - The click event
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay, not on the modal content
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  return (
    <div className="mock-interview-container">
      {/* Scrollable messages area */}
      <div className="mock-interview-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message-bubble ${
              message.role === "user" ? "message-user" : "message-assistant"
            }`}
          >
            {message.content}
          </div>
        ))}
        {/* Invisible element at the bottom for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input section at the bottom */}
      <div className="mock-interview-input-section">
        <input
          type="text"
          className="mock-interview-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            // Allow Enter key to send as user for quick testing
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendAsUser();
            }
          }}
        />
        <div className="mock-interview-buttons">
          <Button type="button" onClick={handleSendAsUser}>
            send as user
          </Button>
          <Button type="button" onClick={handleSendAsAssistant}>
            send as assistant
          </Button>
          <Button type="button" onClick={handleStartOver}>
            start over
          </Button>
          <Button type="button" onClick={handlePerformFinalReview}>
            perform final review
          </Button>
        </div>
      </div>

      {/* Warning modal overlay */}
      {showWarningModal && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <p className="modal-message">
              Hey, continuing on to the final review will end the conversation and you can't go back.
            </p>
            <div className="modal-buttons">
              <Button type="button" onClick={handleCloseModal}>
                cancel
              </Button>
              <Button type="button" onClick={handleConfirmFinalReview}>
                confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

