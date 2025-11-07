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
    return { success: true, content: content };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to scrape job listing';
    return { success: false, error: message };
  }
}

/**
 * Server action to parse job listing attributes from scraped content.
 * 
 * This function runs on the server, keeping the API key secure.
 * It parses the scraped job listing content to extract structured
 * attributes using an LLM. Returns a result object with either
 * success and parsed attributes or an error.
 * 
 * @param jobListingScrapeContent - The scraped content from the job listing website
 * @returns An object with either { success: true, data: JobListingResearchResponse } or { success: false, error: string }
 */
export async function parseJobListingAttributesAction(jobListingScrapeContent: string) {
  try {
    // Call the parse function - this runs on the server where process.env is available
    const data = await parseJobListingAttributes(jobListingScrapeContent);
    return { success: true, data: data };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to parse job listing attributes';
    return { success: false, error: message };
  }
}
