'use server';

import { scrapeJobListing } from '@/utils/scrape-job-listing';
import { parseJobListingAttributes } from "@/utils/generate-llm-response";
import type { JobListingResearchResponse } from "@/types/job-listing-research-response";

/**
 * Server action to scrape a job listing URL and parse its attributes.
 * 
 * This function runs on the server, keeping the API key secure.
 * It scrapes the job listing URL, then parses the content to extract
 * structured attributes using an LLM. Returns a result object with
 * either success and parsed attributes or an error.
 * 
 * @param url - The web URL of the job listing to scrape
 * @returns An object with either { success: true, data: JobListingResearchResponse } or { success: false, error: string }
 */
export async function scrapeJobListingAction(url: string) {
  try {
    // Call the scrape function - this runs on the server where process.env is available
    const content = await scrapeJobListing(url);
    // Parse the scraped content to extract structured job listing attributes
    const parsedAttributes = await parseJobListingAttributes(content);
    return { success: true, data: parsedAttributes };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to scrape job listing';
    return { success: false, error: message };
  }
}
