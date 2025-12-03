import { z } from "zod";

export const ManualJobInputGuardrailResponseSchema = z.object({
    reason: z.string(),
    safety_flags: z.object({
        contains_any_malicious_content: z.boolean(),
        contains_significantly_off_topic_content: z.boolean(),
    }),
});

export type ManualJobInputGuardrailResponse = z.infer<typeof ManualJobInputGuardrailResponseSchema>;