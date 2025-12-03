import type { JobListingResearchResponse, ManualJobInputGuardrailResponse } from "@/types";
import { run, withTrace } from "@openai/agents";
import { manualJobInputGuardrailAgent } from "@/app/openai";
import { TRANSIENT_ERROR_MESSAGE } from "./constants";

export async function performManualJobInputGuardrailCheck(
    jobListingData: JobListingResearchResponse,
  ): Promise<ManualJobInputGuardrailResponse> {
    return await withTrace("ManualJobInputGuardrailCheck", async () => {
        try {
            const input = JSON.stringify(jobListingData);
            const result = await run(manualJobInputGuardrailAgent, input);
            return result.finalOutput;
        } catch (error) {
            throw new Error(TRANSIENT_ERROR_MESSAGE);
        }
    });
}