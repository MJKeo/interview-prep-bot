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
 * Displays a text label indicating the analysis screen.
 * Receives the conversation history from the mock interview.
 */
export default function PerformAnalysisScreen({ messages }: PerformAnalysisScreenProps) {
  return (
    <div className="perform-analysis-container">
      <div className="perform-analysis-content">
        <label className="perform-analysis-label">perform analysis</label>
      </div>
    </div>
  );
}

