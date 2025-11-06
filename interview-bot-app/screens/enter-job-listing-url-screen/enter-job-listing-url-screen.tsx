"use client";

import { useState } from "react";
import "./enter-job-listing-url-screen.css";
import Button from "@/components/button";
import { scrapeJobListingAction } from "@/app/actions";

/**
 * Screen component for entering a job listing URL.
 * Displays a single input textbox for users to enter the URL of their job listing.
 * When the user clicks the button or presses Enter, it scrapes the URL and displays
 * the results in a textbox below the button.
 */
export default function EnterJobListingUrlScreen() {
  // State for the URL input value
  const [url, setUrl] = useState("");
  // State for the scraped content
  const [scrapedContent, setScrapedContent] = useState("");
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles the scraping of the job listing URL.
   * Called when the user clicks the button or presses Enter.
   * Uses a server action to keep the API key secure on the server.
   */
  const handleScrape = async () => {
    // Reset error and set loading state
    setError(null);
    setIsLoading(true);

    try {
      // Call the server action to scrape the URL
      const result = await scrapeJobListingAction(url.trim());
      
      // Check if the action was successful
      if (result.success && result.data) {
        // Convert the parsed job listing attributes to a formatted JSON string for display
        setScrapedContent(JSON.stringify(result.data, null, 2));
      } else {
        // Handle error from server action
        throw new Error(result.error || "Failed to scrape job listing");
      }
    } catch (err) {
      // Handle exceptions and display error message
      const errorMessage = err instanceof Error ? err.message : "Failed to scrape job listing";
      setError(errorMessage);
      setScrapedContent("");
    } finally {
      // Always reset loading state when done
      setIsLoading(false);
    }
  };

  /**
   * Handles the Enter key press in the input field.
   * Triggers scraping when Enter is pressed.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleScrape();
    }
  };

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
          disabled={isLoading}
        />
        <Button type="button" onClick={handleScrape} disabled={isLoading}>
          {isLoading ? "scraping..." : "scrape"}
        </Button>
        {/* Display error message if scraping failed */}
        {error && <div className="error-message">{error}</div>}
        {/* Display results textbox if content was scraped */}
        {scrapedContent && (
          <textarea
            className="scraped-content-textbox"
            value={scrapedContent}
            readOnly
            rows={20}
          />
        )}
      </div>
    </div>
  );
}

