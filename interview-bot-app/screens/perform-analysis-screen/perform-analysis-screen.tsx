"use client";

import { useState, useEffect } from "react";
import "./perform-analysis-screen.css";
import { convertEvaluationsToFeedbackByMessage } from "@/utils/utils";
import { savedEvaluationReports, savedAggregatedEvaluation } from "@/app/saved-responses";
import type { 
  PerformanceFeedback, 
  PerformanceEvaluationResponse, 
  JobListingResearchResponse, 
  DeepResearchReports, 
  EvaluationReports, 
  InterviewTranscript,
  AggregatedEvaluation,
  ConsolidatedFeedback,
  JobListingWithId
} from "@/types";
import Button from "@/components/button";
import CONFIG from "@/app/config";
import { performEvaluationsAction, performEvaluationAggregationAction } from "@/app/actions";

/**
 * Props for the PerformAnalysisScreen component.
 */
interface PerformAnalysisScreenProps {
  /**
   * The conversation history from the mock interview.
   * Array of messages with role and content in EasyInputMessage format.
   */
  transcript: InterviewTranscript;
  /**
   * Parsed job listing metadata used for evaluation context.
   */
  jobListingResearchResponse: JobListingResearchResponse;
  /**
   * Deep research reports providing additional context for evaluation.
   */
  deepResearchReports: DeepResearchReports;
  /**
   * Interview guide providing context for evaluation.
   */
  interviewGuide: string;
  /**
   * Reference to the current job listing being explored.
   * Contains the job listing ID and full data structure.
   */
  currentJobListing: JobListingWithId | null;
  /**
   * Callback function to navigate back to the mock interview screen with a fresh conversation.
   * Called when the user confirms the "new mock interview" warning.
   */
  onNewMockInterview: () => void;
  /**
   * Callback function to navigate back to the enter job listing URL screen and reset all stored attributes.
   * Called when the user confirms the "new job listing" warning.
   */
  onNewJobListing: () => void;
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
 * Type guard function to check if an evaluation entry has a non-null value.
 * @param entry - A tuple of [key, evaluation] from Object.entries
 * @returns True if the evaluation is not null or undefined
 */
function isNonNullEvaluation(
  entry: [string, PerformanceEvaluationResponse | null | undefined]
): entry is [string, PerformanceEvaluationResponse] {
  return entry[1] != null;
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
          <p>{feedback.transcript_message_id}</p>
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
 * Component for rendering consolidated feedback for a single message.
 * Displays the message ID and the consolidated feedback (reasons why good/bad, ways to improve).
 * @param consolidatedFeedback - The consolidated feedback item to display
 * @param transcript - The interview transcript to find the question/answer pair
 */
function ConsolidatedFeedbackCard({ 
  consolidatedFeedback,
  transcript
}: { 
  consolidatedFeedback: ConsolidatedFeedback;
  transcript: InterviewTranscript;
}) {
  // Find the transcript entry for this message ID
  const transcriptEntry = transcript.find(pair => pair.id === consolidatedFeedback.message_id);
  
  return (
    <div className="feedback-card consolidated-feedback-card">
      <div className="feedback-card-header">
        <span className="feedback-badge consolidated-feedback-badge">
          Message {consolidatedFeedback.message_id}
        </span>
        {transcriptEntry && (
          <div>
            <h3 className="feedback-card-title">
              Q: {transcriptEntry.interviewer_question}
            </h3>
            <h3 className="feedback-card-title">
              A: {transcriptEntry.candidate_answer}
            </h3>
          </div>
        )}
      </div>
      <div className="feedback-card-content">
        {/* Reasons why this is good */}
        {consolidatedFeedback.consolidated_feedback.reasons_why_this_is_good.length > 0 && (
          <div className="feedback-field">
            <strong>What Went Well:</strong>
            <ul className="feedback-list">
              {consolidatedFeedback.consolidated_feedback.reasons_why_this_is_good.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Reasons why this is bad */}
        {consolidatedFeedback.consolidated_feedback.reasons_why_this_is_bad.length > 0 && (
          <div className="feedback-field">
            <strong>Areas for Improvement:</strong>
            <ul className="feedback-list">
              {consolidatedFeedback.consolidated_feedback.reasons_why_this_is_bad.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Ways to improve */}
        {consolidatedFeedback.consolidated_feedback.ways_to_improve_response.length > 0 && (
          <div className="feedback-field">
            <strong>Ways to Improve:</strong>
            <ul className="feedback-list">
              {consolidatedFeedback.consolidated_feedback.ways_to_improve_response.map((improvement, index) => (
                <li key={index}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Screen component for performing analysis.
 * Displays individual judge evaluations and aggregated evaluation results
 * in a structured format with horizontally scrollable feedback cards.
 */
export default function PerformAnalysisScreen({ 
  transcript, 
  jobListingResearchResponse,
  deepResearchReports,
  interviewGuide,
  currentJobListing,
  onNewMockInterview, 
  onNewJobListing 
}: PerformAnalysisScreenProps) {
  // State to control the visibility of the "new mock interview" warning modal
  const [showNewMockInterviewModal, setShowNewMockInterviewModal] = useState<boolean>(false);
  // State to control the visibility of the "new job listing" warning modal
  const [showNewJobListingModal, setShowNewJobListingModal] = useState<boolean>(false);
  // State to store evaluation reports (either cached or fetched)
  const [evaluationReports, setEvaluationReports] = useState<EvaluationReports | null>(null);
  // State to store aggregated evaluation (either cached or fetched)
  const [aggregatedEvaluation, setAggregatedEvaluation] = useState<AggregatedEvaluation | null>(null);
  // State to track loading status for evaluations
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState<boolean>(false);
  // State to track loading status for aggregated evaluation
  const [isLoadingAggregated, setIsLoadingAggregated] = useState<boolean>(false);
  // State to store any error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Handler function to show the "new mock interview" warning modal.
   * Opens the warning popup to confirm navigation to a new mock interview.
   */
  const handleNewMockInterview = () => {
    setShowNewMockInterviewModal(true);
  };

  /**
   * Handler function to close the "new mock interview" warning modal.
   * Called when cancel is clicked or when clicking outside the modal.
   */
  const handleCloseNewMockInterviewModal = () => {
    setShowNewMockInterviewModal(false);
  };

  /**
   * Handler function to confirm navigation to a new mock interview.
   * Closes the modal and navigates to the mock interview screen with a fresh conversation.
   */
  const handleConfirmNewMockInterview = () => {
    setShowNewMockInterviewModal(false);
    onNewMockInterview();
  };

  /**
   * Handler function to show the "new job listing" warning modal.
   * Opens the warning popup to confirm navigation to the job listing entry screen.
   */
  const handleNewJobListing = () => {
    setShowNewJobListingModal(true);
  };

  /**
   * Handler function to close the "new job listing" warning modal.
   * Called when cancel is clicked or when clicking outside the modal.
   */
  const handleCloseNewJobListingModal = () => {
    setShowNewJobListingModal(false);
  };

  /**
   * Handler function to confirm navigation to a new job listing.
   * Closes the modal and navigates to the enter job listing URL screen, resetting all stored attributes.
   */
  const handleConfirmNewJobListing = () => {
    setShowNewJobListingModal(false);
    onNewJobListing();
  };

  /**
   * Handler function to handle clicks on the modal overlay.
   * Closes the modal when clicking outside the modal content.
   * 
   * @param e - The click event
   * @param closeHandler - The function to call to close the modal
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>, closeHandler: () => void) => {
    // Only close if clicking directly on the overlay, not on the modal content
    if (e.target === e.currentTarget) {
      closeHandler();
    }
  };

  /**
   * Handler function for the "export results" button.
   * Currently does nothing as per requirements.
   */
  const handleExportResults = () => {
    // Placeholder for future export functionality
  };

  /**
   * Effect hook to fetch or use cached evaluation reports based on config.
   * Runs when the component mounts or when dependencies change.
   */
  useEffect(() => {
    /**
     * Fetches evaluation reports either from cache or by calling the server action.
     */
    const fetchEvaluationReports = async () => {
      setIsLoadingEvaluations(true);
      setError(null);

      try {
        if (CONFIG.useCachedEvaluations) {
          // Use cached evaluation reports (with type assertion to handle string literals)
          setEvaluationReports(savedEvaluationReports as EvaluationReports);
        } else {
          
          // Fetch evaluation reports from server action
          const result = await performEvaluationsAction(
            transcript,
            jobListingResearchResponse,
            deepResearchReports,
            interviewGuide
          );

          if (result.success && result.evaluations) {
            console.log("result.evaluations", result.evaluations);
            setEvaluationReports(result.evaluations);
          } else {
            setError(result.error || "Failed to fetch evaluation reports");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoadingEvaluations(false);
      }
    };

    if (!isLoadingEvaluations) {
      fetchEvaluationReports();
    }
  }, [transcript, jobListingResearchResponse, deepResearchReports, interviewGuide]);

  /**
   * Effect hook to fetch or use cached aggregated evaluation based on config.
   * Runs when evaluation reports are available and dependencies change.
   */
  useEffect(() => {
    /**
     * Fetches aggregated evaluation either from cache or by calling the server action.
     */
    const fetchAggregatedEvaluation = async () => {
      // Wait for evaluation reports to be available before aggregating
      if (!evaluationReports) {
        return;
      }

      setIsLoadingAggregated(true);
      setError(null);

      try {
        if (CONFIG.useCachedAggregatedEvaluations) {
          // Use cached aggregated evaluation
          setAggregatedEvaluation(savedAggregatedEvaluation as AggregatedEvaluation);
        } else {
          // Fetch aggregated evaluation from server action
          const result = await performEvaluationAggregationAction(
            evaluationReports,
            transcript,
            jobListingResearchResponse
          );


          if (result.success && result.result) {
            console.log("result.aggregated", result.result);
            setAggregatedEvaluation(result.result);
          } else {
            setError(result.error || "Failed to fetch aggregated evaluation");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoadingAggregated(false);
      }
    };

    if (!isLoadingAggregated) {
      fetchAggregatedEvaluation();
    }
  }, [evaluationReports, jobListingResearchResponse]);

  return (
    <div className="perform-analysis-container">
      <div className="perform-analysis-content">
        <h1 className="perform-analysis-title">perform analysis</h1>
        
        {/* Error message display */}
        {error && (
          <div className="error-message" style={{ color: "red", padding: "1rem" }}>
            Error: {error}
          </div>
        )}

        {/* First Section: Individual Judge Evaluations */}
        {isLoadingEvaluations ? (
          <div className="loading-message" style={{ padding: "1rem" }}>
            Loading evaluation reports...
          </div>
        ) : evaluationReports ? (
          <div className="evaluations-section">
            <h2 className="evaluations-section-header">Individual Judge Evaluations</h2>
            <div className="evaluations-vstack">
              {Object.entries(evaluationReports)
                .filter(isNonNullEvaluation)
                .map(([key, evaluation]) => (
                  <EvaluationSection
                    key={key}
                    title={getJudgeTitle(key)}
                    summary={evaluation.summary}
                    feedback={evaluation.feedback as PerformanceFeedback}
                  />
                ))}
            </div>
          </div>
        ) : null}

        {/* Second Section: Aggregated Results */}
        {isLoadingAggregated ? (
          <div className="loading-message" style={{ padding: "1rem" }}>
            Loading aggregated evaluation...
          </div>
        ) : aggregatedEvaluation ? (
          <div className="aggregated-section">
            <h2 className="aggregated-section-header">Aggregated Evaluation</h2>
            
            {/* Overall Summary Sections */}
            <div className="evaluation-section">
              <h2 className="evaluation-section-title">What Went Well</h2>
              <p className="evaluation-section-summary">
                {aggregatedEvaluation.what_went_well_summary}
              </p>
            </div>
            
            <div className="evaluation-section">
              <h2 className="evaluation-section-title">Areas for Improvement</h2>
              <p className="evaluation-section-summary">
                {aggregatedEvaluation.ways_to_improve_summary}
              </p>
            </div>
            
            {/* Consolidated Feedback by Message */}
            {aggregatedEvaluation.consolidated_feedback_by_message && 
             aggregatedEvaluation.consolidated_feedback_by_message.length > 0 && (
              <div className="evaluation-section">
                <h2 className="evaluation-section-title">Feedback by Message</h2>
                <div className="feedback-cards-container">
                  {aggregatedEvaluation.consolidated_feedback_by_message.map((consolidatedFeedback, index) => (
                    <ConsolidatedFeedbackCard
                      key={consolidatedFeedback.message_id}
                      consolidatedFeedback={consolidatedFeedback}
                      transcript={transcript}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Action buttons section */}
        <div className="perform-analysis-buttons">
          <Button type="button" onClick={handleNewMockInterview}>
            new mock interview
          </Button>
          <Button type="button" onClick={handleExportResults}>
            export results
          </Button>
          <Button type="button" onClick={handleNewJobListing}>
            new job listing
          </Button>
        </div>
      </div>

      {/* Warning modal for "new mock interview" */}
      {showNewMockInterviewModal && (
        <div 
          className="modal-overlay" 
          onClick={(e) => handleOverlayClick(e, handleCloseNewMockInterviewModal)}
        >
          <div className="modal-content">
            <p className="modal-message">
              Hey, if you start a new interview your current evaluation will be deleted.
            </p>
            <div className="modal-buttons">
              <Button type="button" onClick={handleCloseNewMockInterviewModal}>
                cancel
              </Button>
              <Button type="button" onClick={handleConfirmNewMockInterview}>
                confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warning modal for "new job listing" */}
      {showNewJobListingModal && (
        <div 
          className="modal-overlay" 
          onClick={(e) => handleOverlayClick(e, handleCloseNewJobListingModal)}
        >
          <div className="modal-content">
            <p className="modal-message">
              Hey, you will lose all your progress so you better save.
            </p>
            <div className="modal-buttons">
              <Button type="button" onClick={handleCloseNewJobListingModal}>
                cancel
              </Button>
              <Button type="button" onClick={handleConfirmNewJobListing}>
                confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

