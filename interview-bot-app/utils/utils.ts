import type { EasyInputMessage } from "openai/resources/responses/responses";
import type { 
  InterviewTranscript, 
  EvaluationReports, 
  ConsolidatedFeedbackInput, 
  PerformanceFeedback,
  JobListingResearchResponse,
  JobListingWithId
} from "@/types";

/**
 * Validates if a string is a syntactically valid URL.
 * Checks that the URL has proper syntax (protocol, domain, etc.)
 * but does not verify if the URL actually exists or is reachable.
 * 
 * @param urlString - The string to validate as a URL
 * @returns true if the string is a valid URL syntax, false otherwise
 */
export function isValidURL(urlString: string): boolean {
  // Check if the string is empty or only whitespace
  if (!urlString) {
    return false;
  } else if (!/^https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(urlString)) {
    return false;
  }

  try {
    // Use the URL constructor to validate the URL syntax
    // This will throw an error if the URL is malformed
    const url = new URL(urlString);
    
    // Ensure the URL has a valid protocol (http or https)
    // This prevents things like "javascript:" or other non-web protocols
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    // If URL constructor throws an error, the URL is invalid
    return false;
  }
}

/**
 * Converts a list of EasyInputMessage objects into an array of message pairs.
 * Assumes messages alternate: even indices are interviewer questions, odd indices are candidate answers.
 * If the array length is odd, the final message is ignored.
 * 
 * @param messages - Array of messages from the conversation
 * @returns Array of InterviewMessagePair objects with id, interviewer_question, and candidate_answer
 */
export function convertMessagesToTranscript(messages: EasyInputMessage[]): InterviewTranscript {
  const pairs: InterviewTranscript = [];

  // Iterate through messages in pairs (interviewer question, candidate answer)
  // Stop before the last message if array length is odd
  const maxIndex = messages.length % 2 === 0 ? messages.length : messages.length - 1;

  for (let i = 0; i < maxIndex; i += 2) {
    // Even index is interviewer question, odd index is candidate answer
    // Convert content to string (content can be string or ResponseInputMessageContentList)
    const interviewerQuestion = String(messages[i].content);
    const candidateAnswer = String(messages[i + 1].content);
    
    // Calculate pair id as floor(index / 2)
    const pairId = Math.floor(i / 2);

    pairs.push({
      id: pairId,
      interviewer_question: interviewerQuestion,
      candidate_answer: candidateAnswer,
    });
  }

  return pairs;
}


/**
 * Converts evaluation reports into feedback organized by message ID.
 * Groups all feedback items by their transcript message ID and pairs them with
 * the corresponding question and answer from the transcript.
 * 
 * @param evaluations - The evaluation reports containing feedback from all judge agents
 * @param transcript - The interview transcript containing question-answer pairs
 * @returns Array of ConsolidatedFeedbackInput objects, one per unique message ID with feedback
 */
export function convertEvaluationsToFeedbackByMessage(evaluations: EvaluationReports, transcript: InterviewTranscript): ConsolidatedFeedbackInput[] {
  // Collect all feedback items from all evaluation judges
  const allFeedback: PerformanceFeedback = [];
  
  // Extract feedback from each judge evaluation
  if (evaluations.contentJudgeEvaluation?.feedback) {
    allFeedback.push(...evaluations.contentJudgeEvaluation.feedback);
  }
  if (evaluations.structureJudgeEvaluation?.feedback) {
    allFeedback.push(...evaluations.structureJudgeEvaluation.feedback);
  }
  if (evaluations.fitJudgeEvaluation?.feedback) {
    allFeedback.push(...evaluations.fitJudgeEvaluation.feedback);
  }
  if (evaluations.communicationJudgeEvaluation?.feedback) {
    allFeedback.push(...evaluations.communicationJudgeEvaluation.feedback);
  }
  if (evaluations.riskJudgeEvaluation?.feedback) {
    allFeedback.push(...evaluations.riskJudgeEvaluation.feedback);
  }
  if (evaluations.candidateContextJudgeEvaluation?.feedback) {
    allFeedback.push(...evaluations.candidateContextJudgeEvaluation.feedback);
  }

  // Get all unique message IDs that have feedback
  const uniqueMessageIds = new Set<number>();
  allFeedback.forEach(feedback => {
    uniqueMessageIds.add(feedback.transcript_message_id);
  });

  // Create a map of transcript entries by ID for quick lookup
  const transcriptMap = new Map<number, { interviewer_question: string; candidate_answer: string }>();
  transcript.forEach(pair => {
    transcriptMap.set(pair.id, {
      interviewer_question: pair.interviewer_question,
      candidate_answer: pair.candidate_answer,
    });
  });

  // Build the result array: one entry per unique message ID
  const result: ConsolidatedFeedbackInput[] = [];
  
  uniqueMessageIds.forEach(messageId => {
    // Find the transcript entry for this message ID
    const transcriptEntry = transcriptMap.get(messageId);
    
    // If transcript entry exists, create the consolidated feedback input
    if (transcriptEntry) {
      // Collect all feedback items for this message ID
      const feedbackForMessage: PerformanceFeedback = allFeedback.filter(
        feedback => feedback.transcript_message_id === messageId
      );
      
      result.push({
        message_id: messageId,
        interviewer_question: transcriptEntry.interviewer_question,
        candidate_answer: transcriptEntry.candidate_answer,
        feedback: feedbackForMessage,
      });
    }
  });

  return result;
}

export function createJobListingWithIdFromScrapedListing(jobListing: JobListingResearchResponse): JobListingWithId {
  // Extract job title and company name from the scraped data
  const jobTitle = jobListing.job_title;
  const companyName = jobListing.company_name;

  // Create display name in format "job_role: company_name"
  const displayName = `${jobTitle}: ${companyName}`;

  // Create unique ID by appending current timestamp to display name
  const timestamp = Date.now();
  const id = `${displayName}_${timestamp}`;

  // Return JobListingData with only display-name and listing-scrape-results set
  return {
      id,
      data: {
          "display-name": displayName,
          "listing-scrape-results": jobListing,
          "deep-research-report": null,
          "interview-guide": null,
          interviews: null,
      },
  };
}

/**
 * Updates a job listings array with a new or updated job listing.
 * If a job listing with the same ID already exists, it replaces it at the same index.
 * Otherwise, adds the new job listing to the end of the array.
 * 
 * @param currentJobListings - The current array of job listings
 * @param updatedJobListing - The job listing that has been created or updated
 * @returns A new array with the updated job listing inserted or replaced
 */
export function jobListingsWithUpdatedListing(
  currentJobListings: JobListingWithId[],
  updatedJobListing: JobListingWithId
): JobListingWithId[] {
  // Find the index of an existing job listing with the same ID
  const existingIndex = currentJobListings.findIndex(
    (listing) => listing.id === updatedJobListing.id
  );

  // Create a new array to avoid mutating the input
  const updatedList = [...currentJobListings];

  if (existingIndex !== -1) {
    // Replace the existing job listing at the same index
    updatedList[existingIndex] = updatedJobListing;
  } else {
    // Add the new job listing to the end of the array
    updatedList.push(updatedJobListing);
  }

  return updatedList;
}

export function jobListingsWithRemovedListing(
  currentJobListings: JobListingWithId[],
  removedJobListing: JobListingWithId
): JobListingWithId[] {
  // Find the index of an existing job listing with the same ID
  const existingIndex = currentJobListings.findIndex(
    (listing) => listing.id === removedJobListing.id
  );

  // Create a new array to avoid mutating the input
  const updatedList = [...currentJobListings];

  if (existingIndex !== -1) {
    // Replace the existing job listing at the same index
    updatedList.splice(existingIndex, 1);
  }

  return updatedList;
}