"use client";

import { useState, useEffect } from "react";
import "./enter-job-listing-url-screen.css";
import Button from "@/components/button";
import { parseJobListingAttributesAction, scrapeJobListingAction } from "@/app/actions";
import { isValidURL } from "@/utils/utils";
import AttachFiles from "@/components/attach-files/attach-files";
import { FileItem, FileStatus, type JobListingResearchResponse } from "@/types";

/**
 * Props for the EnterJobListingUrlScreen component.
 */
interface EnterJobListingUrlScreenProps {
  /**
   * Callback function called when job listing scraping is successful.
   * Receives the scraped content and a list of successfully attached files as parameters.
   */
  onScrapeSuccess: (jobListingData: JobListingResearchResponse, attachedFiles: FileItem[]) => void;
}

/**
 * Screen component for entering a job listing URL.
 * Displays a single input textbox for users to enter the URL of their job listing.
 * When the user clicks the button or presses Enter, it scrapes the URL and calls
 * the onNext callback with the scraped content.
 */
export default function EnterJobListingUrlScreen({ onScrapeSuccess }: EnterJobListingUrlScreenProps) {
  // Whether we can attempt to proceed to the next page (may need to wait on something)
  const [canProceed, setCanProceed] = useState(false);
  // State for the URL input value
  const [url, setUrl] = useState("");
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for loading status
  const [isScraping, setIsScraping] = useState(false);
  // State for scraped job listing website content
  const [scrapedJobListingWebsiteContent, setScrapedJobListingWebsiteContent] = useState<string | null>(null);
  // State for parsing job listing attributes
  const [isParsingAttributes, setIsParsingAttributes] = useState(false);
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  // State for tracking if any attached files are still loading (not success or saved)
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    // Check if any files have a status other than SUCCESS or SAVED
    // This means files are still loading or have errors
    const hasLoadingFiles = attachedFiles.some(
      (item) => item.status !== FileStatus.SUCCESS && item.status !== FileStatus.SAVED
    );

    if (hasLoadingFiles) {
      setCanProceed(false);
    } else if (url.trim().length === 0) {
      setCanProceed(false);
    } else if (isScraping || isParsingAttributes) {
      setCanProceed(false);
    } else {
      setCanProceed(true);
    }
  }, [url, attachedFiles, isScraping]);

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
      try {
        if (!scrapedJobListingWebsiteContent) {
          throw new Error("No scraped job listing website content to parse");
        }

        setIsParsingAttributes(true);

        // Call the server action to parse the job listing attributes
        const result = await parseJobListingAttributesAction(scrapedJobListingWebsiteContent);
        // Check if the action was successful
        if (result.success && result.data) {
          // We have our data so let's move on to the next page
          completeScrapeAndParse(result.data);
        } else {
          // Handle error from server action
          throw new Error(result.error || "Failed to parse job listing attributes");
        }
      } catch (err) {
        // Handle exceptions and display error message
        const errorMessage = err instanceof Error ? err.message : "Failed to parse job listing attributes";
        setError(errorMessage);
      } finally {
        setIsParsingAttributes(false);
        setIsLoading(false);
      }
    };

    // Call the parse function when component mounts
    if (!isParsingAttributes && scrapedJobListingWebsiteContent) {
      parseAttributes();
    }
  }, [scrapedJobListingWebsiteContent]);

  /**
   * Handles the scraping of the job listing URL.
   * Called when the user clicks the button or presses Enter.
   * Uses a server action to keep the API key secure on the server.
   */
  const handleScrape = async () => {
    // Capture a trimmed version of the URL to prevent whitespace-related validation failures.
    var cleanedUrl = url.trim();
    // Edge case: If the user enters "www.<website>" it should still work
    if (cleanedUrl.startsWith("www.")) {
      cleanedUrl = "https://" + cleanedUrl;
    }

    // Validate URL syntax before attempting to scrape
    if (!isValidURL(cleanedUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    // Reset error and set loading state
    setError(null);
    setIsScraping(true);
    setIsLoading(true);

    try {
      // Call the server action to scrape the URL
      const result = await scrapeJobListingAction(cleanedUrl);
      
      // Check if the action was successful
      if (result.success && result.content) {
        // Update local state to trigger attribute parsing
        setScrapedJobListingWebsiteContent(result.content);
      } else {
        // Handle error from server action
        throw new Error(result.error || "Failed to scrape job listing");
      }
    } catch (err) {
      // Handle exceptions and display error message
      const errorMessage = err instanceof Error ? err.message : "Failed to scrape job listing";
      setError(errorMessage);
      setIsLoading(false);
    } finally {
      // Always reset loading state when done
      setIsScraping(false);
    }
  };

  const completeScrapeAndParse = (parsedJobListingData: JobListingResearchResponse) => {
    // Filter attached files to only include those with SUCCESS or SAVED status
    const successfulFiles = attachedFiles.filter(
      (item) => item.status === FileStatus.SUCCESS || item.status === FileStatus.SAVED
    );

    // Handle navigation to the next page
    onScrapeSuccess(parsedJobListingData, successfulFiles);
  }

  /**
   * Handles the Enter key press in the input field.
   * Triggers scraping when Enter is pressed.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canProceed) {
      handleScrape();
    }
  };

  /**
   * Handles changes to attached files.
   * Updates the areFilesLoading state based on whether any files have a status
   * other than SUCCESS or SAVED (i.e., LOADING or ERROR).
   * @param fileItems The current array of attached file items
   */
  const handleAttachedFilesChange = (fileItems: FileItem[]) => {
    setAttachedFiles(fileItems);
  }

  return (
    <div className="job-listing-url-container">
      <div className="job-listing-component-hstack">
        <input
          type="text"
          placeholder="enter the url of your job listing"
          className="job-listing-url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {/* Display error message if something went wrong */}
        {error && <div className="error-message">{error}</div>}
        <AttachFiles 
          attachedFilesDidChange={handleAttachedFilesChange} 
        />
        <Button type="button" onClick={handleScrape} disabled={!canProceed || isLoading}>
          {isLoading ? "loading..." : "scrape"}
        </Button>
      </div>
    </div>
  );
}

