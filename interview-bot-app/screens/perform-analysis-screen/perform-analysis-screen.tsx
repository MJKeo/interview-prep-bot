"use client";

import "./perform-analysis-screen.css";

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
 * Props for the PerformAnalysisScreen component.
 */
interface PerformAnalysisScreenProps {
  /**
   * The conversation history from the mock interview.
   * Array of messages with role and content.
   */
  messages: Message[];
}

/**
 * Screen component for performing analysis.
 * Displays the conversation history from the mock interview in a textbox.
 * Receives the conversation history from the mock interview.
 */
export default function PerformAnalysisScreen({ messages }: PerformAnalysisScreenProps) {
  // Convert messages array to JSON string for display
  const messagesText = JSON.stringify(messages, null, 2);

  return (
    <div className="perform-analysis-container">
      <div className="perform-analysis-content">
        <h1 className="perform-analysis-title">perform analysis</h1>
        <textarea
          className="perform-analysis-textbox"
          value={messagesText}
          readOnly
          rows={30}
        />
      </div>
    </div>
  );
}

