"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./research-job-screen.css";
import { parseJobListingAttributesAction, performDeepResearchAndContextDistillationAction, createInterviewGuideAction } from "@/app/actions";
import type { JobListingResearchResponse, DeepResearchReports, FileItem } from "@/types";
import Button from "@/components/button";

/**
 * Props for the ResearchJobScreen component.
 */
interface ResearchJobScreenProps {
  /**
   * The scraped content from the job listing website.
   * This is required and will be parsed to extract structured attributes.
   */
  jobListingParsedData: JobListingResearchResponse;
  /**
   * List of attached files that were successfully uploaded (with SUCCESS or SAVED status).
   * These files will be used for user context distillation.
   */
  attachedFiles: FileItem[];
  /**
   * Callback function to navigate to the mock interview screen.
   * Called when the "start mock interview" button is clicked.
   * 
   * @param deepResearchReports - Deep research reports to pass to the interview screen
   * @param interviewGuide - The interview guide to pass to the interview screen
   */
  onStartMockInterview: (deepResearchReports: DeepResearchReports, interviewGuide: string) => void;
}

/**
 * Screen component for researching a job listing.
 * Accepts scraped job listing content, parses it to extract structured attributes,
 * and displays the results in a textbox.
 */
export default function ResearchJobScreen({ jobListingParsedData, attachedFiles, onStartMockInterview }: ResearchJobScreenProps) {
   // State for the current loading stage message
   const [loadingStage, setLoadingStage] = useState<string | null>(null);
   //  State for if deep research is running
   const [isLoadingDeepResearch, setIsLoadingDeepResearch] = useState<boolean>(false);
   //  State for if guide creation is running
  const [isLoadingGuide, setIsLoadingGuide] = useState<boolean>(false);
   // State to track if research has been completed successfully
   const [hasCompletedResearch, setHasCompletedResearch] = useState<boolean>(false);
   // State for error messages
   const [error, setError] = useState<string | null>(null);
  // State for deep research reports
  const [deepResearchAndContextDistillationReports, setDeepResearchAndContextDistillationReports] = useState<DeepResearchReports | null>(null);
  // State for the interview guide
  const [interviewGuide, setInterviewGuide] = useState<string | null>(null);

  /**
   * Effect hook that runs when parsedData changes.
   * Calls the server action to perform deep research and user context distillation in parallel if parsedData exists.
   */
  useEffect(() => {
    /**
     * Async function to perform deep research on the parsed job listing and user context distillation.
     * Both operations run in parallel automatically when parsedData is available.
     */
    const runDeepResearch = async () => {
      try {
        setIsLoadingDeepResearch(true);
        setLoadingStage("Performing deep research...");
        // Call the server action to perform deep research and user context distillation in parallel
        const deepResearchResult = await performDeepResearchAndContextDistillationAction(jobListingParsedData, attachedFiles);
        
        // Check if the deep research was successful
        if (deepResearchResult.success && deepResearchResult.reports) {
          // Store the deep research reports
          setDeepResearchAndContextDistillationReports(deepResearchResult.reports);
          
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
        setDeepResearchAndContextDistillationReports(null);
        setLoadingStage(null);
      } finally {
        setIsLoadingDeepResearch(false);
      }
    };

    // Call the deep research function when parsedData is available
    if (jobListingParsedData && !isLoadingDeepResearch) {
      runDeepResearch();
    }
  }, [jobListingParsedData]);

  /**
   * Effect hook that runs when deepResearchReports changes.
   * Calls the server action to create an interview guide if both parsedData and deepResearchReports exist.
   */
  useEffect(() => {
    /**
     * Async function to create an interview guide from the job listing research and deep research reports.
     * Called automatically when deepResearchReports is available.
     */
    const createGuide = async () => {
      try {
        if (!deepResearchAndContextDistillationReports) {
          throw new Error("No deep research reports to create interview guide from");
        }

        setIsLoadingGuide(true);
        // Call the server action to create the interview guide
        const guideResult = await createInterviewGuideAction(jobListingParsedData, deepResearchAndContextDistillationReports);

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
      } finally {
        setLoadingStage(null);
        setIsLoadingGuide(false);
      }
    };

    // Call the guide creation function when deepResearchReports is available
    if (jobListingParsedData && deepResearchAndContextDistillationReports && !isLoadingGuide) {
      createGuide();
    }
  }, [deepResearchAndContextDistillationReports]);

  return (
    <div className="research-job-container">
      {/* Display loading state in top left corner with shimmer animation */}
      {loadingStage && (
        <div className="loading-state">
          <div className="loading-text shimmer">{loadingStage}</div>
        </div>
      )}
      
      <div className="research-job-content">
        <h1 className="research-job-title">Job Listing Research</h1>
        
        {/* Display error message if parsing failed */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Display parsed job listing data as text labels */}
        {jobListingParsedData && (
          <div className="parsed-data-section">
            <div className="data-label">
              <span className="label-text">Role Title:</span>
              <span className="label-value">{jobListingParsedData.job_title}</span>
            </div>
            <div className="data-label">
              <span className="label-text">Company Name:</span>
              <span className="label-value">{jobListingParsedData.company_name}</span>
            </div>
            <div className="data-label">
              <span className="label-text">Job Location:</span>
              <span className="label-value">{jobListingParsedData.job_location}</span>
            </div>
            <div className="data-label">
              <span className="label-text">Job Description:</span>
              <span className="label-value">{jobListingParsedData.job_description}</span>
            </div>
          </div>
        )}
        
        {/* Display deep research reports as rendered markdown */}
        {deepResearchAndContextDistillationReports && (
          <div className="deep-research-section">
            <h2 className="research-report-title">Deep Research Reports</h2>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepResearchAndContextDistillationReports.companyStrategyReport}</ReactMarkdown>
            </div>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepResearchAndContextDistillationReports.roleSuccessReport}</ReactMarkdown>
            </div>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepResearchAndContextDistillationReports.teamCultureReport}</ReactMarkdown>
            </div>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepResearchAndContextDistillationReports.domainKnowledgeReport}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Display start mock interview button when research has been completed */}
        {hasCompletedResearch && deepResearchAndContextDistillationReports && interviewGuide && (
          <div className="button-section">
            <Button 
              type="button" 
              onClick={() => onStartMockInterview(deepResearchAndContextDistillationReports, interviewGuide)}
            >
              start mock interview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

