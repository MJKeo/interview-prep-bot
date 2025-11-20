import type { InterviewTranscript } from "./interview-transcript";
import type { AggregatedEvaluation } from "./aggregated-evaluation-response";
import type { JobListingResearchResponse } from "./job-listing-research-response";
import type { DeepResearchReports } from "./deep-research-reports";

/**
 * Type definition for a single interview within a job listing.
 * The key is the internal-interview-id, and the value contains interview data.
 */
export type JobListingInterview = {
  [internalInterviewId: string]: {
    "display-name": string;
    transcript: InterviewTranscript;
    evaluation: AggregatedEvaluation;
  };
};

/**
 * Type definition for all data contained within a single job listing.
 * Matches the structure defined in the local database structure.
 */
export type JobListingData = {
  "display-name": string;
  "listing-scrape-results": JobListingResearchResponse;
  "deep-research-report": DeepResearchReports | null;
  "interview-guide": string | null;
  interviews: JobListingInterview | null;
};

/**
 * Type definition for tracking which sidebar item is currently selected.
 * Contains the job listing ID and optionally an interview ID if an interview is selected.
 */
export type SidebarSelection = {
  jobListingId: string;
  interviewId?: string;
};

/**
 * Helper type for a job listing with its internal ID.
 * Used when storing arrays of job listings in the sidebar.
 */
export type JobListingWithId = {
  id: string;
  data: JobListingData;
};

