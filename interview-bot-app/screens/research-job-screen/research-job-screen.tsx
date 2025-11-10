"use client";

import { useState, useEffect } from "react";
import "./research-job-screen.css";
import { parseJobListingAttributesAction, performDeepResearchAction, createInterviewGuideAction } from "@/app/actions";
import type { JobListingResearchResponse, DeepResearchReports } from "@/types";
import Button from "@/components/button";

/**
 * Props for the ResearchJobScreen component.
 */
interface ResearchJobScreenProps {
  /**
   * The scraped content from the job listing website.
   * This is required and will be parsed to extract structured attributes.
   */
  jobListingScrapeContent: string;
  /**
   * Callback function to navigate to the mock interview screen.
   * Called when the "start mock interview" button is clicked.
   */
  onStartMockInterview: () => void;
}

/**
 * Screen component for researching a job listing.
 * Accepts scraped job listing content, parses it to extract structured attributes,
 * and displays the results in a textbox.
 */
export default function ResearchJobScreen({ jobListingScrapeContent, onStartMockInterview }: ResearchJobScreenProps) {
   // State for the current loading stage message
   const [loadingStage, setLoadingStage] = useState<string | null>(null);
   // State to track if research has been completed successfully
   const [hasCompletedResearch, setHasCompletedResearch] = useState<boolean>(false);
   // State for error messages
   const [error, setError] = useState<string | null>(null);
  // State for the parsed job listing attributes
  const [parsedData, setParsedData] = useState<JobListingResearchResponse | null>(null);
  // State for deep research reports
  const [deepResearchReports, setDeepResearchReports] = useState<DeepResearchReports | null>(null);
  // State for the interview guide
  const [interviewGuide, setInterviewGuide] = useState<string | null>(null);

  /**
   * Effect hook that runs when the component mounts or when jobListingScrapeContent changes.
   * Calls the server action to parse the job listing attributes.
   */
  useEffect(() => {
    /**
     * Async function to parse the job listing attributes.
     * Called automatically when the component loads.
     */
    const parseAttributes = async () => {

      setLoadingStage("Parsing job listing attributes...");

      try {
        // Call the server action to parse the job listing attributes
        const result = await parseJobListingAttributesAction(jobListingScrapeContent);
        
        // Check if the action was successful
        if (result.success && result.data) {
          // Update loading stage to reflect next step
          setLoadingStage("Performing deep research...");
          // Store the parsed data
          setParsedData(result.data);
        } else {
          // Handle error from server action
          throw new Error(result.error || "Failed to parse job listing attributes");
        }
      } catch (err) {
        // Handle exceptions and display error message
        const errorMessage = err instanceof Error ? err.message : "Failed to parse job listing attributes";
        setError(errorMessage);
        setParsedData(null);

        setLoadingStage(null);
      }
    };

    // Call the parse function when component mounts
    parseAttributes();
  }, [jobListingScrapeContent]);

  /**
   * Effect hook that runs when parsedData changes.
   * Calls the server action to perform deep research if parsedData exists.
   */
  useEffect(() => {
    // Only run deep research if parsedData exists
    if (!parsedData) {
      return;
    }

    /**
     * Async function to perform deep research on the parsed job listing.
     * Called automatically when parsedData is available.
     */
    const runDeepResearch = async () => {
      try {
        // Call the server action to perform deep research
        const deepResearchResult = await performDeepResearchAction(parsedData);
        
        // Check if the deep research was successful
        if (deepResearchResult.success && deepResearchResult.reports) {
          // Store the deep research reports
          setDeepResearchReports(deepResearchResult.reports);
          // Update loading stage to reflect next step
          setLoadingStage("Creating interview guide...");
        } else {
          // Handle error from deep research action
          throw new Error(deepResearchResult.error || "Failed to perform deep research");
        }
      } catch (deepResearchErr) {
        // Handle exceptions from deep research and display error message
        const deepResearchErrorMessage = deepResearchErr instanceof Error 
          ? deepResearchErr.message 
          : "Failed to perform deep research";
        setError(deepResearchErrorMessage);
        setDeepResearchReports(null);
        setLoadingStage(null);
      }
    };

    // Call the deep research function when parsedData is available
    runDeepResearch();
  }, [parsedData]);

  /**
   * Effect hook that runs when deepResearchReports changes.
   * Calls the server action to create an interview guide if both parsedData and deepResearchReports exist.
   */
  useEffect(() => {
    // Only create interview guide if both parsedData and deepResearchReports exist
    if (!parsedData || !deepResearchReports) {
      return;
    }

    /**
     * Async function to create an interview guide from the job listing research and deep research reports.
     * Called automatically when deepResearchReports is available.
     */
    const createGuide = async () => {
      try {
        // Call the server action to create the interview guide
        const guideResult = await createInterviewGuideAction(parsedData, deepResearchReports);

        // Check if the guide creation was successful
        if (guideResult.success && guideResult.guide) {
          // Store the interview guide
          setInterviewGuide(guideResult.guide);
          // Mark research as completed
          setHasCompletedResearch(true);
        } else {
          // Handle error from guide creation action
          throw new Error(guideResult.error || "Failed to create interview guide");
        }
      } catch (guideErr) {
        // Handle exceptions from guide creation and display error message
        const guideErrorMessage = guideErr instanceof Error 
          ? guideErr.message 
          : "Failed to create interview guide";
        setError(guideErrorMessage);
        setInterviewGuide(null);
        setHasCompletedResearch(false);
      } finally {
        setLoadingStage(null);
      }
    };

    // Call the guide creation function when deepResearchReports is available
    createGuide();
  }, [deepResearchReports, parsedData]);

  return (
    <div className="research-job-container">
      <div className="research-job-content">
        <h1 className="research-job-title">Job Listing Research</h1>
        
        {/* Display loading stage in textbox while loading */}
        {loadingStage && (
          <textarea
            className="parsed-data-textbox"
            value={loadingStage}
            readOnly
            rows={30}
          />
        )}
        
        {/* Display error message if parsing failed */}
        {error && <div className="error-message">{error}</div>}
        

        {/* Display interview guide in a textbox when it's ready */}
        {interviewGuide && !loadingStage && (
          <div className="interview-guide-section">
            <h2 className="research-report-title">Interview Guide</h2>
            <textarea
              className="parsed-data-textbox"
              value={interviewGuide}
              readOnly
              rows={30}
            />
            {/* Display start mock interview button when research has been completed */}
            {hasCompletedResearch && (
              <Button type="button" onClick={onStartMockInterview}>
                start mock interview
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

