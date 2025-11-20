import OpenAI from "openai";
import { Agent, webSearchTool } from "@openai/agents";
import { 
  COMPANY_STRATEGY_SYSTEM_PROMPT_V2, 
  ROLE_SUCCESS_SYSTEM_PROMPT_V2, 
  TEAM_CULTURE_SYSTEM_PROMPT_V2, 
  DOMAIN_KNOWLEDGE_SYSTEM_PROMPT_V2,
  aggregatedEvaluationsSummaryPrompt
} from "@/prompts";
import {
  PerformanceEvaluationResponseSchema,
  ConsolidatedFeedbackResponseSchema,
  AggregatedSummaryResponseSchema,
  JobListingResearchResponse,
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

