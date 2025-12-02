import Firecrawl from '@mendable/firecrawl-js';
import { TRANSIENT_ERROR_MESSAGE, NON_TRANSIENT_ERROR_MESSAGE } from './constants';

/**
 * Scrapes a job listing URL and returns the content as markdown.
 * 
 * This function uses Firecrawl to scrape the provided URL and extract
 * the content in markdown format, similar to the Python implementation.
 * 
 * @param url - The web URL of the job listing to scrape
 * @returns A promise that resolves to the scraped content as markdown string
 * @throws Error if the FIRECRAWL_API_KEY environment variable is not set
 * @throws Error if the scrape operation fails
 */
export async function scrapeJobListing(url: string): Promise<string> {
  const noContentErrorMessage = 'Unable to read the provided URL. Please verify the URL is correct and try again, or enter information manually.';
  try {
    // Get API key from environment variable
    const apiKey = process.env.FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      throw new Error(NON_TRANSIENT_ERROR_MESSAGE);
    }

    // Initialize Firecrawl client with API key
    const firecrawl = new Firecrawl({ apiKey });

    // Scrape the URL and request markdown format
    const scrapeResponse = await firecrawl.scrape(url, {
      formats: ['markdown'],
    });

    console.log(scrapeResponse);

    // Extract and return the markdown content
    // The response should have a markdown property based on the Python example
    if (!scrapeResponse.markdown) {
      throw new Error(noContentErrorMessage);
    }

    return scrapeResponse.markdown;
  } catch (error) {
    // If this is the specific error we threw for missing markdown content, re-throw it as-is
    if (error instanceof Error 
          && (error.message === noContentErrorMessage || error.message === NON_TRANSIENT_ERROR_MESSAGE)) {
      throw error;
    }
    
    // Check if the error object has a status of 403 (Forbidden/Unsupported)
    // This indicates the website is not supported by Firecrawl
    if (typeof error === 'object' 
          && error !== null 
          && 'status' in error 
          && (error as { status: number }).status === 403) {
      throw new Error("This specific job board is not supported. Please try the 'Manual Entry' tab or use the company's direct career page URL.");
    }

    throw new Error(TRANSIENT_ERROR_MESSAGE);
  }
}

