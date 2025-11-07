"use client";

import { useState, useEffect } from "react";
import "./research_job_screen.css";
import { parseJobListingAttributesAction, performDeepResearchAction } from "@/app/actions";
import type { JobListingResearchResponse, DeepResearchReports } from "@/types";

/**
 * Props for the ResearchJobScreen component.
 */
interface ResearchJobScreenProps {
  /**
   * The scraped content from the job listing website.
   * This is required and will be parsed to extract structured attributes.
   */
  jobListingScrapeContent: string;
}

/**
 * Screen component for researching a job listing.
 * Accepts scraped job listing content, parses it to extract structured attributes,
 * and displays the results in a textbox.
 */
export default function ResearchJobScreen({ jobListingScrapeContent }: ResearchJobScreenProps) {
   // State for the current loading stage message
   const [loadingStage, setLoadingStage] = useState<string | null>(null);
   // State for error messages
   const [error, setError] = useState<string | null>(null);
  // State for the parsed job listing attributes
  const [parsedData, setParsedData] = useState<JobListingResearchResponse | null>(null);
  // State for deep research reports
  const [deepResearchReports, setDeepResearchReports] = useState<DeepResearchReports | null>(null);

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
          console.log("Parsed scrape: ", result.data);
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
          console.log("Deep research reports: ", deepResearchResult.reports);
          // Store the deep research reports
          setDeepResearchReports(deepResearchResult.reports);
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
      } finally {
        setLoadingStage(null);
      }
    };

    // Call the deep research function when parsedData is available
    runDeepResearch();
  }, [parsedData]);

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
        
        {/* Display deep research reports in separate textboxes when loading is complete */}
        {deepResearchReports && !loadingStage && (
          <div className="deep-research-reports">
            <div className="research-report-section">
              <h2 className="research-report-title">Company Strategy Report</h2>
              <textarea
                className="parsed-data-textbox"
                value={deepResearchReports.companyStrategyReport}
                readOnly
                rows={30}
              />
            </div>
            <div className="research-report-section">
              <h2 className="research-report-title">Role Success Report</h2>
              <textarea
                className="parsed-data-textbox"
                value={deepResearchReports.roleSuccessReport}
                readOnly
                rows={30}
              />
            </div>
            <div className="research-report-section">
              <h2 className="research-report-title">Team Culture Report</h2>
              <textarea
                className="parsed-data-textbox"
                value={deepResearchReports.teamCultureReport}
                readOnly
                rows={30}
              />
            </div>
            <div className="research-report-section">
              <h2 className="research-report-title">Domain Knowledge Report</h2>
              <textarea
                className="parsed-data-textbox"
                value={deepResearchReports.domainKnowledgeReport}
                readOnly
                rows={30}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

