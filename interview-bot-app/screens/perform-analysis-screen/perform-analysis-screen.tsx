"use client";

import "./perform-analysis-screen.css";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { convertMessagesToTranscript } from "@/utils/utils";

/**
 * Props for the PerformAnalysisScreen component.
 */
interface PerformAnalysisScreenProps {
  /**
   * The conversation history from the mock interview.
   * Array of messages with role and content in EasyInputMessage format.
   */
  messages: EasyInputMessage[];
}

/**
 * Screen component for performing analysis.
 * Displays the conversation history from the mock interview in a textbox.
 * Receives the conversation history from the mock interview.
 */
export default function PerformAnalysisScreen({ messages }: PerformAnalysisScreenProps) {
  // Convert messages array to formatted transcript string
  const messagesText = convertMessagesToTranscript(messages);

  console.log(messagesText);

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

