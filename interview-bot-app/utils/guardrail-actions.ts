import type { 
    GenericMaliciousContentGuardrailResponse, 
    JobListingResearchResponse, 
    ManualJobInputGuardrailResponse,
} from "@/types";
import { run, withTrace } from "@openai/agents";
import { interviewUserMessageGuardrailAgent, manualJobInputGuardrailAgent, uploadedFileGuardrailAgent, websiteContentGuardrailAgent } from "@/app/openai";
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

export async function performUploadedFileGuardrailCheck(
    fileTextData: string,
  ): Promise<GenericMaliciousContentGuardrailResponse> {
    return await withTrace("UploadedFileGuardrailCheck", async () => {
        try {
            const result = await run(uploadedFileGuardrailAgent, fileTextData);
            return result.finalOutput;
        } catch (error) {
            throw new Error(TRANSIENT_ERROR_MESSAGE);
        }
    });
}

export async function performWebsiteContentGuardrailCheck(
    websiteContent: string,
  ): Promise<GenericMaliciousContentGuardrailResponse> {
    return await withTrace("WebsiteContentGuardrailCheck", async () => {
        try {
            const result = await run(websiteContentGuardrailAgent, websiteContent);
            return result.finalOutput;
        } catch (error) {
            throw new Error(TRANSIENT_ERROR_MESSAGE);
        }
    });
}