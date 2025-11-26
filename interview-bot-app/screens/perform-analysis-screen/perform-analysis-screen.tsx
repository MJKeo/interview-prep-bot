"use client";

import { useState, useEffect } from "react";
import "./perform-analysis-screen.css";
import type { 
  JobListingResearchResponse, 
  DeepResearchReports, 
  EvaluationReports, 
  InterviewTranscript,
  AggregatedEvaluation,
  JobListingWithId
} from "@/types";
import Button from "@/components/button";
import { ButtonType } from "@/types";
import { performEvaluationsAction, performEvaluationAggregationAction } from "@/app/actions";
import LoadingBar from "@/components/loading-bar";
import TranscriptFeedbackItem from "@/components/transcript-feedback-item";

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
  currentJobListing: JobListingWithId;
  /**
   * The ID of the current interview being explored.
   */
  currentInterviewId: string;
  /**
   * The aggregated evaluation for the current interview (if it was already calculated for this interview).
   */
  savedAggregatedEvaluation: AggregatedEvaluation | null;
  /**
   * Callback function to navigate back to the mock interview screen with a fresh conversation.
   * Called when the user confirms the "new mock interview" warning.
   */
  onNewMockInterview: () => void;
  /**
   * Callback function called when the current job listing is updated.
   * Used to save updated job listing data (e.g., deep research reports, interview guide) to the database.
   */
  onCurrentListingUpdated: () => void;
}


/**
 * Screen component for performing analysis.
 * Displays evaluation summary and interactive transcript with feedback.
 */
export default function PerformAnalysisScreen({ 
  transcript, 
  jobListingResearchResponse,
  deepResearchReports,
  currentJobListing,
  currentInterviewId,
  interviewGuide,
  savedAggregatedEvaluation,
  onNewMockInterview,
  onCurrentListingUpdated,
}: PerformAnalysisScreenProps) {
  // State to control the visibility of the "new mock interview" warning modal
  const [showNewMockInterviewModal, setShowNewMockInterviewModal] = useState<boolean>(false);
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

  // Loading messages for evaluation phase
  const evaluationMessages = [
    "Analyzing your responses against job requirements...",
    "Evaluating communication clarity and structure...",
    "Assessing technical accuracy and depth...",
    "Reviewing behavioral response quality...",
    "Comparing answers to industry best practices...",
    "Identifying strengths and improvement areas...",
    "Preparing detailed performance insights...",
    "Discovering who let the dogs out...",
    "Initiating self destruct (just kidding)...",
    "Taking off blindfold...",
  ];

  // Loading messages for aggregation phase
  const aggregationMessages = [
    "Consolidating feedback from all evaluators...",
    "Identifying common themes and patterns...",
    "Prioritizing key improvement opportunities...",
    "Synthesizing strengths and weaknesses...",
    "Creating actionable feedback summaries...",
    "Organizing insights by message...",
    "Finalizing consolidated evaluation...",
    "Preparing your personalized feedback report...",
    "Does anyone even read these?..",
    "Chimp bonobo ape...",
  ];

  /**
   * Handler function to show the "new mock interview" warning modal.
   * Opens the warning popup to confirm navigation to a new mock interview.
   */
  const handleNewMockInterview = () => {
    onNewMockInterview();
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
        console.log("Fetching evaluation reports");
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
          console.log("result.error", result);
          console.log("Error 1")
          setError(result.error || "Failed to fetch evaluation reports");
        }
      } catch (err) {
        console.log("Error 2")
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoadingEvaluations(false);
      }
    };

    console.log("Test")

    if (!savedAggregatedEvaluation && !isLoadingEvaluations) {
      fetchEvaluationReports();
    }
  }, [savedAggregatedEvaluation, transcript, jobListingResearchResponse, deepResearchReports, interviewGuide]);

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
        // Fetch aggregated evaluation from server action
        const result = await performEvaluationAggregationAction(
          evaluationReports,
          transcript,
          jobListingResearchResponse
        );


        if (result.success && result.result) {
          console.log("result.aggregated", result.result);
          setAggregatedEvaluation(result.result);

          // Update the current interview/listing
          const interviewToUpdate = currentJobListing.data.interviews?.[currentInterviewId];
          if (interviewToUpdate) {
            interviewToUpdate.evaluation = result.result;
            onCurrentListingUpdated();
          }
        } else {
          setError(result.error || "Failed to fetch aggregated evaluation");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoadingAggregated(false);
      }
    };

    if (!savedAggregatedEvaluation && !isLoadingAggregated) {
      fetchAggregatedEvaluation();
    } else if (savedAggregatedEvaluation) {
      setAggregatedEvaluation(savedAggregatedEvaluation);
    }
  }, [savedAggregatedEvaluation, evaluationReports, jobListingResearchResponse]);

  // Determine if we're in loading state
  const isLoading = isLoadingEvaluations || isLoadingAggregated;

  return (
    <div className="perform-analysis-container">
      <div className="perform-analysis-content">
        {/* Centered title - always visible */}
        <h1 className="perform-analysis-title">Evaluation & Feedback</h1>
        
        {/* Loading states - show loading bar */}
        {isLoadingEvaluations && (
          <LoadingBar
            timeToLoad={18}
            initialLoadingMessage={"Starting interview performance evaluation..."}
            waitingMessages={evaluationMessages}
          />
        )}
        {isLoadingAggregated && (
          <div className="loading-bar-container">
            <p className="loading-progress-text">Finished performing evaluations</p>
            <LoadingBar
              timeToLoad={35}
              initialLoadingMessage={"Aggregating evaluations into a single report..."}
              waitingMessages={aggregationMessages}
            />
          </div>
        )}

            {/* Summary Section */}
            {aggregatedEvaluation && (
              <div className="perform-analysis-section">
                <h2 className="perform-analysis-section-header">Overview</h2>
                <div className="perform-analysis-summary">
                  {/* What Went Well */}
                  <div className="perform-analysis-summary-subsection">
                    <h3 className="perform-analysis-summary-subsection-title">What Went Well</h3>
                    <p className="perform-analysis-summary-subsection-content">
                      {aggregatedEvaluation.what_went_well_summary}
                    </p>
                  </div>
                  
                  {/* Ways to Improve */}
                  <div className="perform-analysis-summary-subsection">
                    <h3 className="perform-analysis-summary-subsection-title">Opportunities for Improvement</h3>
                    <p className="perform-analysis-summary-subsection-content">
                      {aggregatedEvaluation.ways_to_improve_summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Interview Transcript with Feedback Section */}
            {aggregatedEvaluation && (
              <div className="perform-analysis-section">
                <h2 className="perform-analysis-section-header">Interview Transcript with Feedback</h2>
                <div className="perform-analysis-transcript-header">
                  <p className="perform-analysis-transcript-description">
                    Review your interview transcript below. Click on the highlighted responses to view detailed insights on what you did well and how you can improve for next time.
                  </p>
                </div>
                
                {/* Transcript List */}
                <div className="perform-analysis-transcript-list">
                  {transcript.map((message) => {
                    // Find matching feedback for this message
                    const feedback = aggregatedEvaluation.consolidated_feedback_by_message?.find(
                      (fb) => fb.message_id === message.id
                    );
                    
                    return (
                      <TranscriptFeedbackItem
                        key={message.id}
                        message={message}
                        feedback={feedback}
                      />
                    );
                  })}
                </div>
              </div>
            )}
      </div>

      {/* Sticky bottom bar - only show when not loading */}
      {!isLoading && (
        <div className="perform-analysis-bottom-bar">
          <Button htmlType="button" type={ButtonType.PRIMARY} onClick={handleNewMockInterview}>
            New Practice Interview
          </Button>
        </div>
      )}
    </div>
  );
}

