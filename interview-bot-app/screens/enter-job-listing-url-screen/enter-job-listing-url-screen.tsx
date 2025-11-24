"use client";

import { useState, useEffect, useRef } from "react";
import "./enter-job-listing-url-screen.css";
import Button from "@/components/button";
import { ButtonType } from "@/types";
import { parseJobListingAttributesAction, scrapeJobListingAction } from "@/app/actions";
import { isValidURL } from "@/utils/utils";
import { APP_NAME, HOW_THIS_WORKS_POPUP_CONTENT } from "@/utils/constants";
import AttachFiles from "@/components/attach-files/attach-files";
import { FileItem, FileStatus, type JobListingResearchResponse } from "@/types";
import ScreenPopup from "@/components/screen-popup";

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
  // State for displaying loading progress
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
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
  // State for tracking whether the user has checked "skip attaching files"
  const [isSkipAttachingFiles, setIsSkipAttachingFiles] = useState(false);
  // State for controlling the visibility of the "How this works" popup
  const [isHowItWorksPopupOpen, setIsHowItWorksPopupOpen] = useState(false);
  // Ref to track the current loadingPhase value for the interval callback
  const loadingPhaseRef = useRef<string | null>(null);

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
    } else if (!isSkipAttachingFiles && attachedFiles.length === 0) {
      setCanProceed(false);
    } else {
      setCanProceed(true);
    }
  }, [url, attachedFiles, isScraping, isSkipAttachingFiles]);

  /**
   * Effect hook that syncs the loadingPhase ref with the loadingPhase state.
   * This allows the interval callback to access the current value without causing re-renders.
   */
  useEffect(() => {
    loadingPhaseRef.current = loadingPhase;
  }, [loadingPhase]);

  /**
   * Effect hook that adds a "." to loadingPhase every second while isLoading is true.
   * Only modifies loadingPhase if it is not null.
   */
  useEffect(() => {
    // Don't do anything if isLoading is false
    if (!isLoading) {
      return;
    }

    // Set up an interval to append a "." every second
    const intervalId = setInterval(() => {
      // Check the current value from the ref (without causing re-render)
      const currentPhase = loadingPhaseRef.current;
      
      // Only modify if the phase is not null
      if (currentPhase !== null) {
        // Append a "." to the current loading phase
        setLoadingPhase(currentPhase + ".");
      }
    }, 1000);

    // Clean up the interval when isLoading becomes false or component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [isLoading]);

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
        setLoadingPhase("Extracting job listing attributes...");

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
      setError("Please enter a valid URL (www.<website>.com)");
      return;
    }

    // Reset error and set loading state
    setError(null);
    setIsScraping(true);
    setLoadingPhase("Fetching job listing website content...");
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
    // If "skip attaching files" is checked, pass an empty array
    // Otherwise, filter attached files to only include those with SUCCESS or SAVED status
    const filesToPass = isSkipAttachingFiles
      ? []
      : attachedFiles.filter(
          (item) => item.status === FileStatus.SUCCESS || item.status === FileStatus.SAVED
        );

    // Handle navigation to the next page
    onScrapeSuccess(parsedJobListingData, filesToPass);
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

  /**
   * Handles changes to the "skip attaching files" checkbox state.
   * Updates the local state to track whether files should be skipped.
   * @param isSkipped Whether the "skip attaching files" checkbox is checked
   */
  const handleSkipStatusChange = (isSkipped: boolean) => {
    setIsSkipAttachingFiles(isSkipped);
  }

  /**
   * Handles clicking on the "How this works" button.
   * Opens the popup with information about how the application works.
   */
  const handleHowItWorksClick = () => {
    setIsHowItWorksPopupOpen(true);
  };

  /**
   * Handles closing the "How this works" popup.
   * Called when the user clicks the close button, cancel, confirm, or outside the popup.
   */
  const handleCloseHowItWorksPopup = () => {
    setIsHowItWorksPopupOpen(false);
  };

  return (
    <div className="job-listing-url-container">
      <div className="screen-content">
        <h1 className="app-title">{APP_NAME}</h1>
        <div className="app-subtitle-container">
          <p className="app-subtitle"><i>Become an expert and crush your next interview</i></p>
          <p className="app-subtitle-info" onClick={handleHowItWorksClick}>How this works</p>
        </div>
        
        <div className="input-group">
          <input
            type="text"
            placeholder="enter the url of your job listing"
            className="job-listing-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button 
            htmlType="button"
            type={ButtonType.PRIMARY}
            onClick={handleScrape} 
            disabled={!canProceed || isLoading}
            className="start-analysis-button"
            tooltip={canProceed ? undefined : "Enter a URL and attach files or skip attaching"}
          >
            {isLoading ? "Loading..." : "Start Analysis"}
          </Button>
        </div>
        
        {/* Display error message if something went wrong */}
        {error && <div className="error-message">{error}</div>}

        {/* Display loading phase if it is set */}
        {loadingPhase && <div className="url-loading-phase">{loadingPhase}</div>}

        <div className="attach-files-wrapper">
          <AttachFiles 
            attachedFilesDidChange={handleAttachedFilesChange}
            skipStatusDidChange={handleSkipStatusChange}
          />
        </div>
      </div>

      {/* "How this works" popup */}
      {isHowItWorksPopupOpen && (
        <ScreenPopup
          markdownText={HOW_THIS_WORKS_POPUP_CONTENT}
          onClose={handleCloseHowItWorksPopup}
          className="how-this-works-popup"
        />
      )}
    </div>
  );
}
