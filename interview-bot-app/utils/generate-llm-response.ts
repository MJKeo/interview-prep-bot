import { JobListingResearchResponseSchema, type JobListingResearchResponse } from "@/types/job-listing-research-response";
import { JOB_LISTING_PARSING_PROMPT_V1 } from "@/prompts/job-parsing-prompts";
import { openai } from "@/app/openai";
import { zodTextFormat } from "openai/helpers/zod";

/**
 * Generates a structured response from OpenAI's chat completions API
 * based on the scraped job listing content.
 * 
 * This function calls OpenAI's API with the provided job listing scrape content,
 * using a system prompt to extract structured information matching the
 * JobListingResearchResponse schema.
 * 
 * @param jobListingSiteScrape - The scraped content from the job listing website (typically markdown format)
 * @returns A promise that resolves to a JobListingResearchResponse object
 * @throws Error if the OPENAI_API_KEY environment variable is not set
 * @throws Error if the API call fails or returns invalid data
 */
export async function parseJobListingAttributes(
  jobListingSiteScrape: string
): Promise<JobListingResearchResponse> {
  // Get API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  try {
    // Call OpenAI's chat completions API
    const response = await openai.responses.parse({
        model: "gpt-4.1-mini",
        instructions: JOB_LISTING_PARSING_PROMPT_V1,
        input: jobListingSiteScrape,
        text: { format: zodTextFormat(JobListingResearchResponseSchema, "job_listing_research_response") },
      });

    // Parse the response
    const result = response.output_parsed;
    if (!result) {
        throw new Error("OpenAI Response gave an empty result");
    }
    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to generate LLM response: ${error.message}`);
    }
    throw new Error(`Failed to generate LLM response: ${String(error)}`);
  }
}

