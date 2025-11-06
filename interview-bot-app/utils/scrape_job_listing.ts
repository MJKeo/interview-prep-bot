import Firecrawl from '@mendable/firecrawl-js';

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
  // Get API key from environment variable
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set');
  }

  // Initialize Firecrawl client with API key
  const firecrawl = new Firecrawl({ apiKey });

  try {
    // Scrape the URL and request markdown format
    const scrapeResponse = await firecrawl.scrape(url, {
      formats: ['markdown'],
    });

    // Extract and return the markdown content
    // The response should have a markdown property based on the Python example
    if (!scrapeResponse.markdown) {
      throw new Error('Scrape response does not contain markdown content');
    }

    return scrapeResponse.markdown;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to scrape job listing: ${error.message}`);
    }
    throw new Error(`Failed to scrape job listing: ${String(error)}`);
  }
}

