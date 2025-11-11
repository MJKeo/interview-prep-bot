"use client";

import { useState } from "react";
import EnterJobListingUrlScreen from "@/screens/enter-job-listing-url-screen";
import ResearchJobScreen from "@/screens/research-job-screen";
import MockInterviewScreen from "@/screens/mock-interview-screen";
import PerformAnalysisScreen from "@/screens/perform-analysis-screen";
import { ScreenName, type JobListingResearchResponse } from "@/types";
import type { EasyInputMessage } from "openai/resources/responses/responses";

/**
 * Main page component that manages screen navigation using state.
 * Handles transitions between the job listing URL entry screen and the research screen.
 */
export default function Home() {
  // State to track the current screen being displayed
  const [screen, setScreen] = useState<ScreenName>(ScreenName.PerformAnalysis);
  // State to store the scraped job listing content when transitioning to research screen
  const [jobListingScrapeContent, setJobListingScrapeContent] = useState<string | null>(null);
  // State to store the job listing research response when transitioning to mock interview screen
  const [jobListingResearchResponse, setJobListingResearchResponse] = useState<JobListingResearchResponse | null>(null);
  // State to store the interview guide when transitioning to mock interview screen
  const [interviewGuide, setInterviewGuide] = useState<string | null>(null);
  // State to store the conversation messages when transitioning to perform analysis screen
  const [conversationMessages, setConversationMessages] = useState<EasyInputMessage[] | null>(null);

  /**
   * Callback function to handle navigation to the research screen.
   * Called when job listing scraping is successful.
   * 
   * @param content - The scraped content from the job listing
   */
  const handleNavigateToResearch = (content: string) => {
    // Store the scraped content and navigate to research screen
    setJobListingScrapeContent(content);
    setScreen(ScreenName.ResearchJob);
  };

  /**
   * Callback function to handle navigation to the mock interview screen.
   * Called when the "start mock interview" button is pressed.
   * 
   * @param jobListingResearchResponse - Parsed job listing metadata to pass to the interview screen
   * @param interviewGuide - The interview guide to pass to the interview screen
   */
  const handleNavigateToMockInterview = (
    jobListingResearchResponse: JobListingResearchResponse,
    interviewGuide: string
  ) => {
    // Store the job listing research response and interview guide
    setJobListingResearchResponse(jobListingResearchResponse);
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
   * Renders the appropriate screen component based on the current screen state.
   * Uses a switch statement to handle different screen types.
   */
  const renderScreen = () => {
    switch (screen) {
      case ScreenName.EnterJobListingUrl:
        return <EnterJobListingUrlScreen onScrapeSuccess={handleNavigateToResearch} />;
      case ScreenName.ResearchJob:
        return jobListingScrapeContent ? (
          <ResearchJobScreen 
            jobListingScrapeContent={jobListingScrapeContent}
            onStartMockInterview={handleNavigateToMockInterview}
          />
        ) : null;
      case ScreenName.MockInterview:
        return jobListingResearchResponse && interviewGuide ? (
          <MockInterviewScreen 
            jobListingResearchResponse={jobListingResearchResponse}
            interviewGuide={interviewGuide}
            onPerformFinalReview={handleNavigateToPerformAnalysis} 
          />
        ) : null;
      case ScreenName.PerformAnalysis:
        return <PerformAnalysisScreen messages={[]} />
        // return conversationMessages ? (
        //   <PerformAnalysisScreen messages={[]} />
        // ) : null;
      default:
        return null;
    }
  };

  return <>{renderScreen()}</>;
}
