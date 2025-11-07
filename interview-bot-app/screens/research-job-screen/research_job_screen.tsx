"use client";

import { useState, useEffect } from "react";
import "./research_job_screen.css";
import { parseJobListingAttributesAction } from "@/app/actions";
import type { JobListingResearchResponse } from "@/types/job-listing-research-response";

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
  // State for the parsed job listing attributes
  const [parsedData, setParsedData] = useState<JobListingResearchResponse | null>(null);
  // State for loading status
  const [isLoading, setIsLoading] = useState(true);
  // State for error messages
  const [error, setError] = useState<string | null>(null);

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
      // Reset error and set loading state
      setError(null);
      setIsLoading(true);

      try {
        // Call the server action to parse the job listing attributes
        const result = await parseJobListingAttributesAction(jobListingScrapeContent);
        
        // Check if the action was successful
        if (result.success && result.data) {
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
      } finally {
        // Always reset loading state when done
        setIsLoading(false);
      }
    };

    // Call the parse function when component mounts
    parseAttributes();
  }, [jobListingScrapeContent]);

  /**
   * Formats the parsed job listing data as a JSON string for display.
   * 
   * @param data - The parsed job listing data to format
   * @returns A formatted JSON string with 2-space indentation
   */
  const formatParsedData = (data: JobListingResearchResponse): string => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="research-job-container">
      <div className="research-job-content">
        <h1 className="research-job-title">Job Listing Research</h1>
        
        {/* Display loading message while parsing */}
        {isLoading && (
          <div className="loading-message">Parsing job listing attributes...</div>
        )}
        
        {/* Display error message if parsing failed */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Display results textbox if data was parsed successfully */}
        {parsedData && !isLoading && (
          <textarea
            className="parsed-data-textbox"
            value={formatParsedData(parsedData)}
            readOnly
            rows={30}
          />
        )}
      </div>
    </div>
  );
}

