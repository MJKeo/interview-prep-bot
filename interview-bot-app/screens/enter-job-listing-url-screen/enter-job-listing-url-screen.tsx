"use client";

import { useState, useEffect } from "react";
import "./enter-job-listing-url-screen.css";
import Button from "@/components/button";
import AttachFiles from "@/components/attach-files";
import ScreenPopup from "@/components/screen-popup";
import LoadingBar from "@/components/loading-bar";
import InfoButton from "@/components/info-button";
import CustomErrorComponent from "@/components/custom-error-component";
import SegmentedControl, { type SegmentedControlTab } from "@/components/segmented-control";
import { 
  ButtonType,
  FileItem,
  FileStatus,
  type JobListingResearchResponse,
  type CustomError,
} from "@/types";
import { parseJobListingAttributesAction, scrapeJobListingAction } from "@/app/actions";
import { isValidURL } from "@/utils/utils";
import { APP_NAME, HOW_THIS_WORKS_POPUP_CONTENT, MANUAL_ENTRY_INFO_POPUP_CONTENT, TRANSIENT_ERROR_MESSAGE } from "@/utils/constants";
import { NON_TRANSIENT_ERROR_MESSAGE } from "@/utils/constants";

/**
 * Enum representing the different entry modes for job listing information.
 */
enum ListingEntryMode {
  URL = "url",
  MANUAL = "manual",
}

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
  // State for the entry mode
  const [entryMode, setEntryMode] = useState<ListingEntryMode>(ListingEntryMode.URL);
  // State for the URL input value
  const [url, setUrl] = useState("");
  // State for manual entry fields
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  // State for optional manual entry fields
  const [expectationsAndResponsibilities, setExpectationsAndResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [location, setLocation] = useState("");
  const [workSchedule, setWorkSchedule] = useState("");
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for loading status
  const [isScraping, setIsScraping] = useState(false);
  // State for scraped job listing website content
  const [scrapedJobListingWebsiteContent, setScrapedJobListingWebsiteContent] = useState<string | null>(null);
  // State for parsing job listing attributes
  const [isParsingAttributes, setIsParsingAttributes] = useState(false);
  // State for error messages
  const [error, setError] = useState<CustomError | null>(null);
  // State for tracking if any attached files are still loading (not success or saved)
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  // State for tracking whether the user has checked "skip attaching files"
  const [isSkipAttachingFiles, setIsSkipAttachingFiles] = useState(false);
  // State for controlling the visibility of various popups
  const [isHowItWorksPopupOpen, setIsHowItWorksPopupOpen] = useState(false);
  const [isEnteringInfoPopupOpen, setIsEnteringInfoPopupOpen] = useState(false);

  useEffect(() => {
    // Check if any files have a status other than SUCCESS or SAVED
    // This means files are still loading or have errors
    const hasLoadingFiles = attachedFiles.some(
      (item) => item.status !== FileStatus.SUCCESS && item.status !== FileStatus.SAVED
    );

    // Check if files are attached or skip is checked
    const filesConditionMet = isSkipAttachingFiles || attachedFiles.length > 0;

    if (hasLoadingFiles) {
      setCanProceed(false);
    } else if (isScraping || isParsingAttributes) {
      setCanProceed(false);
    } else if (!filesConditionMet) {
      setCanProceed(false);
    } else if (entryMode === ListingEntryMode.MANUAL) {
      // Manual mode: all three fields must be non-empty
      const allFieldsFilled = jobTitle.trim().length > 0 && 
                              companyName.trim().length > 0 && 
                              jobDescription.trim().length > 0;
      setCanProceed(allFieldsFilled);
    } else {
      // URL mode: URL must be non-empty
      setCanProceed(url.trim().length > 0);
    }
  }, [entryMode, url, jobTitle, companyName, jobDescription, attachedFiles, isScraping, isSkipAttachingFiles, isParsingAttributes]);

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
          throw new Error("Unable to read the provided URL. Please verify the URL is correct and try again, or enter information manually.");
        }

        setIsParsingAttributes(true);
        setError(null);

        // Call the server action to parse the job listing attributes
        const result = await parseJobListingAttributesAction(scrapedJobListingWebsiteContent);
        // Check if the action was successful
        if (result.success && result.data) {
          // We have our data so let's move on to the next page
          completeScrapeAndParse(result.data);
        } else {
          // Handle error from server action
          throw new Error(result.error ?? TRANSIENT_ERROR_MESSAGE);
        }
      } catch (err) {
        // Handle exceptions and display error message
        if (err instanceof Error) {
          setError({ message: err.message, retryAction: parseAttributes });
        } else {
          setError({ message: NON_TRANSIENT_ERROR_MESSAGE, retryAction: null });
        }
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
      setError({ message: "Please enter a valid URL (www.<website>.com)", retryAction: null });
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
        throw new Error(result.error ?? TRANSIENT_ERROR_MESSAGE);
      }
    } catch (err) {
      // Handle exceptions and display error message
      if (err instanceof Error) {
        setError({ message: err.message, retryAction: handleScrape });
      } else {
        setError({ message: NON_TRANSIENT_ERROR_MESSAGE, retryAction: null });
      }
    } finally {
      // Always reset loading state when done
      setIsLoading(false);
      setIsScraping(false);
    }
  };

  const completeScrapeAndParse = (parsedJobListingData: JobListingResearchResponse) => {
    // If "skip attaching files" is checked, pass an empty array
    // Otherwise, filter attached files to only include those with SUCCESS or SAVED status
    const filesToPass = attachedFilesToPass();

    // Handle navigation to the next page
    onScrapeSuccess(parsedJobListingData, filesToPass);
  }

  const attachedFilesToPass = () => {
    return isSkipAttachingFiles
      ? []
      : attachedFiles.filter(
          (item) => item.status === FileStatus.SUCCESS || item.status === FileStatus.SAVED
        );
  }

  /**
   * Handles manual entry submission.
   * Constructs a JobListingResearchResponse object from manual inputs
   * and immediately calls onScrapeSuccess without any scraping or parsing.
   */
  const handleManualEntry = () => {
    // Construct the job listing data object with manual inputs
    const manualJobListingData: JobListingResearchResponse = {
      job_title: jobTitle.trim(),
      company_name: companyName.trim(),
      job_description: jobDescription.trim(),
      // Use optional field values if provided, otherwise default to "Unknown"
      job_location: location.trim() || "Unknown",
      work_schedule: workSchedule.trim() || "Unknown",
      expectations_and_responsibilities: expectationsAndResponsibilities.trim() || "Unknown",
      requirements: requirements.trim() || "Unknown",
    };

    // If "skip attaching files" is checked, pass an empty array
    // Otherwise, filter attached files to only include those with SUCCESS or SAVED status
    const filesToPass = attachedFilesToPass();

    // Immediately navigate to the next page with manual entry data
    onScrapeSuccess(manualJobListingData, filesToPass);
  }

  /**
   * Maps ListingEntryMode enum values to SegmentedControlTab objects.
   */
  const entryModeTabs: SegmentedControlTab[] = [
    { value: ListingEntryMode.URL, label: "Listing URL" },
    { value: ListingEntryMode.MANUAL, label: "Manual Entry" },
  ];

  /**
   * Handles changes to the entry mode selection.
   * Converts the string value from SegmentedControl back to ListingEntryMode enum.
   * @param value The string value from the segmented control
   */
  const handleEntryModeChange = (value: string) => {
    // Convert string value back to enum
    if (value === ListingEntryMode.URL) {
      setEntryMode(ListingEntryMode.URL);
    } else if (value === ListingEntryMode.MANUAL) {
      setEntryMode(ListingEntryMode.MANUAL);
    }
  };

  /**
   * Handles the Enter key press in the input field.
   * Triggers scraping when Enter is pressed (URL mode) or manual entry (manual mode).
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && canProceed) {
      if (entryMode === ListingEntryMode.MANUAL) {
        handleManualEntry();
      } else {
        handleScrape();
      }
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

  return (
    <div className="job-listing-url-container">
      <div className="screen-content">
        <h1 className="page-title">{APP_NAME}</h1>
        <div className="app-subtitle-container">
          <p className="app-subtitle"><i>Become an expert and crush your next interview</i></p>
          <p className="app-subtitle-info" onClick={() => setIsHowItWorksPopupOpen(true)}>How this works</p>
        </div>
        
        <div className="step-1-container">
          <h1 className="step-heading">Step 1 - Enter Job Listing Information</h1>
          <InfoButton 
              tooltip="Learn more" 
              onClick={() => setIsEnteringInfoPopupOpen(true)}
          />
        </div>

        {/* Segmented control for toggling between Manual Entry and URL */}
        <div className="segmented-control-container">
          <SegmentedControl
            tabs={entryModeTabs}
            onChange={handleEntryModeChange}
          />
        </div>

        {/* Manual Entry Mode */}
        {entryMode === ListingEntryMode.MANUAL && (
          <div className="entry-container">
            <div className="entry-input-group">
              <label className="entry-label">
                Job Title <span className="entry-label-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Software Engineer"
                className="entry-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="entry-input-group">
              <label className="entry-label">
                Company Name <span className="entry-label-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                className="entry-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="entry-input-group">
              <label className="entry-label">
                Job Description <span className="entry-label-asterisk">*</span>
              </label>
              <textarea
                placeholder="Enter the job description..."
                className="entry-textarea"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
              />
            </div>
            <div className="entry-input-group">
              <label className="entry-label">
                Expectations & Responsibilities <span className="entry-label-required">{"(optional)"}</span>
              </label>
              <textarea
                placeholder="e.g. Lead development of new features, collaborate with cross-functional teams, mentor junior developers..."
                className="entry-textarea"
                value={expectationsAndResponsibilities}
                onChange={(e) => setExpectationsAndResponsibilities(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
              />
            </div>
            <div className="entry-input-group">
              <label className="entry-label">
                Requirements <span className="entry-label-required">{"(optional)"}</span>
              </label>
              <textarea
                placeholder="e.g. 5+ years of experience, Bachelor's degree in Computer Science, proficiency in React and TypeScript..."
                className="entry-textarea"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
              />
            </div>
            <div className="entry-input-group">
              <label className="entry-label">
                Location <span className="entry-label-required">{"(optional)"}</span>
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA or Remote"
                className="entry-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="entry-input-group">
              <label className="entry-label">
                Work Schedule <span className="entry-label-required">{"(optional)"}</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Full-time, 9am-5pm EST or Flexible hours"
                className="entry-input"
                value={workSchedule}
                onChange={(e) => setWorkSchedule(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="entry-button-container">
              <Button 
                htmlType="button"
                type={ButtonType.PRIMARY}
                onClick={handleManualEntry} 
                disabled={!canProceed || isLoading}
                className="start-analysis-button"
                tooltip={canProceed ? undefined : "Fill in all required fields and attach files or skip attaching"}
              >
                Start Analysis
              </Button>
            </div>
          </div>
        )}

        {/* URL Mode */}
        {entryMode === ListingEntryMode.URL && (
          <div className="entry-container">
            <div className="entry-input-group">
              <label className="entry-label">
                Job Listing URL <span className="entry-label-asterisk">*</span>
              </label>
              <div className="entry-input-row">
                <input
                  type="text"
                  placeholder="enter the url of your job listing"
                  className="entry-input"
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
            </div>
          </div>
        )}
        
        {/* Display error message if something went wrong */}
        {error && <CustomErrorComponent customError={error} />}

        {/* Show loading bar while we're scraping the website */}
        {isScraping && <div className="loading-bar-container">
          <LoadingBar 
            timeToLoad={12} 
            initialLoadingMessage="Fetching url content..."
            waitingMessages={[
              "Fetching job listing content...",
              "Analyzing page structure and requirements...",
              "Retrieving job details from the URL...",
              "Reading through the fine print so you don't have to...",
              "Solving captchas...",
              "Hacking into the mainframe...",
            ]} 
          />
        </div>}

        {/* Show loading bar for extracting job listing content */}
        {isParsingAttributes && 
          <div className="loading-bar-container">
            <p className="loading-progress-text">Finished fetching website content</p>
            <LoadingBar 
            timeToLoad={6} 
            initialLoadingMessage="Extracting job listing details from url content..."
            waitingMessages={[
                "Extracting job title and location...",
                "Parsing job description and work schedule...",
                "Identifying company name and key details...",
                "Extracting expectations and responsibilities...",
                "Parsing requirements from the job listing...",
                "Cleaning off the dust...",
                "Seeing what twitter has to say about this...",
              ]} 
            />
          </div>
        }

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
          onClose={() => setIsHowItWorksPopupOpen(false)}
          className="how-this-works-popup"
        />
      )}

      {/* "Entering Job Listing Information" popup */}
      {isEnteringInfoPopupOpen && (
        <ScreenPopup
          markdownText={MANUAL_ENTRY_INFO_POPUP_CONTENT}
          onClose={() => setIsEnteringInfoPopupOpen(false)}
          className="how-this-works-popup"
        />
      )}
    </div>
  );
}
