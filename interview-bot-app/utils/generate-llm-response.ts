import { JobListingResearchResponseSchema, type JobListingResearchResponse, type DeepResearchReports, MockInterviewMessageResponseSchema, type MockInterviewMessageResponse } from "@/types";
import { JOB_LISTING_PARSING_PROMPT_V1, DISTILLATION_SYSTEM_PROMPT_V1, mockInterviewSystemPrompt } from "@/prompts";
import {
  openai,
  companyStrategyAgent,
  roleSuccessAgent,
  teamCultureAgent,
  domainKnowledgeAgent,
} from "@/app/openai";
import {
  companyStrategyQuery,
  companyStrategyInputPrompt,
  roleSuccessQuery,
  roleSuccessInputPrompt,
  teamCultureQuery,
  teamCultureInputPrompt,
  domainKnowledgeQuery,
  domainKnowledgeInputPrompt,
} from "@/prompts";
import { run } from "@openai/agents";
import { zodTextFormat } from "openai/helpers/zod";
import type { EasyInputMessage } from "openai/resources/responses/responses";

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
  try {
    // Call OpenAI's chat completions API
    const response = await openai.responses.parse({
        model: "gpt-4.1-nano",
        instructions: JOB_LISTING_PARSING_PROMPT_V1,
        temperature: 0.3,
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
    run(companyStrategyAgent, companyStrategyInputPrompt(companyName)),
    run(roleSuccessAgent, roleSuccessInputPrompt(companyName, jobTitle)),
    run(teamCultureAgent, teamCultureInputPrompt(companyName, jobTitle)),
    run(domainKnowledgeAgent, domainKnowledgeInputPrompt(companyName, jobTitle)),
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

/**
 * Combines deep research reports into a formatted string with section headers.
 * 
 * Each report section is prefixed with a descriptive header to create a
 * consolidated deep research results document.
 * 
 * @param deepResearchReports - The aggregated research reports from all deep-research agents
 * @returns A formatted string combining all research sections with headers
 */
function combineDeepResearchReports(deepResearchReports: DeepResearchReports): string {
  return `Company Strategy Report:

${deepResearchReports.companyStrategyReport}

Role Success Report:

${deepResearchReports.roleSuccessReport}

Team Culture Report:

${deepResearchReports.teamCultureReport}

Domain Knowledge Report:

${deepResearchReports.domainKnowledgeReport}`;
}

/**
 * Generates a compact, job-specific Mock Interview Guide in Markdown format.
 * 
 * This function takes job listing data, deep research reports, and interview question
 * taxonomy to create a tailored interview guide. The guide equips an interview chatbot
 * with the right context and targeted prompts based on the provided research.
 * 
 * @param jobListingResearchResponse - Parsed job listing metadata including title, description, and company
 * @param deepResearchReports - Aggregated research reports from all deep-research agents
 * @param interviewQuestions - Taxonomy of question types (e.g., Job-Specific, Behavioral, Situational, Culture/Values)
 * @returns A promise that resolves to a Markdown interview guide string
 * @throws Error if the API call fails or returns invalid data
 */
export async function createInterviewGuide(
  jobListingResearchResponse: JobListingResearchResponse,
  deepResearchReports: DeepResearchReports,
  interviewQuestions: string
): Promise<string> {
  try {

    // Create the JSON input matching the distillation prompt's expected format
    const input = JSON.stringify({
      job_title: jobListingResearchResponse.job_title,
      job_description: jobListingResearchResponse.job_description,
      company_name: jobListingResearchResponse.company_name,
      expectations_and_responsibilities: jobListingResearchResponse.expectations_and_responsibilities,
      requirements: jobListingResearchResponse.requirements,
      deep_research_results: combineDeepResearchReports(deepResearchReports),
      interview_questions: interviewQuestions,
    });

    // Call OpenAI's responses API with the distillation system prompt
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      instructions: DISTILLATION_SYSTEM_PROMPT_V1,
      input: input,
    });

    // Extract the generated interview guide from the response
    const result = response.output_text;
    if (!result) {
      throw new Error("OpenAI Response gave an empty result");
    }

    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to create interview guide: ${error.message}`);
    }
    throw new Error(`Failed to create interview guide: ${String(error)}`);
  }
}

/**
 * Generates the next message in a mock interview conversation.
 * 
 * This function takes the conversation history and current message, then uses OpenAI's
 * responses.parse API to generate a structured response that includes both reasoning
 * and the actual message content, conforming to the MockInterviewMessageResponseSchema.
 * The system prompt is automatically generated from the job listing research response
 * and interview guide using the mockInterviewSystemPrompt function.
 * 
 * @param combinedHistory - Array of previous messages in the conversation (conversation history) PLUS the most recent message
 * @param jobListingResearchResponse - Parsed job listing metadata used to generate the interview system prompt
 * @param interviewGuide - The interview guide (markdown format) used to provide context for the interview bot
 * @returns A promise that resolves to a MockInterviewMessageResponse object containing reasoning and message
 * @throws Error if the API call fails or returns invalid data
 */
export async function generateNextInterviewMessage(
  combinedHistory: EasyInputMessage[],
  jobListingResearchResponse: JobListingResearchResponse,
  interviewGuide: string
): Promise<MockInterviewMessageResponse> {
  try {
    // Call OpenAI's responses.parse API to generate the next message
    const response = await openai.responses.parse({
      model: "gpt-4o-mini",
      instructions: mockInterviewSystemPrompt(jobListingResearchResponse, interviewGuide),
      input: combinedHistory,
      text: { 
        format: zodTextFormat(MockInterviewMessageResponseSchema, "mock_interview_message_response") 
      },
    });

    // Extract and validate the parsed response
    const result = response.output_parsed;
    if (!result) {
      throw new Error("OpenAI Response gave an empty result");
    }

    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to generate next interview message: ${error.message}`);
    }
    throw new Error(`Failed to generate next interview message: ${String(error)}`);
  }
}

