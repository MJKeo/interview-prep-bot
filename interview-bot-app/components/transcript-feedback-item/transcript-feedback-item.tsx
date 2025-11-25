"use client";

import { useState } from "react";
import "./transcript-feedback-item.css";
import type { InterviewMessagePair, ConsolidatedFeedback } from "@/types";

/**
 * Props for the TranscriptFeedbackItem component.
 */
interface TranscriptFeedbackItemProps {
  /**
   * The interview message pair containing the question and answer.
   */
  message: InterviewMessagePair;
  /**
   * Optional consolidated feedback for this message.
   * If provided, the answer will be highlighted and clickable.
   */
  feedback?: ConsolidatedFeedback;
}

/**
 * Component for displaying a single transcript message pair with optional feedback.
 * If feedback is present, the answer is highlighted and clickable to show detailed feedback.
 * 
 * @param message - The interview message pair (question and answer)
 * @param feedback - Optional consolidated feedback for this message
 */
export default function TranscriptFeedbackItem({ message, feedback }: TranscriptFeedbackItemProps) {
  // State to track if the feedback panel is expanded
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  /**
   * Handler function to toggle the feedback panel.
   * Only works if feedback is available.
   */
  const handleToggleFeedback = () => {
    if (feedback) {
      setIsExpanded(!isExpanded);
    }
  };

  /**
   * Handler function to close the feedback panel.
   */
  const handleCloseFeedback = () => {
    setIsExpanded(false);
  };

  // Determine if this message has feedback available
  const hasFeedback = !!feedback;
  const consolidatedFeedback = feedback?.consolidated_feedback;

  return (
    <div className="transcript-feedback-item">
      {/* Interviewer question */}
      <div className="transcript-feedback-item__question-container">
        <span className="transcript-feedback-item__label">Interviewer</span>
        <p className="transcript-feedback-item__question">{message.interviewer_question}</p>
      </div>

      {/* Candidate answer */}
      <div className="transcript-feedback-item__answer-container">
        <span className="transcript-feedback-item__label">You</span>
        <p 
          className={`transcript-feedback-item__answer ${
            hasFeedback ? "transcript-feedback-item__answer--clickable" : ""
          }`}
          onClick={handleToggleFeedback}
        >
          {message.candidate_answer}
        </p>
      </div>

      {/* Collapsible feedback panel */}
      {hasFeedback && isExpanded && (
        <div className="transcript-feedback-item__feedback-panel">
          {/* Close button */}
          <button 
            className="transcript-feedback-item__close-button"
            onClick={handleCloseFeedback}
            aria-label="Close feedback"
          >
            ×
          </button>

          {/* Why this is good */}
          {consolidatedFeedback?.reasons_why_this_is_good && 
           consolidatedFeedback.reasons_why_this_is_good.length > 0 && (
            <div className="transcript-feedback-item__feedback-section">
              <h4 className="transcript-feedback-item__feedback-section-title">
                Why this is good
              </h4>
              <ul className="transcript-feedback-item__feedback-list">
                {consolidatedFeedback.reasons_why_this_is_good.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Why this can be improved */}
          {consolidatedFeedback?.reasons_why_this_is_bad && 
           consolidatedFeedback.reasons_why_this_is_bad.length > 0 && (
            <div className="transcript-feedback-item__feedback-section">
              <h4 className="transcript-feedback-item__feedback-section-title">
                Why this can be improved
              </h4>
              <ul className="transcript-feedback-item__feedback-list">
                {consolidatedFeedback.reasons_why_this_is_bad.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Opportunities for improvement */}
          {consolidatedFeedback?.ways_to_improve_response && 
           consolidatedFeedback.ways_to_improve_response.length > 0 && (
            <div className="transcript-feedback-item__feedback-section">
              <h4 className="transcript-feedback-item__feedback-section-title">
                Opportunities for improvement
              </h4>
              <ul className="transcript-feedback-item__feedback-list">
                {consolidatedFeedback.ways_to_improve_response.map((improvement, index) => (
                  <li key={index}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

