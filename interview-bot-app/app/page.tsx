"use client";

import { useState, useEffect } from "react";
import EnterJobListingUrlScreen from "@/screens/enter-job-listing-url-screen";
import ResearchJobScreen from "@/screens/research-job-screen";
import MockInterviewScreen from "@/screens/mock-interview-screen";
import PerformAnalysisScreen from "@/screens/perform-analysis-screen";
import MobileNotSupportedScreen from "@/screens/mobile-not-supported-screen";
import { 
  ScreenName, 
  type JobListingResearchResponse, 
  type DeepResearchReports, 
  type FileItem, 
  type InterviewTranscript,
  type JobListingWithId,
  type SidebarSelection
} from "@/types";
import { isUserOnMobile } from "@/app/actions";
import Sidebar from "@/components/sidebar";
import { saveJobListing, fetchAllJobListings } from "@/utils/local-database";
import { 
  createJobListingWithIdFromScrapedListing, 
  jobListingsWithUpdatedListing, 
  jobListingsWithRemovedListing 
} from "@/utils/utils";

/**
 * Main page component that manages screen navigation using state.
 * Handles transitions between the job listing URL entry screen and the research screen.
 */
export default function Home() {
  // State to track the current screen being displayed
  const [screen, setScreen] = useState<ScreenName>(ScreenName.EnterJobListingUrl);
  // State to store the job listing research response when transitioning to mock interview screen
  const [jobListingParsedData, setJobListingParsedData] = useState<JobListingResearchResponse | null>(null);
  // State to store the deep research reports when transitioning to mock interview screen
  const [deepResearchReports, setDeepResearchReports] = useState<DeepResearchReports | null>(null);
  // State to store the interview guide when transitioning to mock interview screen
  const [interviewGuide, setInterviewGuide] = useState<string | null>(null);
  // State to store the conversation messages when transitioning to perform analysis screen
  const [transcript, setTranscript] = useState<InterviewTranscript | null>(null);
  // State to track if the user is on a mobile device
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  // State to store the attached files when transitioning to research screen
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  // State to store job listings for the sidebar
  const [jobListings, setJobListings] = useState<JobListingWithId[]>([]);

  /**
   * Effect hook that checks if the user is on a mobile device on component mount.
   * Calls the server action to determine device type and updates state accordingly.
   */
  useEffect(() => {
    // Call the server action to check if user is on mobile
    isUserOnMobile().then((mobile) => {
      setIsMobile(mobile);
    });
  }, []);

  /**
   * Effect hook that fetches all job listings from the database on component mount.
   * Loads saved job listings to display in the sidebar.
   */
  useEffect(() => {
    // Fetch all job listings from IndexedDB
    fetchAllJobListings()
      .then((fetchedJobListings) => {
        setJobListings(fetchedJobListings);
      })
      .catch((error) => {
        // Log error but don't crash the component
        console.error("Failed to fetch job listings:", error);
      });
  }, []);

  /**
   * Callback function to handle navigation to the research screen.
   * Called when job listing scraping is successful.
   * 
   * @param jobListingParsedData - The parsed job listing research response data
   * @param attachedFiles - List of successfully attached files (with SUCCESS or SAVED status)
   */
  const handleNavigateToResearch = (jobListingParsedData: JobListingResearchResponse, attachedFiles: FileItem[]) => {
    // Store the new listing and navigate to research screen
    setJobListingParsedData(jobListingParsedData);
    setAttachedFiles(attachedFiles);
    setScreen(ScreenName.ResearchJob);
    
    const jobListingWithId = createJobListingWithIdFromScrapedListing(jobListingParsedData);
    saveJobListing(jobListingWithId).then(() => {
      setJobListings(jobListingsWithUpdatedListing(jobListings, jobListingWithId));
    }).catch((error) => {
      // Error is already logged by saveJobListing, but we catch to prevent unhandled promise rejection
      console.error("Error saving scraped job listing:", error);
    });
  };

  /**
   * Callback function to handle navigation to the mock interview screen.
   * Called when the "start mock interview" button is pressed.
   * 
   * @param jobListingResearchResponse - Parsed job listing metadata to pass to the interview screen
   * @param deepResearchReports - Deep research reports to pass to the interview screen
   * @param interviewGuide - The interview guide to pass to the interview screen
   */
  const handleNavigateToMockInterview = (
    deepResearchReports: DeepResearchReports,
    interviewGuide: string
  ) => {
    // Store the deep research reports and interview guide
    setDeepResearchReports(deepResearchReports);
    setInterviewGuide(interviewGuide);
    // Navigate to mock interview screen
    setScreen(ScreenName.MockInterview);
  };

  /**
   * Callback function to handle navigation to the perform analysis screen.
   * Called when the user confirms the final review warning.
   * 
   * @param transcript - The formatted conversation history to pass to the analysis screen (as InterviewTranscript)
   */
  const handleNavigateToPerformAnalysis = (transcript: InterviewTranscript) => {
    // Store the conversation messages and navigate to perform analysis screen
    setTranscript(transcript);
    setScreen(ScreenName.PerformAnalysis);
  };

  /**
   * Callback function to handle navigation back to the mock interview screen with a fresh conversation.
   * Called when the user confirms the "new mock interview" warning.
   * Resets the conversation messages but keeps the job listing research response and interview guide.
   */
  const handleNewMockInterview = () => {
    // Reset conversation messages to start fresh
    setTranscript(null);
    // Navigate back to mock interview screen (jobListingResearchResponse and interviewGuide are still set)
    setScreen(ScreenName.MockInterview);
  };

  /**
   * Callback function to handle navigation back to the enter job listing URL screen.
   * Called when the user confirms the "new job listing" warning or clicks "New Listing" button.
   * Resets all stored attributes to start completely fresh (except isMobile and jobListings).
   */
  const handleNewJobListing = () => {
    // Reset all stored state to start fresh (except isMobile and jobListings)
    setScreen(ScreenName.EnterJobListingUrl);
    setJobListingParsedData(null);
    setDeepResearchReports(null);
    setInterviewGuide(null);
    setTranscript(null);
    setAttachedFiles([]);
  };

  /**
   * Callback function to handle deletion of a job listing.
   * Called when the user clicks the delete button in the sidebar menu.
   * Updates the local state to remove the deleted job listing from the UI.
   * The actual deletion from IndexedDB is handled in the sidebar component.
   * 
   * @param deletedJobListing - The job listing that was deleted
   */
  const handleDeleteJobListing = (deletedJobListing: JobListingWithId) => {
    // Update local state to remove the deleted job listing
    setJobListings((currentListings) =>
      jobListingsWithRemovedListing(currentListings, deletedJobListing)
    );
  };

  /**
   * Renders the appropriate screen component based on the current screen state.
   * If the user is on a mobile device, displays the mobile not supported screen.
   * Otherwise, uses a switch statement to handle different screen types.
   */
  const renderScreen = () => {
    // If user is on mobile, always show the mobile not supported screen
    if (isMobile === true) {
      return <MobileNotSupportedScreen />;
    }

    // Otherwise, render the normal screens based on current screen state
    switch (screen) {
      case ScreenName.EnterJobListingUrl:
        return <EnterJobListingUrlScreen onScrapeSuccess={handleNavigateToResearch} />;
      case ScreenName.ResearchJob:
        return (jobListingParsedData) ? (
          <ResearchJobScreen 
            jobListingParsedData={jobListingParsedData}
            attachedFiles={attachedFiles}
            onStartMockInterview={handleNavigateToMockInterview}
          />
        ) : null;
      case ScreenName.MockInterview:
        return jobListingParsedData && interviewGuide ? (
          <MockInterviewScreen 
            jobListingResearchResponse={jobListingParsedData}
            interviewGuide={interviewGuide}
            onPerformFinalReview={handleNavigateToPerformAnalysis} 
          />
        ) : null;
      case ScreenName.PerformAnalysis:
        return jobListingParsedData && deepResearchReports && interviewGuide && transcript ? (
          <PerformAnalysisScreen 
            transcript={transcript}
            jobListingResearchResponse={jobListingParsedData}
            deepResearchReports={deepResearchReports}
            interviewGuide={interviewGuide}
            onNewMockInterview={handleNewMockInterview}
            onNewJobListing={handleNewJobListing}
          />
        ) : null;
      default:
        return null;
    }
  };

  // If on mobile, render only the screen (no sidebar)
  if (isMobile === true) {
    return <>{renderScreen()}</>;
  }

  // On desktop, render sidebar and main content side by side
  return (
    <div className="app-container">
      <Sidebar
        jobListings={jobListings}
        onDeleteJobListing={handleDeleteJobListing}
        onNewJobListing={handleNewJobListing}
      />
      <main className="app-main-content">
        {renderScreen()}
      </main>
    </div>
  );
}
