"use client";

import { useState, useEffect } from "react";
import EnterJobListingUrlScreen from "@/screens/enter-job-listing-url-screen";
import ResearchJobScreen from "@/screens/research-job-screen";
import MockInterviewScreen from "@/screens/mock-interview-screen";
import PerformAnalysisScreen from "@/screens/perform-analysis-screen";
import MobileNotSupportedScreen from "@/screens/mobile-not-supported-screen";
import { ScreenName, type JobListingResearchResponse, type DeepResearchReports, type FileItem } from "@/types";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { isUserOnMobile } from "@/app/actions";

/**
 * Main page component that manages screen navigation using state.
 * Handles transitions between the job listing URL entry screen and the research screen.
 */
export default function Home() {
  // State to track the current screen being displayed
  const [screen, setScreen] = useState<ScreenName>(ScreenName.EnterJobListingUrl);
  // State to store the scraped job listing content when transitioning to research screen
  const [jobListingScrapeContent, setJobListingScrapeContent] = useState<string | null>(null);
  // State to store the job listing research response when transitioning to mock interview screen
  const [jobListingResearchResponse, setJobListingResearchResponse] = useState<JobListingResearchResponse | null>(null);
  // State to store the deep research reports when transitioning to mock interview screen
  const [deepResearchReports, setDeepResearchReports] = useState<DeepResearchReports | null>(null);
  // State to store the interview guide when transitioning to mock interview screen
  const [interviewGuide, setInterviewGuide] = useState<string | null>(null);
  // State to store the conversation messages when transitioning to perform analysis screen
  const [conversationMessages, setConversationMessages] = useState<EasyInputMessage[] | null>(null);
  // State to track if the user is on a mobile device
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  // State to store the attached files when transitioning to research screen
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
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
   * Callback function to handle navigation to the research screen.
   * Called when job listing scraping is successful.
   * 
   * @param content - The scraped content from the job listing
   * @param attachedFiles - List of successfully attached files (with SUCCESS or SAVED status)
   */
  const handleNavigateToResearch = (content: string, attachedFiles: FileItem[]) => {
    // Store the scraped content and navigate to research screen
    setJobListingScrapeContent(content);
    setAttachedFiles(attachedFiles);
    setScreen(ScreenName.ResearchJob);
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
    jobListingResearchResponse: JobListingResearchResponse,
    deepResearchReports: DeepResearchReports,
    interviewGuide: string
  ) => {
    // Store the job listing research response, deep research reports, and interview guide
    setJobListingResearchResponse(jobListingResearchResponse);
    setDeepResearchReports(deepResearchReports);
    setInterviewGuide(interviewGuide);
    // Navigate to mock interview screen
    setScreen(ScreenName.MockInterview);
  };

  /**
   * Callback function to handle navigation to the perform analysis screen.
   * Called when the user confirms the final review warning.
   * 
   * @param messages - The conversation history to pass to the analysis screen (in EasyInputMessage format)
   */
  const handleNavigateToPerformAnalysis = (messages: EasyInputMessage[]) => {
    // Store the conversation messages and navigate to perform analysis screen
    setConversationMessages(messages);
    setScreen(ScreenName.PerformAnalysis);
  };

  /**
   * Callback function to handle navigation back to the mock interview screen with a fresh conversation.
   * Called when the user confirms the "new mock interview" warning.
   * Resets the conversation messages but keeps the job listing research response and interview guide.
   */
  const handleNewMockInterview = () => {
    // Reset conversation messages to start fresh
    setConversationMessages(null);
    // Navigate back to mock interview screen (jobListingResearchResponse and interviewGuide are still set)
    setScreen(ScreenName.MockInterview);
  };

  /**
   * Callback function to handle navigation back to the enter job listing URL screen.
   * Called when the user confirms the "new job listing" warning.
   * Resets all stored attributes to start completely fresh.
   */
  const handleNewJobListing = () => {
    // Reset all stored state to start fresh
    setJobListingScrapeContent(null);
    setJobListingResearchResponse(null);
    setDeepResearchReports(null);
    setInterviewGuide(null);
    setConversationMessages(null);
    // Navigate back to the starting screen
    setScreen(ScreenName.EnterJobListingUrl);
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
        return jobListingScrapeContent ? (
          <ResearchJobScreen 
            jobListingScrapeContent={jobListingScrapeContent}
            attachedFiles={attachedFiles}
            onStartMockInterview={handleNavigateToMockInterview}
          />
        ) : null;
      case ScreenName.MockInterview:
        return jobListingResearchResponse && interviewGuide ? (
          <MockInterviewScreen 
            jobListingResearchResponse={jobListingResearchResponse}
            interviewGuide={interviewGuide}
            candidateInfo={deepResearchReports?.userContextReport}
            onPerformFinalReview={handleNavigateToPerformAnalysis} 
          />
        ) : null;
      case ScreenName.PerformAnalysis:
        return jobListingResearchResponse && deepResearchReports && interviewGuide ? (
          <PerformAnalysisScreen 
            messages={conversationMessages || []}
            jobListingResearchResponse={jobListingResearchResponse}
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

  return <>{renderScreen()}</>;
}
