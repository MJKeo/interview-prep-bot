"use client";

import { useState } from "react";
import EnterJobListingUrlScreen from "@/screens/enter-job-listing-url-screen";
import ResearchJobScreen from "@/screens/research-job-screen";
import { ScreenName } from "@/types";

/**
 * Main page component that manages screen navigation using state.
 * Handles transitions between the job listing URL entry screen and the research screen.
 */
export default function Home() {
  // State to track the current screen being displayed
  const [screen, setScreen] = useState<ScreenName>(ScreenName.EnterJobListingUrl);
  // State to store the scraped job listing content when transitioning to research screen
  const [jobListingScrapeContent, setJobListingScrapeContent] = useState<string | null>(null);

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
   * Renders the appropriate screen component based on the current screen state.
   * Uses a switch statement to handle different screen types.
   */
  const renderScreen = () => {
    switch (screen) {
      case ScreenName.EnterJobListingUrl:
        return <EnterJobListingUrlScreen onScrapeSuccess={handleNavigateToResearch} />;
      case ScreenName.ResearchJob:
        return jobListingScrapeContent ? (
          <ResearchJobScreen jobListingScrapeContent={jobListingScrapeContent} />
        ) : null;
      default:
        return null;
    }
  };

  return <>{renderScreen()}</>;
}
