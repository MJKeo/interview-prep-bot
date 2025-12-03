import OpenAI from "openai";
import { Agent, webSearchTool } from "@openai/agents";
import { 
  COMPANY_STRATEGY_SYSTEM_PROMPT_V2, 
  ROLE_SUCCESS_SYSTEM_PROMPT_V2, 
  TEAM_CULTURE_SYSTEM_PROMPT_V2, 
  DOMAIN_KNOWLEDGE_SYSTEM_PROMPT_V2,
  aggregatedEvaluationsSummaryPrompt,
  MANUAL_JOB_INPUT_GUARDRAIL_PROMPT,
  UPLOADED_FILE_GUARDRAIL_PROMPT,
  WEBSITE_CONTENT_GUARDRAIL_PROMPT
} from "@/prompts";
import {
  PerformanceEvaluationResponseSchema,
  ConsolidatedFeedbackResponseSchema,
  AggregatedSummaryResponseSchema,
  JobListingResearchResponse,
  ManualJobInputGuardrailResponseSchema,
  GenericMaliciousContentGuardrailResponseSchema,
} from "@/types";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ============================== DEEP RESEARCH AGENTS ==============================

export const companyStrategyAgent = new Agent({
  name: "Company strategy agent",
  instructions: COMPANY_STRATEGY_SYSTEM_PROMPT_V2,
  tools: [webSearchTool()],
  model: "gpt-4o-mini",
  modelSettings: {
    toolChoice: 'required'
  }
});

export const roleSuccessAgent = new Agent({
  name: "Role success agent",
  instructions: ROLE_SUCCESS_SYSTEM_PROMPT_V2,
  tools: [webSearchTool()],
  model: "gpt-4o-mini",
  modelSettings: {
    toolChoice: 'required'
  }
});

export const teamCultureAgent = new Agent({
  name: "Team culture agent",
  instructions: TEAM_CULTURE_SYSTEM_PROMPT_V2,
  tools: [webSearchTool()],
  model: "gpt-4o-mini",
  modelSettings: {
    toolChoice: 'required'
  }
});

export const domainKnowledgeAgent = new Agent({
  name: "Domain knowledge agent",
  instructions: DOMAIN_KNOWLEDGE_SYSTEM_PROMPT_V2,
  tools: [webSearchTool()],
  model: "gpt-4o-mini",
  modelSettings: {
    toolChoice: 'required'
  }
});

// ============================== EVALUATION AGENTS ==============================

export function createEvaluationAgent(systemPrompt: string, name: string) {
  return new Agent({
    name: name,
    instructions: systemPrompt,
    model: "gpt-4o-mini",
    outputType: PerformanceEvaluationResponseSchema,
  });
}

export function createEvaluationAggregatorAgent(systemPrompt: string, name: string) {
  return new Agent({
    name: name,
    instructions: systemPrompt,
    model: "gpt-4.1-nano",
    outputType: ConsolidatedFeedbackResponseSchema,
  });
}

export function createEvaluationSummaryAgent(jobListingData: JobListingResearchResponse) {
  return new Agent({
    name: "Evaluation summary agent",
    instructions: aggregatedEvaluationsSummaryPrompt(jobListingData),
    model: "gpt-4.1-nano",
    outputType: AggregatedSummaryResponseSchema,
  });
}

// ============================== GUARDRAIL AGENTS ==============================

export const manualJobInputGuardrailAgent = new Agent({
  name: "Manual job input guardrail agent",
  instructions: MANUAL_JOB_INPUT_GUARDRAIL_PROMPT,
  model: "gpt-4o-mini",
  modelSettings: {
    temperature: 0.5,
  },
  outputType: ManualJobInputGuardrailResponseSchema,
});

export const uploadedFileGuardrailAgent = new Agent({
  name: "Uploaded file guardrail agent",
  instructions: UPLOADED_FILE_GUARDRAIL_PROMPT,
  model: "gpt-4o-mini",
  modelSettings: {
    temperature: 0.5,
  },
  outputType: GenericMaliciousContentGuardrailResponseSchema,
});

export const websiteContentGuardrailAgent = new Agent({
  name: "Website content guardrail agent",
  instructions: WEBSITE_CONTENT_GUARDRAIL_PROMPT,
  model: "gpt-4o-mini",
  modelSettings: {
    temperature: 0.5,
  },
  outputType: GenericMaliciousContentGuardrailResponseSchema,
});