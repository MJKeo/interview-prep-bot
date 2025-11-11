import { z } from "zod";
import { PerformanceFeedbackSchema } from "./performance-feedback"

export const AggregatedEvaluationResponseSchema = z.object({
    what_went_well_summary: z.string(),
    what_went_well_feedback: PerformanceFeedbackSchema,
    improvements_summary: z.string(),
    improvements_feedback: PerformanceFeedbackSchema
});

export type AggregatedEvaluationResponse = z.infer<typeof AggregatedEvaluationResponseSchema>;