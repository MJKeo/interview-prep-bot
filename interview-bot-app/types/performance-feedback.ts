import { z } from "zod";

enum PerformanceFeedbackType {
  GOOD = "good",
  BAD = "bad",
}

export const PerformanceFeedbackSchema = z.array(
    z.object({
        transcript_message_id: z.int(),
        type: z.enum(PerformanceFeedbackType),
        title: z.string(),
        evaluation_explanation: z.string(),
        context_best_practices: z.string(),
        improved_example: z.string(),
    })
);

export const PerformanceEvaluationResponseSchema = z.object({
    feedback: PerformanceFeedbackSchema,
    summary: z.string(),
});

export type PerformanceFeedback = z.infer<typeof PerformanceFeedbackSchema>;
export type PerformanceEvaluationResponse = z.infer<typeof PerformanceEvaluationResponseSchema>;