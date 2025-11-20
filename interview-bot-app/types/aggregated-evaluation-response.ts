import { z } from "zod";
import { PerformanceFeedback } from "./performance-feedback";

export const ConsolidatedFeedbackResponseSchema = z.object({
    reasons_why_this_is_good: z.array(z.string()),
    reasons_why_this_is_bad: z.array(z.string()),
    ways_to_improve_response: z.array(z.string()),
});

export const AggregatedSummaryResponseSchema = z.object({
    what_went_well_summary: z.string(),
    ways_to_improve_summary: z.string(),
});

export type ConsolidatedFeedbackResponse = z.infer<typeof ConsolidatedFeedbackResponseSchema>;
export type AggregatedSummaryResponse = z.infer<typeof AggregatedSummaryResponseSchema>;

export type ConsolidatedFeedbackInput = {
    message_id: number,
    interviewer_question: string,
    candidate_answer: string,
    feedback: PerformanceFeedback,
}

export type ConsolidatedFeedback = {
    message_id: number,
    consolidated_feedback: ConsolidatedFeedbackResponse,
}

export type AggregatedEvaluation = {
    what_went_well_summary: string,
    ways_to_improve_summary: string,
    consolidated_feedback_by_message: ConsolidatedFeedback[],
}