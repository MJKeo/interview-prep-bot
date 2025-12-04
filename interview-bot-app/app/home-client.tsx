"use client";

import { useState, useEffect } from "react";
import EnterJobListingUrlScreen from "@/screens/enter-job-listing-url-screen";
import ResearchJobScreen from "@/screens/research-job-screen";
import MockInterviewScreen from "@/screens/mock-interview-screen";
import PerformAnalysisScreen from "@/screens/perform-analysis-screen";
import { 
  ScreenName, 
  type JobListingResearchResponse, 
  type DeepResearchReports, 
  type FileItem, 
  type InterviewTranscript,
  type JobListingWithId,
  type AggregatedEvaluation,
} from "@/types";
import Sidebar from "@/components/sidebar";
import { saveJobListing, fetchAllJobListings, deleteJobListing } from "@/utils/local-database";
import { 
  createJobListingWithIdFromScrapedListing,
  jobListingsWithUpdatedListing, 
  jobListingsWithRemovedListing,
  addInterviewToJobListingFromTranscript,
} from "@/utils/utils";

/**
 * Main page component that manages screen navigation using state.
 * Handles transitions between the job listing URL entry screen and the research screen.
 */
export default function HomeClient() {
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
  // State to store aggregated evaluation for navigating to interviews that have already fully finished
  const [aggregatedEvaluation, setAggregatedEvaluation] = useState<AggregatedEvaluation | null>(null);
  // State to store the attached files when transitioning to research screen
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  // State to store job listings for the sidebar
  const [jobListings, setJobListings] = useState<JobListingWithId[]>([]);
  // State to track the current job listing being explored
  const [currentJobListing, setCurrentJobListing] = useState<JobListingWithId | null>(null);
  // State to track if the current job listing being explored
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);

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
    // Set the current job listing reference
    setCurrentJobListing(jobListingWithId);
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

    // Update the job listing with the new interview and trigger a save to the database
    if (currentJobListing) {
      const newInterviewId = addInterviewToJobListingFromTranscript(transcript, currentJobListing);
      handleCurrentListingUpdated();
      setCurrentInterviewId(newInterviewId);
    } else {
      console.error("No current job listing found while navigating to perform analysis screen");
    }
  };

  /**
   * Callback function to handle navigation back to the mock interview screen with a fresh conversation.
   * Called when the user confirms the "new mock interview" warning.
   * Resets the conversation messages but keeps the job listing research response and interview guide.
   */
  const handleNewMockInterview = (jobListing: JobListingWithId) => {
    // Reset variables and stuff
    updateStateVariablesForSelectedJobListing(jobListing);

    // Navigate back to mock interview screen (jobListingResearchResponse and interviewGuide are still set)
    setScreen(ScreenName.MockInterview);
  };

  /**
   * Callback function to handle navigation back to the enter job listing URL screen.
   * Called when the user confirms the "new job listing" warning or clicks "New Listing" button.
   * Resets all stored attributes to start completely fresh (except jobListings).
   */
  const handleNewJobListing = () => {
    // Reset all stored state to start fresh (except jobListings)
    setScreen(ScreenName.EnterJobListingUrl);
    setJobListingParsedData(null);
    setDeepResearchReports(null);
    setInterviewGuide(null);
    setTranscript(null);
    setAttachedFiles([]);
    setCurrentJobListing(null);
    setCurrentInterviewId(null);
    setAggregatedEvaluation(null);
  };

  /**
   * Callback function to handle selection of a job listing from the sidebar.
   * Called when the user clicks on a job listing or interview in the sidebar.
   * Updates the current job listing reference and navigates to the appropriate screen.
   * 
   * @param selection - The sidebar selection containing job listing ID and optionally interview ID
   */
  const handleSelectJobListing = (selectedListing: JobListingWithId) => {
    // Reset variables and stuff
    updateStateVariablesForSelectedJobListing(selectedListing);

    setScreen(ScreenName.ResearchJob);
  };

  const updateStateVariablesForSelectedJobListing = (jobListing: JobListingWithId) => {
    // Set the current job listing reference
    setCurrentJobListing(jobListing);
    setCurrentInterviewId(null);

    setJobListingParsedData(jobListing.data["listing-scrape-results"]);
    setDeepResearchReports(jobListing.data["deep-research-report"]);
    setInterviewGuide(jobListing.data["interview-guide"]);

    setTranscript(null);
    setAggregatedEvaluation(null);
  }

  const handleSelectInterview = (jobListing: JobListingWithId, interviewId: string) => {
    if (interviewId === currentInterviewId) {
      return;
    }

    setCurrentJobListing(jobListing);
    setCurrentInterviewId(interviewId);

    // Update state variables based on selected job listing's data
    setJobListingParsedData(jobListing.data["listing-scrape-results"]);
    setDeepResearchReports(jobListing.data["deep-research-report"]);
    setInterviewGuide(jobListing.data["interview-guide"]);

    // Update the transcript with the selected interview's data
    setTranscript(jobListing.data["interviews"]?.[interviewId]?.transcript ?? null);
    setAggregatedEvaluation(jobListing.data["interviews"]?.[interviewId]?.evaluation ?? null);

    setScreen(ScreenName.PerformAnalysis);
  };

  /**
   * Callback function to handle updates to the current job listing.
   * Called when the current job listing data is modified (e.g., deep research reports or interview guide are added).
   * Updates the current job listing state and saves it to the database.
   */
  const handleCurrentListingUpdated = () => {
    if (!currentJobListing) {
      console.error("No current job listing found while handling current listing updated");
      return;
    }

    // Save the updated listing to IndexedDB
    saveJobListing(currentJobListing)
      .then(() => {
        // Update the job listings array to reflect the changes
        setJobListings((currentListings) =>
          jobListingsWithUpdatedListing(currentListings, currentJobListing)
        );
      })
      .catch((error) => {
        // Error is already logged by saveJobListing, but we catch to prevent unhandled promise rejection
        console.error("Error saving updated job listing:", error);
      });
  };

  const handleDidUpdateJobListing = (jobListing: JobListingWithId) => {
    // Save the updated listing to IndexedDB
    saveJobListing(jobListing)
      .then(() => {
        setJobListings((currentListings) =>
          jobListingsWithUpdatedListing(currentListings, jobListing)
        );
    
        if (currentJobListing?.id === jobListing.id) {
          setCurrentJobListing(jobListing);
        }
      })
      .catch((error) => {
        // Error is already logged by saveJobListing, but we catch to prevent unhandled promise rejection
        console.error("Error saving updated job listing:", error);
      });
  }

  /**
   * Callback function to handle deletion of a job listing.
   * Called when the user clicks the delete button in the sidebar menu.
   * Updates the local state to remove the deleted job listing from the UI.
   * The actual deletion from IndexedDB is handled in the sidebar component.
   * 
   * @param deletedJobListing - The job listing that was deleted
   */
  const handleDeleteJobListing = (deletedJobListing: JobListingWithId) => {
    // Delete from IndexedDB
    deleteJobListing(deletedJobListing)
    .then(() => {
      // Update local state to remove the deleted job listing
      setJobListings((currentListings) =>
        jobListingsWithRemovedListing(currentListings, deletedJobListing)
      );
      // If the deleted job listing is the current one, reset the current job listing reference
      if (currentJobListing?.id === deletedJobListing.id) {
        handleNewJobListing();
      }
    })
    .catch((error) => {
      // Log error but don't crash the component
      console.error("Failed to delete job listing:", error);
    });
  };

  const handleDeleteInterview = (jobListing: JobListingWithId, interviewId: string) => {
    // Create a copy of the job listing with the interview removed
    const updatedJobListing: JobListingWithId = {
      ...jobListing,
      data: {
        ...jobListing.data,
        interviews: (() => {
          // If no interviews exist, return null
          if (!jobListing.data.interviews) {
            return null;
          }
          // Create a new object without the deleted interview key
          const { [interviewId]: deletedInterview, ...remainingInterviews } = jobListing.data.interviews;
          // Return null if no interviews remain, otherwise return the remaining interviews
          return Object.keys(remainingInterviews).length > 0 ? remainingInterviews : null;
        })(),
      },
    };

    // Save the updated job listing to the database
    saveJobListing(updatedJobListing)
      .then(() => {
        // Update the job listings array to reflect the changes
        setJobListings((currentListings) =>
          jobListingsWithUpdatedListing(currentListings, updatedJobListing)
        );
        
        if (currentJobListing?.id === updatedJobListing.id) {
          setCurrentJobListing(updatedJobListing);
        }

        if (currentInterviewId === interviewId) {
          setCurrentInterviewId(null);
          setTranscript(null);
          setAggregatedEvaluation(null);
          setScreen(ScreenName.ResearchJob);
        }        
      })
      .catch((error) => {
        // Log error but don't crash the component
        console.error("Failed to delete interview:", error);
      });
  }

  /**
   * Renders the appropriate screen component based on the current screen state.
   * Uses a switch statement to handle different screen types.
   */
  const renderScreen = () => {
    switch (screen) {
      case ScreenName.EnterJobListingUrl:
        return <EnterJobListingUrlScreen onScrapeSuccess={handleNavigateToResearch} />;
      case ScreenName.ResearchJob:
        return (jobListingParsedData) ? (
          <ResearchJobScreen 
            key={currentJobListing!.id}
            jobListingParsedData={jobListingParsedData}
            attachedFiles={attachedFiles}
            currentJobListing={currentJobListing!}
            onCurrentListingUpdated={handleCurrentListingUpdated}
            onStartMockInterview={handleNavigateToMockInterview}
          />
        ) : null;
      case ScreenName.MockInterview:
        return jobListingParsedData && interviewGuide ? (
          <MockInterviewScreen 
            jobListingResearchResponse={jobListingParsedData}
            interviewGuide={interviewGuide}
            currentJobListing={currentJobListing!}
            onCurrentListingUpdated={handleCurrentListingUpdated}
            onPerformFinalReview={handleNavigateToPerformAnalysis}
            onReturnToResearch={() => setScreen(ScreenName.ResearchJob)}
          />
        ) : null;
      case ScreenName.PerformAnalysis:
        return jobListingParsedData && deepResearchReports && interviewGuide && transcript ? (
          <PerformAnalysisScreen 
            key={currentJobListing!.id}
            transcript={transcript}
            jobListingResearchResponse={jobListingParsedData}
            deepResearchReports={deepResearchReports}
            interviewGuide={interviewGuide}
            currentJobListing={currentJobListing!}
            currentInterviewId={currentInterviewId!}
            savedAggregatedEvaluation={aggregatedEvaluation}
            onNewMockInterview={() => handleNewMockInterview(currentJobListing!)}
            onCurrentListingUpdated={handleCurrentListingUpdated}
          />
        ) : null;
      default:
        return null;
    }
  };

  // Render sidebar and main content side by side
  return (
    <div className="app-container">
      <Sidebar
        jobListings={jobListings}
        currentJobListing={currentJobListing}
        onDidUpdateJobListing={handleDidUpdateJobListing}
        currentInterviewId={currentInterviewId}
        onDeleteJobListing={handleDeleteJobListing}
        onDeleteInterview={handleDeleteInterview}
        onNewJobListing={handleNewJobListing}
        onNewInterview={handleNewMockInterview}
        onSelectJobListing={handleSelectJobListing}
        onSelectInterview={handleSelectInterview}
      />
      <main className="app-main-content">
        {renderScreen()}
      </main>
    </div>
  );
}
