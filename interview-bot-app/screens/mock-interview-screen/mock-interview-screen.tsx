"use client";

import { useState, useRef, useEffect } from "react";
import "./mock-interview-screen.css";
import Button from "@/components/button";
import { generateNextInterviewMessageAction } from "@/app/actions";
import CONFIG from "@/app/config";
import type { JobListingResearchResponse, InterviewTranscript } from "@/types";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { convertMessagesToTranscript } from "@/utils/utils";
import { savedChatTranscript } from "@/app/saved-responses";

/**
 * Props for the MockInterviewScreen component.
 */
interface MockInterviewScreenProps {
  /**
   * Parsed job listing metadata used to generate the interview system prompt.
   */
  jobListingResearchResponse: JobListingResearchResponse;
  /**
   * The interview guide (markdown format) used to provide context for the interview bot.
   */
  interviewGuide: string;
  /**
   * Callback function to navigate to the perform analysis screen.
   * Called when the user confirms the final review warning.
   * 
   * @param messages - The conversation history to pass to the analysis screen (in EasyInputMessage format)
   */
  onPerformFinalReview: (messages: InterviewTranscript) => void;
}

/**
 * Screen component for the mock interview.
 * Displays a chatbot interface with message bubbles, scrollable chat history.
 */
export default function MockInterviewScreen({ 
  jobListingResearchResponse, 
  interviewGuide,
  onPerformFinalReview 
}: MockInterviewScreenProps) {
  // State to store the array of messages in the conversation
  const [messages, setMessages] = useState<EasyInputMessage[]>([]);
  // State to store the current input field value
  const [inputValue, setInputValue] = useState<string>("");
  // State to control the visibility of the warning modal
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  // State to track if a message is being generated (to prevent multiple simultaneous requests)
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // State to store error messages to display to the user
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Ref to the messages container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Helper function to send a preliminary "Hello" message and generate the bot's first response.
   * This message is not displayed in the UI - only the assistant's response is shown.
   * Used on component mount and when starting over.
   */
  const sendInitialMessage = async () => {
    // Skip initial message generation if bypassMockInterview is enabled
    if (CONFIG.bypassMockInterview) {
      return;
    }
    
    // Set generating state to disable input and show typing indicator
    setIsGenerating(true);

    try {
      // Create the preliminary "Hello" message (not added to display)
      // Send only the preliminary message to the API (messages array is empty at this point)
      const messagesToSend: EasyInputMessage[] = [{ role: "user", content: "Hello" }];

      // Call the server action to generate the first interview message
      const result = await generateNextInterviewMessageAction(
        messagesToSend,
        jobListingResearchResponse,
        interviewGuide
      );

      // Check if the action was successful
      if (result.success && result.nextMessage) {
        // Add only the assistant's response to the conversation (preliminary message is not added)
        const assistantMessage: EasyInputMessage = { role: "assistant", content: result.nextMessage };
        setMessages([assistantMessage]);
      } else {
        // Handle error from server action - show error message to user
        const errorMsg = result.error || "Failed to generate initial response";
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      // Handle exceptions and display error message
      const errorMsg = error instanceof Error ? error.message : "Failed to generate initial response";
      setErrorMessage(errorMsg);
    } finally {
      // Reset generating state to allow new requests
      setIsGenerating(false);
    }
  };

  /**
   * Effect hook that sends the initial "Hello" message when the component first mounts.
   * This triggers the bot to make the first message in the conversation.
   * Skips message generation if bypassMockInterview is enabled in config.
   */
  useEffect(() => {
    // Only send initial message once on mount
    if (messages.length === 0 && !isGenerating) {
      sendInitialMessage();
    }
  }, []); // Empty dependency array - only run on mount

  /**
   * Effect hook that scrolls to the bottom of the messages container
   * whenever a new message is added or when the typing indicator appears.
   */
  useEffect(() => {
    // Scroll to the bottom when messages change or when generating state changes
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  /**
   * Handler function to send a message as the user and generate an assistant response.
   * Adds the user message to the display immediately, then calls the API to generate
   * the assistant's response. Updates both the conversation history and display when complete.
   */
  const handleSendUserMessage = async () => {
    // Only proceed if input is not empty and not already generating a response
    if (!inputValue.trim() || isGenerating) {
      return;
    }

    console.log("Message length before sending: ", messages.length);

    // Store the user's message content before clearing the input
    const userMessageContent = inputValue.trim();
    // Clear the input field immediately for better UX
    setInputValue("");
    // Clear any previous error messages when sending a new message
    setErrorMessage(null);

    // Create the user message object in EasyInputMessage format
    const userMessage: EasyInputMessage = { role: "user", content: userMessageContent };

    const combinedMessages = [...messages, userMessage];
    
    // Add user message to the display immediately
    setMessages(combinedMessages);
    
    // Set generating state to prevent multiple simultaneous requests
    setIsGenerating(true);

    try {
      // Call the server action to generate the next interview message
      console.log("Generating next interview message...");
      const result = await generateNextInterviewMessageAction(
        combinedMessages,
        jobListingResearchResponse,
        interviewGuide
      );

      // Check if the action was successful
      if (result.success && result.nextMessage) {
        // Add the assistant's response to the conversation
        const assistantMessage: EasyInputMessage = { role: "assistant", content: result.nextMessage };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Handle error from server action - show error message to user
        const errorMsg = result.error || "Failed to generate response";
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      // Handle exceptions and display error message
      const errorMsg = error instanceof Error ? error.message : "Failed to generate response";
      setErrorMessage(errorMsg);
    } finally {
      // Reset generating state to allow new requests
      setIsGenerating(false);
    }
  };

  /**
   * Handler function to start over and clear the entire conversation history.
   * Resets the messages array to empty, clears any error messages, and sends
   * a new initial "Hello" message to trigger the bot's first response.
   */
  const handleStartOver = () => {
    // Clear all messages from the conversation
    setMessages([]);
    // Clear any error messages
    setErrorMessage(null);
    // Send the initial "Hello" message to get the bot's first response
    sendInitialMessage();
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
    if (CONFIG.useCachedTranscript) {
      onPerformFinalReview(savedChatTranscript as InterviewTranscript);
    } else {
      // Convert messages to transcript format
      onPerformFinalReview(convertMessagesToTranscript(messages));
    }
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
            {String(message.content)}
          </div>
        ))}
        {/* Typing indicator bubble - shows while generating assistant response */}
        {isGenerating && (
          <div className="message-bubble message-assistant typing-indicator">
            <div className="typing-dots">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
        {/* Invisible element at the bottom for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input section at the bottom */}
      <div className="mock-interview-input-section">
        {/* Error message display */}
        {errorMessage && (
          <div className="mock-interview-error-message">
            {errorMessage}
          </div>
        )}
        {/* Input and Send button inline */}
        <div className="mock-interview-input-row">
          <input
            type="text"
            className="mock-interview-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isGenerating}
            onKeyDown={(e) => {
              // Allow Enter key to send as user, but only if not already generating
              if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
                e.preventDefault();
                handleSendUserMessage();
              }
            }}
          />
          <Button type="button" onClick={handleSendUserMessage} disabled={isGenerating}>
            {isGenerating ? "Generating response..." : "Send"}
          </Button>
        </div>
        {/* Other buttons centered below */}
        <div className="mock-interview-buttons">
          <Button type="button" onClick={handleStartOver} disabled={isGenerating || messages.length === 0}>
            Start Over
          </Button>
          <Button type="button" onClick={handlePerformFinalReview} disabled={isGenerating || (!CONFIG.bypassMockInterview && messages.length <= 3)}>
            Perform Final Review
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

