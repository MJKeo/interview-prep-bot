import { z } from "zod";

export const InterviewMessagePairSchema = z.object({
    id: z.int(),
    interviewer_question: z.string(),
    candidate_answer: z.string()
});

export const InterviewTranscriptSchema = z.array(InterviewMessagePairSchema);

export type InterviewMessagePair = z.infer<typeof InterviewMessagePairSchema>;
export type InterviewTranscript = z.infer<typeof InterviewTranscriptSchema>;
