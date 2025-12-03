import { z } from "zod";

export const ManualJobInputGuardrailResponseSchema = z.object({
    reason: z.string(),
    safety_flags: z.object({
        contains_any_malicious_content: z.boolean(),
        contains_significantly_off_topic_content: z.boolean(),
    }),
});

export const GenericMaliciousContentGuardrailResponseSchema = z.object({
    reason: z.string(),
    contains_any_malicious_content: z.boolean(),
});

export type ManualJobInputGuardrailResponse = z.infer<typeof ManualJobInputGuardrailResponseSchema>;
export type GenericMaliciousContentGuardrailResponse = z.infer<typeof GenericMaliciousContentGuardrailResponseSchema>;