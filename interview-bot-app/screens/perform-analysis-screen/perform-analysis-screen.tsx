"use client";

import "./perform-analysis-screen.css";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { savedEvaluationReports, savedAggregatedEvaluation } from "@/app/saved-responses";
import type { PerformanceFeedback } from "@/types";

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
 * Converts a judge key to a readable title.
 * @param key - The judge evaluation key (e.g., "contentJudgeEvaluation")
 * @returns A formatted title (e.g., "Content Judge")
 */
function getJudgeTitle(key: string): string {
  // Remove "Evaluation" suffix and convert camelCase to Title Case
  const withoutSuffix = key.replace("Evaluation", "");
  // Split camelCase and capitalize each word
  return withoutSuffix
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Component for rendering a single feedback card.
 * @param feedback - The feedback item to display
 */
function FeedbackCard({ feedback }: { feedback: PerformanceFeedback[number] }) {
  return (
    <div className={`feedback-card feedback-card--${feedback.type}`}>
      <div className="feedback-card-header">
        <span className={`feedback-badge feedback-badge--${feedback.type}`}>
          {feedback.type === "good" ? "Good" : "Bad"}
        </span>
        <h3 className="feedback-card-title">{feedback.title}</h3>
      </div>
      <div className="feedback-card-content">
        <div className="feedback-field">
          <strong>Relevant Quotes:</strong>
          <p>{feedback.relevant_quotes}</p>
        </div>
        <div className="feedback-field">
          <strong>Evaluation Explanation:</strong>
          <p>{feedback.evaluation_explanation}</p>
        </div>
        <div className="feedback-field">
          <strong>Context & Best Practices:</strong>
          <p>{feedback.context_best_practices}</p>
        </div>
        <div className="feedback-field">
          <strong>Improved Example:</strong>
          <p>{feedback.improved_example}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Component for rendering an evaluation section (judge or aggregated).
 * @param title - The title of the evaluation section
 * @param summary - The summary text
 * @param feedback - Array of feedback items to display
 */
function EvaluationSection({ 
  title, 
  summary, 
  feedback 
}: { 
  title: string; 
  summary: string; 
  feedback: PerformanceFeedback;
}) {
  return (
    <div className="evaluation-section">
      <h2 className="evaluation-section-title">{title}</h2>
      <p className="evaluation-section-summary">{summary}</p>
      <div className="feedback-cards-container">
        {feedback.map((item, index) => (
          <FeedbackCard key={index} feedback={item} />
        ))}
      </div>
    </div>
  );
}

/**
 * Screen component for performing analysis.
 * Displays individual judge evaluations and aggregated evaluation results
 * in a structured format with horizontally scrollable feedback cards.
 */
export default function PerformAnalysisScreen({ messages }: PerformAnalysisScreenProps) {

  return (
    <div className="perform-analysis-container">
      <div className="perform-analysis-content">
        <h1 className="perform-analysis-title">perform analysis</h1>
        
        {/* First Section: Individual Judge Evaluations */}
        <div className="evaluations-section">
          <h2 className="evaluations-section-header">Individual Judge Evaluations</h2>
          <div className="evaluations-vstack">
            {Object.entries(savedEvaluationReports).map(([key, evaluation]) => (
              <EvaluationSection
                key={key}
                title={getJudgeTitle(key)}
                summary={evaluation.summary}
                feedback={evaluation.feedback as PerformanceFeedback}
              />
            ))}
          </div>
        </div>

        {/* Second Section: Aggregated Results */}
        <div className="aggregated-section">
          <h2 className="aggregated-section-header">Aggregated Evaluation</h2>
          <EvaluationSection
            title="Aggregated Evaluation"
            summary={savedAggregatedEvaluation.summary}
            feedback={savedAggregatedEvaluation.feedback as PerformanceFeedback}
          />
        </div>
      </div>
    </div>
  );
}

