import { z } from "zod";

/**
 * Type definition for job listing research response data.
 * Matches the structure of the Python JobListingResearchResponse Pydantic model.
 */
export const JobListingResearchResponseSchema = z.object({
  job_title: z.string(),
  job_location: z.string(),
  job_description: z.string(),
  work_schedule: z.string(),
  company_name: z.string(),
  expectations_and_responsibilities: z.string(),
  requirements: z.string(),
});

export type JobListingResearchResponse = z.infer<typeof JobListingResearchResponseSchema>;
