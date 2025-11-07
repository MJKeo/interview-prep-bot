import { JobListingResearchResponseSchema, type JobListingResearchResponse, type DeepResearchReports } from "@/types";
import { JOB_LISTING_PARSING_PROMPT_V1 } from "@/prompts";
import {
  openai,
  companyStrategyAgent,
  roleSuccessAgent,
  teamCultureAgent,
  domainKnowledgeAgent,
} from "@/app/openai";
import {
  companyStrategyQuery,
  roleSuccessQuery,
  teamCultureQuery,
  domainKnowledgeQuery,
} from "@/prompts";
import { run } from "@openai/agents";
import { zodTextFormat } from "openai/helpers/zod";

/**
 * Generates a structured response from OpenAI's chat completions API
 * based on the scraped job listing content.
 * 
 * This function calls OpenAI's API with the provided job listing scrape content,
 * using a system prompt to extract structured information matching the
 * JobListingResearchResponse schema.
 * 
 * @param jobListingScrapeContent - The scraped content from the job listing website (typically markdown format)
 * @returns A promise that resolves to a JobListingResearchResponse object
 * @throws Error if the OPENAI_API_KEY environment variable is not set
 * @throws Error if the API call fails or returns invalid data
 */
export async function parseJobListingAttributes(
  jobListingScrapeContent: string
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
        input: jobListingScrapeContent,
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

/**
 * Creates a JSON input string for research agents in the format specified by the prompts.
 * 
 * @param jobTitle - The title of the role being interviewed for
 * @param jobLocation - The location of the job (city, state, zip code, or "remote")
 * @param companyName - The name of the company that is hiring
 * @param webSearchQuery - The web search query string to execute
 * @returns A JSON string matching the agent input format specification
 */
function createAgentInput(
  researchResponse: JobListingResearchResponse,
  webSearchQuery: string,
): string {
  return JSON.stringify({
    job_title: researchResponse.job_title,
    job_location: researchResponse.job_location,
    company: researchResponse.company_name,
    web_search_query: webSearchQuery,
  });
}

/**
 * Executes all deep-research agents concurrently and collates their outputs.
 *
 * @param jobListingResearchResponse - Parsed job listing metadata that seeds each agent query.
 * @returns Aggregated agent run payloads keyed by research focus area.
 * @throws Error if any agent execution fails.
 */
export async function performDeepResearch(
  jobListingResearchResponse: JobListingResearchResponse
): Promise<DeepResearchReports> {
  // Extract identifiers required to construct each agent's JSON input.
  const { 
    company_name: companyName, 
    job_title: jobTitle,
    job_location: jobLocation 
  } = jobListingResearchResponse;

  // Launch all agent runs immediately so they can execute in parallel.
  // Each agent receives a JSON string matching the format specified in the prompts.
  const researchTasks = [
    run(companyStrategyAgent, createAgentInput(jobListingResearchResponse, companyStrategyQuery(companyName))),
    run(roleSuccessAgent, createAgentInput(jobListingResearchResponse, roleSuccessQuery(companyName, jobTitle))),
    run(teamCultureAgent, createAgentInput(jobListingResearchResponse, teamCultureQuery(companyName, jobTitle))),
    run(domainKnowledgeAgent, createAgentInput(jobListingResearchResponse, domainKnowledgeQuery(companyName, jobTitle))),
  ] as const;

  try {
    // Execute all research tasks concurrently and wait for all to complete
    // Promise.all will reject immediately if any task fails
    const[
      companyStrategy,
      roleSuccess,
      teamCulture,
      domainKnowledge,
    ] = await Promise.all(researchTasks);

    // companyStrategy.finalOutput
    
    return {
      companyStrategyReport: companyStrategy.finalOutput ?? "Unknown",
      roleSuccessReport: roleSuccess.finalOutput ?? "Unknown",
      teamCultureReport: teamCulture.finalOutput ?? "Unknown",
      domainKnowledgeReport: domainKnowledge.finalOutput ?? "Unknown",
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to perform deep research: ${error.message}`);
    }
    throw new Error(`Failed to perform deep research: ${String(error)}`);
  }
}

