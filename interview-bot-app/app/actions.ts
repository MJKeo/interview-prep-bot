'use server';

import { scrapeJobListing } from '@/utils/scrape-job-listing';
import { 
  parseJobListingAttributes, 
  performDeepResearchAndContextDistillation, 
  createInterviewGuide, 
  generateNextInterviewMessage, 
  performEvaluations, 
  performEvaluationAggregation, 
  performUserContextDistillation 
} from '@/utils/generate-llm-response';
import type { 
  JobListingResearchResponse, 
  DeepResearchReports, 
  EvaluationReports, 
  InterviewTranscript, 
  FileItem,
  AggregatedEvaluation,
} from '@/types';
import type { EasyInputMessage } from "openai/resources/responses/responses";
import CONFIG from "@/app/config";
import { 
  savedJobParseResponse, 
  savedDeepResearchReports, 
  savedInterviewGuide,
  savedEvaluationReports,
  savedAggregatedEvaluation,
} from "@/app/saved-responses";
import { readFile } from 'fs/promises';
import { join } from 'path';
import { headers } from 'next/headers';
import { UAParser } from "ua-parser-js";

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
    if (CONFIG.useCachedScrape) {
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, content: "Cached data" };
    }
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
    if (CONFIG.useCachedListingAttributes) {
      console.log("SCRAPE START")
      await new Promise(r => setTimeout(r, 1500));
      console.log("SCRAPE DONE")
      return { success: true, data: savedJobParseResponse };
    }
    // Call the parse function - this runs on the server where process.env is available
    const data = await parseJobListingAttributes(jobListingScrapeContent);
    return { success: true, data: data };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to parse job listing attributes';
    return { success: false, error: message };
  }
}

/**
 * Server action to perform deep research on a job listing and user context distillation.
 * 
 * This function runs on the server, keeping the API key secure.
 * It executes all deep-research agents concurrently and collates their outputs,
 * while also performing user context distillation from uploaded files in parallel.
 * Returns a result object with either success and both research reports and user context, or an error.
 * 
 * @param jobListingResearchResponse - Parsed job listing metadata that seeds each agent query
 * @param fileItems - Array of FileItem objects containing file metadata and text content for user context distillation
 * @returns An object with either { success: true, reports: DeepResearchReports, userContext: string | null } or { success: false, error: string }
 */
export async function performDeepResearchAndContextDistillationAction(
  jobListingResearchResponse: JobListingResearchResponse,
  fileItems: FileItem[] = []
) {
  try {
    // If using cached data, simply return cached reports and null userContext
    if (CONFIG.useCachedDeepResearch) {
      await new Promise(r => setTimeout(r, 16000));
      return { success: true, reports: savedDeepResearchReports };
    }
    
    const reports = await performDeepResearchAndContextDistillation(jobListingResearchResponse, fileItems);
    
    return { success: true, reports };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to perform deep research';
    return { success: false, error: message };
  }
}

/**
 * Server action to create an interview guide from job listing research and deep research reports.
 * 
 * This function runs on the server, keeping the API key secure.
 * It reads the interview questions taxonomy from the markdown file, then generates
 * a tailored interview guide using the job listing data and deep research reports.
 * Returns a result object with either success and the guide or an error.
 * 
 * @param jobListingResearchResponse - Parsed job listing metadata including title, description, and company
 * @param deepResearchReports - Aggregated research reports from all deep-research agents
 * @returns An object with either { success: true, guide: string } or { success: false, error: string }
 */
export async function createInterviewGuideAction(
  jobListingResearchResponse: JobListingResearchResponse,
  deepResearchReports: DeepResearchReports
) {
  try {
    if (CONFIG.useCachedInterviewGuide) {
      await new Promise(r => setTimeout(r, 16000));
      return { success: true, guide: savedInterviewGuide };
    }

    // Read the interview questions markdown file
    // The file is located in the utils directory relative to the app root
    const filePath = join(process.cwd(), 'utils', 'interview-questions-2.md');
    const interviewQuestions = await readFile(filePath, 'utf-8');
    
    // Call the createInterviewGuide function - this runs on the server where process.env is available
    const guide = await createInterviewGuide(
      jobListingResearchResponse,
      deepResearchReports,
      interviewQuestions
    );
    
    return { success: true, guide: guide };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to create interview guide';
    return { success: false, error: message };
  }
}

/**
 * Server action to generate the next message in a mock interview conversation.
 * 
 * This function runs on the server, keeping the API key secure.
 * It takes the conversation history and current message, then generates a structured
 * response using OpenAI's responses.parse API. Returns only the message content
 * (not the reasoning) from the response.
 * 
 * @param combinedHistory - Array of previous messages in the conversation (conversation history) PLUS the most recent message
 * @param jobListingResearchResponse - Parsed job listing metadata used to generate the interview system prompt
 * @param interviewGuide - The interview guide (markdown format) used to provide context for the interview bot
 * @returns An object with either { success: true, nextMessage: string } or { success: false, error: string }
 */
export async function generateNextInterviewMessageAction(
  combinedHistory: EasyInputMessage[], // includes most recent message
  jobListingResearchResponse: JobListingResearchResponse,
  interviewGuide: string
) {
  try {
    // Call the generateNextInterviewMessage function - this runs on the server where process.env is available
    const response = await generateNextInterviewMessage(
      combinedHistory,
      jobListingResearchResponse,
      interviewGuide
    );
    
    // Extract only the message content (not the reasoning) from the response
    return { success: true, nextMessage: response.message };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to generate next interview message';
    return { success: false, error: message };
  }
}

/**
 * Server action to perform evaluations on an interview transcript.
 * 
 * This function runs on the server, keeping the API key secure.
 * It executes all evaluation judge agents concurrently and collates their outputs.
 * Returns a result object with either success and evaluation reports or an error.
 * 
 * @param transcript - The interview transcript to evaluate (string format)
 * @param listing - Parsed job listing metadata used to generate evaluation system prompts
 * @param deep_research - Deep research results providing context for evaluation
 * @param interview_guideline - Interview guide providing additional context for evaluation
 * @returns An object with either { success: true, reports: EvaluationReports } or { success: false, error: string }
 */
export async function performEvaluationsAction(
  transcript: InterviewTranscript,
  listing: JobListingResearchResponse,
  deepResearchReports: DeepResearchReports,
  interview_guideline: string
) {
  try {
    if (CONFIG.useCachedEvaluations) {
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, evaluations: savedEvaluationReports as EvaluationReports };
    }
    // Call the performEvaluations function - this runs on the server where process.env is available
    const evaluations = await performEvaluations(
      transcript,
      listing,
      deepResearchReports,
      interview_guideline
    );
    
    return { success: true, evaluations: evaluations };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to perform evaluations';
    return { success: false, error: message };
  }
}

/**
 * Server action to aggregate multiple evaluation reports into a single performance evaluation.
 * 
 * This function runs on the server, keeping the API key secure.
 * It takes individual evaluation reports from different judge agents and synthesizes them
 * into a cohesive, candidate-facing performance evaluation report.
 * Returns a result object with either success and the aggregated evaluation or an error.
 * 
 * @param evaluations - The aggregated evaluation reports from all judge agents
 * @param jobListingData - Parsed job listing metadata used to generate the aggregation prompt
 * @returns An object with either { success: true, result: PerformanceEvaluationResponse } or { success: false, error: string }
 */
export async function performEvaluationAggregationAction(
  evaluations: EvaluationReports,
  transcript: InterviewTranscript,
  jobListingData: JobListingResearchResponse
) {
  try {
    if (CONFIG.useCachedAggregatedEvaluations) {
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, result: savedAggregatedEvaluation as AggregatedEvaluation };
    }

    // Call the performEvaluationAggregation function - this runs on the server where process.env is available
    const result = await performEvaluationAggregation(
      evaluations,
      transcript,
      jobListingData
    );
    
    return { success: true, result: result };
  } catch (error) {
    // Handle errors and return error message
    const message = error instanceof Error ? error.message : 'Failed to perform evaluation aggregation';
    return { success: false, error: message };
  }
}

/**
 * Server action that determines if the user is accessing the application from a mobile device.
 * 
 * This function runs on the server where headers() is available.
 * It retrieves the user-agent header from the request headers, parses it using UAParser,
 * and checks if the device type is "mobile".
 * 
 * @returns A boolean indicating whether the user is on a mobile device (true) or not (false)
 */
export async function isUserOnMobile(): Promise<boolean> {
  // Get the headers - this runs on the server where headers() is available
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") ?? "";
  const parser = UAParser(userAgent);
  return parser.device.type === "mobile";
}
