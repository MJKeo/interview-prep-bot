'use server';

import { scrapeJobListing } from '@/utils/scrape-job-listing';
import { parseJobListingAttributes, performDeepResearch, createInterviewGuide, generateNextInterviewMessage } from '@/utils/generate-llm-response';
import type { JobListingResearchResponse, DeepResearchReports } from '@/types';
import type { EasyInputMessage } from "openai/resources/responses/responses";
import CONFIG from "@/app/config";
import { savedJobParseResponse, savedDeepResearchReports, savedInterviewGuide } from "@/app/saved-responses";
import { readFile } from 'fs/promises';
import { join } from 'path';

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
      await new Promise(r => setTimeout(r, 1500));
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
 * Server action to perform deep research on a job listing.
 * 
 * This function runs on the server, keeping the API key secure.
 * It executes all deep-research agents concurrently and collates their outputs.
 * Returns a result object with either success and research reports or an error.
 * 
 * @param jobListingResearchResponse - Parsed job listing metadata that seeds each agent query
 * @returns An object with either { success: true, reports: DeepResearchReports } or { success: false, error: string }
 */
export async function performDeepResearchAction(jobListingResearchResponse: JobListingResearchResponse) {
  try {
    if (CONFIG.useCachedDeepResearch) {
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, reports: savedDeepResearchReports };
    }
    // Call the performDeepResearch function - this runs on the server where process.env is available
    const reports = await performDeepResearch(jobListingResearchResponse);
    return { success: true, reports: reports };
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
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, guide: savedInterviewGuide };
    }

    // Read the interview questions markdown file
    // The file is located in the utils directory relative to the app root
    const filePath = join(process.cwd(), 'utils', 'interview-questions.md');
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
