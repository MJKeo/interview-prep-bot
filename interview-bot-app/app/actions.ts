'use server';

import { scrapeJobListing } from '@/utils/scrape_job_listing';

/**
 * Server action to scrape a job listing URL.
 * 
 * This function runs on the server, keeping the API key secure.
 * It wraps the scrapeJobListing utility function and returns
 * a result object with either success and content or an error.
 * 
 * @param url - The web URL of the job listing to scrape
 * @returns An object with either { success: true, content: string } or { success: false, error: string }
 */
export async function scrapeJobListingAction(url: string) {
  try {
    // Call the scrape function - this runs on the server where process.env is available
    const content = await scrapeJobListing(url);
    return { success: true, content };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to scrape job listing';
    return { success: false, error: message };
  }
}
