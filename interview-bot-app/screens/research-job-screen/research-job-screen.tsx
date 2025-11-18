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
  jobListingScrapeContent: string;
  /**
   * List of attached files that were successfully uploaded (with SUCCESS or SAVED status).
   * These files will be used for user context distillation.
   */
  attachedFiles: FileItem[];
  /**
   * Callback function to navigate to the mock interview screen.
   * Called when the "start mock interview" button is clicked.
   * 
   * @param jobListingResearchResponse - Parsed job listing metadata to pass to the interview screen
   * @param deepResearchReports - Deep research reports to pass to the interview screen
   * @param interviewGuide - The interview guide to pass to the interview screen
   */
  onStartMockInterview: (jobListingResearchResponse: JobListingResearchResponse, deepResearchReports: DeepResearchReports, interviewGuide: string) => void;
}

/**
 * Screen component for researching a job listing.
 * Accepts scraped job listing content, parses it to extract structured attributes,
 * and displays the results in a textbox.
 */
export default function ResearchJobScreen({ jobListingScrapeContent, attachedFiles, onStartMockInterview }: ResearchJobScreenProps) {
   // State for the current loading stage message
   const [loadingStage, setLoadingStage] = useState<string | null>(null);
   // State to track if research has been completed successfully
   const [hasCompletedResearch, setHasCompletedResearch] = useState<boolean>(false);
   // State for error messages
   const [error, setError] = useState<string | null>(null);
  // State for the parsed job listing attributes
  const [parsedData, setParsedData] = useState<JobListingResearchResponse | null>(null);
  // State for deep research reports
  const [deepResearchAndContextDistillationReports, setDeepResearchAndContextDistillationReports] = useState<DeepResearchReports | null>(null);
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

      console.log("Test 2")

      setLoadingStage("Parsing job listing attributes...");

      try {
        // Call the server action to parse the job listing attributes
        console.log("Test 2.1")
        const result = await parseJobListingAttributesAction(jobListingScrapeContent);
        console.log("Test 2.2")
        // Check if the action was successful
        if (result.success && result.data) {
          console.log("Test 2.3")
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
   * Calls the server action to perform deep research and user context distillation in parallel if parsedData exists.
   */
  useEffect(() => {
    // Only run deep research if parsedData exists
    if (!parsedData) {
      return;
    }

    /**
     * Async function to perform deep research on the parsed job listing and user context distillation.
     * Both operations run in parallel automatically when parsedData is available.
     */
    const runDeepResearch = async () => {
      console.log("Test 3")
      try {
        // Call the server action to perform deep research and user context distillation in parallel
        const deepResearchResult = await performDeepResearchAndContextDistillationAction(parsedData, attachedFiles);
        
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
    if (!parsedData || !deepResearchAndContextDistillationReports) {
      return;
    }

    /**
     * Async function to create an interview guide from the job listing research and deep research reports.
     * Called automatically when deepResearchReports is available.
     */
    const createGuide = async () => {
      try {
        // Call the server action to create the interview guide
        const guideResult = await createInterviewGuideAction(parsedData, deepResearchAndContextDistillationReports);

        // Check if the guide creation was successful
        if (guideResult.success && guideResult.guide) {
          console.log(guideResult.guide);
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
  }, [deepResearchAndContextDistillationReports, parsedData]);

  const markdown = `
# Hello World 👋
This is **Markdown** rendered in React.
- Supports *lists*
- [Links](https://example.com)
- Tables | too | 🍀
`;

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
        {parsedData && (
          <div className="parsed-data-section">
            <div className="data-label">
              <span className="label-text">Role Title:</span>
              <span className="label-value">{parsedData.job_title}</span>
            </div>
            <div className="data-label">
              <span className="label-text">Company Name:</span>
              <span className="label-value">{parsedData.company_name}</span>
            </div>
            <div className="data-label">
              <span className="label-text">Job Location:</span>
              <span className="label-value">{parsedData.job_location}</span>
            </div>
            <div className="data-label">
              <span className="label-text">Job Description:</span>
              <span className="label-value">{parsedData.job_description}</span>
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
        {hasCompletedResearch && parsedData && deepResearchAndContextDistillationReports && interviewGuide && (
          <div className="button-section">
            <Button 
              type="button" 
              onClick={() => onStartMockInterview(parsedData, deepResearchAndContextDistillationReports, interviewGuide)}
            >
              start mock interview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

