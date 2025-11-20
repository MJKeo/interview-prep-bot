import { 
  JobListingResearchResponseSchema, 
  type JobListingResearchResponse, 
  type DeepResearchReports, 
  MockInterviewMessageResponseSchema, 
  type MockInterviewMessageResponse, 
  type EvaluationReports,
  type FileItem,
  type AggregatedEvaluation,
  type InterviewTranscript,
  type ConsolidatedFeedback,
  type ConsolidatedFeedbackResponse
} from "@/types";
import {
  openai,
  companyStrategyAgent,
  roleSuccessAgent,
  teamCultureAgent,
  domainKnowledgeAgent,
  createEvaluationAgent,
  createEvaluationAggregatorAgent
} from "@/app/openai";
import {
  JOB_LISTING_PARSING_PROMPT_V1,
  INTERVIEW_GUIDE_SYSTEM_PROMPT_V3,
  mockInterviewSystemPromptV3,
  companyStrategyInputPrompt,
  roleSuccessInputPrompt,
  teamCultureInputPrompt,
  domainKnowledgeInputPrompt,
  contentJudgeSystemPrompt,
  structureJudgeSystemPrompt,
  fitJudgeSystemPrompt,
  communicationJudgeSystemPrompt,
  candidateContextJudgeSystemPrompt,
  riskJudgeSystemPrompt,
  aggregateEvaluationsByMessagePrompt,
  aggregatePositiveEvaluationsPromptV1,
  aggregateNegativeEvaluationsPromptV1,
  USER_CONTEXT_DISTILLATION_SYSTEM_PROMPT_V1,
} from "@/prompts";
import { run, withTrace } from "@openai/agents";
import { zodTextFormat } from "openai/helpers/zod";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { convertEvaluationsToFeedbackByMessage } from "./utils";

/**
 * Generates a structured response from OpenAI's chat completions API
 * based on the scraped job listing content.
 * 
 * This function calls OpenAI's API with the provided job listing scrape content,
 * using a system prompt to extract structured information matching the
 * JobListingResearchResponse schema.
 * 
 * @param jobListingScrapeContent - The scraped content from the job listing website (typically markdown format)
 * @returns A promise that resolves to a JobListingResearchResponse object
 * @throws Error if the OPENAI_API_KEY environment variable is not set
 * @throws Error if the API call fails or returns invalid data
 */
export async function parseJobListingAttributes(
  jobListingScrapeContent: string
): Promise<JobListingResearchResponse> {
  try {
    // Call OpenAI's chat completions API
    const response = await openai.responses.parse({
        model: "gpt-4.1-nano",
        instructions: JOB_LISTING_PARSING_PROMPT_V1,
        temperature: 0.3,
        input: jobListingScrapeContent,
        text: { format: zodTextFormat(JobListingResearchResponseSchema, "job_listing_research_response") },
      });

    // Parse the response
    const result = response.output_parsed;
    if (!result) {
        throw new Error("OpenAI Response gave an empty result");
    }
    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to generate LLM response: ${error.message}`);
    }
    throw new Error(`Failed to generate LLM response: ${String(error)}`);
  }
}

/**
 * Executes all deep-research agents concurrently and collates their outputs.
 *
 * @param jobListingResearchResponse - Parsed job listing metadata that seeds each agent query.
 * @returns Aggregated agent run payloads keyed by research focus area.
 * @throws Error if any agent execution fails.
 */
export async function performDeepResearchAndContextDistillation(
  jobListingResearchResponse: JobListingResearchResponse,
  fileItems: FileItem[] = []
): Promise<DeepResearchReports> {
  // Extract identifiers required to construct each agent's JSON input.
  const { 
    company_name: companyName, 
    job_title: jobTitle,
    job_location: jobLocation 
  } = jobListingResearchResponse;

  return await withTrace("DeepResearchWorkflow", async () => {
    // Launch all agent runs immediately so they can execute in parallel.
    // Each agent receives a JSON string matching the format specified in the prompts.
    var researchTasks: Promise<any>[] = [
      run(companyStrategyAgent, companyStrategyInputPrompt(companyName)),
      run(roleSuccessAgent, roleSuccessInputPrompt(companyName, jobTitle)),
      run(teamCultureAgent, teamCultureInputPrompt(companyName, jobTitle)),
      run(domainKnowledgeAgent, domainKnowledgeInputPrompt(companyName, jobTitle)),
    ];

    if (fileItems.length > 0) {
      researchTasks.push(performUserContextDistillation(fileItems));
    }

    try {
      // Execute all research tasks concurrently and wait for all to complete
      // Promise.all will reject immediately if any task fails
      const[
        companyStrategy,
        roleSuccess,
        teamCulture,
        domainKnowledge,
        userContext,
      ] = await Promise.all(researchTasks);
      
      return {
        companyStrategyReport: companyStrategy.finalOutput ?? "Unknown",
        roleSuccessReport: roleSuccess.finalOutput ?? "Unknown",
        teamCultureReport: teamCulture.finalOutput ?? "Unknown",
        domainKnowledgeReport: domainKnowledge.finalOutput ?? "Unknown",
        userContextReport: userContext,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to perform deep research: ${error.message}`);
      }
      throw new Error(`Failed to perform deep research: ${String(error)}`);
    }
  });
}

/**
 * Combines deep research reports into a formatted string with section headers.
 * 
 * Each report section is prefixed with a descriptive header to create a
 * consolidated deep research results document.
 * 
 * @param deepResearchReports - The aggregated research reports from all deep-research agents
 * @returns A formatted string combining all research sections with headers
 */
function combineDeepResearchReports(deepResearchReports: DeepResearchReports): string {
  return `Company Strategy Report:

${deepResearchReports.companyStrategyReport}

Role Success Report:

${deepResearchReports.roleSuccessReport}

Team Culture Report:

${deepResearchReports.teamCultureReport}

Domain Knowledge Report:

${deepResearchReports.domainKnowledgeReport}`;
}

/**
 * Generates a compact, job-specific Mock Interview Guide in Markdown format.
 * 
 * This function takes job listing data, deep research reports, and interview question
 * taxonomy to create a tailored interview guide. The guide equips an interview chatbot
 * with the right context and targeted prompts based on the provided research.
 * 
 * @param jobListingResearchResponse - Parsed job listing metadata including title, description, and company
 * @param deepResearchReports - Aggregated research reports from all deep-research agents
 * @param interviewQuestions - Taxonomy of question types (e.g., Job-Specific, Behavioral, Situational, Culture/Values)
 * @returns A promise that resolves to a Markdown interview guide string
 * @throws Error if the API call fails or returns invalid data
 */
export async function createInterviewGuide(
  jobListingResearchResponse: JobListingResearchResponse,
  deepResearchReports: DeepResearchReports,
  interviewQuestions: string
): Promise<string> {
  try {

    // Create the JSON input matching the distillation prompt's expected format
    const input = JSON.stringify({
      job_title: jobListingResearchResponse.job_title,
      job_description: jobListingResearchResponse.job_description,
      company_name: jobListingResearchResponse.company_name,
      expectations_and_responsibilities: jobListingResearchResponse.expectations_and_responsibilities,
      requirements: jobListingResearchResponse.requirements,
      deep_research_results: combineDeepResearchReports(deepResearchReports),
      interview_questions: interviewQuestions,
      candidate_info: deepResearchReports.userContextReport,
    });

    // Call OpenAI's responses API with the distillation system prompt
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      instructions: INTERVIEW_GUIDE_SYSTEM_PROMPT_V3,
      input: input,
    });

    // Extract the generated interview guide from the response
    const result = response.output_text;
    if (!result) {
      throw new Error("OpenAI Response gave an empty result");
    }

    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to create interview guide: ${error.message}`);
    }
    throw new Error(`Failed to create interview guide: ${String(error)}`);
  }
}

/**
 * Generates the next message in a mock interview conversation.
 * 
 * This function takes the conversation history and current message, then uses OpenAI's
 * responses.parse API to generate a structured response that includes both reasoning
 * and the actual message content, conforming to the MockInterviewMessageResponseSchema.
 * The system prompt is automatically generated from the job listing research response
 * and interview guide using the mockInterviewSystemPrompt function.
 * 
 * @param combinedHistory - Array of previous messages in the conversation (conversation history) PLUS the most recent message
 * @param jobListingResearchResponse - Parsed job listing metadata used to generate the interview system prompt
 * @param interviewGuide - The interview guide (markdown format) used to provide context for the interview bot
 * @returns A promise that resolves to a MockInterviewMessageResponse object containing reasoning and message
 * @throws Error if the API call fails or returns invalid data
 */
export async function generateNextInterviewMessage(
  combinedHistory: EasyInputMessage[],
  jobListingResearchResponse: JobListingResearchResponse,
  interviewGuide: string
): Promise<MockInterviewMessageResponse> {
  try {
    // Call OpenAI's responses.parse API to generate the next message
    const response = await openai.responses.parse({
      model: "gpt-4o-mini",
      instructions: mockInterviewSystemPromptV3(jobListingResearchResponse, interviewGuide),
      input: combinedHistory,
      text: { 
        format: zodTextFormat(MockInterviewMessageResponseSchema, "mock_interview_message_response") 
      },
    });

    // Extract and validate the parsed response
    const result = response.output_parsed;
    if (!result) {
      throw new Error("OpenAI Response gave an empty result");
    }

    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to generate next interview message: ${error.message}`);
    }
    throw new Error(`Failed to generate next interview message: ${String(error)}`);
  }
}

/**
 * Executes all evaluation judge agents concurrently and collates their outputs.
 *
 * This function creates evaluation agents for each judge type (content, structure, fit,
 * communication, and risk) and runs them in parallel to evaluate a candidate's interview
 * transcript. Each agent assesses the transcript from a different perspective based on
 * their specific evaluation criteria.
 *
 * @param transcript - The interview transcript to evaluate (string format)
 * @param listing - Parsed job listing metadata used to generate evaluation system prompts
 * @param deep_research - Deep research results providing context for evaluation
 * @param interview_guideline - Interview guide providing additional context for evaluation
 * @returns Aggregated evaluation reports keyed by judge type
 * @throws Error if any agent execution fails
 */
export async function performEvaluations(
  transcript: InterviewTranscript,
  listing: JobListingResearchResponse,
  deepResearchReports: DeepResearchReports,
  interview_guideline: string
): Promise<EvaluationReports> {
  const combinedDeepResearch = combineDeepResearchReports(deepResearchReports);
  // Create evaluation agents for each judge type
  const contentJudgeAgent = createEvaluationAgent(contentJudgeSystemPrompt(listing, combinedDeepResearch, interview_guideline), "Content Judge Agent");
  const structureJudgeAgent = createEvaluationAgent(structureJudgeSystemPrompt(listing, combinedDeepResearch, interview_guideline), "Structure Judge Agent");
  const fitJudgeAgent = createEvaluationAgent(fitJudgeSystemPrompt(listing, combinedDeepResearch, interview_guideline), "Fit Judge Agent");
  const communicationJudgeAgent = createEvaluationAgent(communicationJudgeSystemPrompt(listing, combinedDeepResearch, interview_guideline), "Communication Judge Agent");
  const riskJudgeAgent = createEvaluationAgent(riskJudgeSystemPrompt(listing, combinedDeepResearch, interview_guideline), "Risk Judge Agent");

  const input = JSON.stringify(transcript);
  console.log("=== input", input);

  return await withTrace("InterviewEvaluationWorkflow", async () => {
    // Launch all agent runs immediately so they can execute in parallel
    // Each agent receives the transcript as input
    var evaluationTasks = [
      run(contentJudgeAgent, input),
      run(structureJudgeAgent, input),
      run(fitJudgeAgent, input),
      run(communicationJudgeAgent, input),
      run(riskJudgeAgent, input),
    ];

    if (deepResearchReports.userContextReport) {
      const candidateContextJudgeAgent = createEvaluationAgent(candidateContextJudgeSystemPrompt(listing, combinedDeepResearch, interview_guideline, deepResearchReports.userContextReport), "Candidate Context Judge Agent");
      evaluationTasks.push(run(candidateContextJudgeAgent, input));
    }

    try {
      // Execute all evaluation tasks concurrently and wait for all to complete
      // Promise.all will reject immediately if any task fails
      const [
        contentJudge,
        structureJudge,
        fitJudge,
        communicationJudge,
        riskJudge,
        candidateContextJudge,
      ] = await Promise.all(evaluationTasks);

      // Extract final outputs from each agent run
      return {
        contentJudgeEvaluation: contentJudge.finalOutput,
        structureJudgeEvaluation: structureJudge.finalOutput,
        fitJudgeEvaluation: fitJudge.finalOutput,
        communicationJudgeEvaluation: communicationJudge.finalOutput,
        riskJudgeEvaluation: riskJudge.finalOutput,
        candidateContextJudgeEvaluation: candidateContextJudge.finalOutput,
      };
    } catch (error) {
      // Re-throw with more context if it's not already an Error
      if (error instanceof Error) {
        throw new Error(`Failed to perform evaluations: ${error.message}`);
      }
      throw new Error(`Failed to perform evaluations: ${String(error)}`);
    }
  });
}

/**
 * Aggregates multiple evaluation reports into a single, candidate-facing performance evaluation.
 * 
 * This function takes individual evaluation reports from different judge agents (content, structure,
 * fit, communication, and risk) and combines all their feedback items into a single array. It then
 * uses an LLM to synthesize these evaluations into a cohesive performance evaluation report that
 * follows the PerformanceEvaluationResponseSchema structure.
 * 
 * @param evaluations - The aggregated evaluation reports from all judge agents
 * @param jobListingData - Parsed job listing metadata used to generate the aggregation prompt
 * @returns A promise that resolves to a PerformanceEvaluationResponse object containing aggregated feedback and summary
 * @throws Error if the API call fails or returns invalid data
 */
export async function performEvaluationAggregation(
  evaluations: EvaluationReports,
  transcript: InterviewTranscript,
  jobListingData: JobListingResearchResponse
): Promise<AggregatedEvaluation> {
  try {

    // STEP 1 - CREATE METHOD THAT TURNS evaluations INTO FEEDBACK GROUPED BY MESSAGE ID
    const feedbackByMessage = convertEvaluationsToFeedbackByMessage(evaluations, transcript);
    const evaluationAggregatorSystemPrompt = aggregateEvaluationsByMessagePrompt(jobListingData);
    
    // STEP 2 - Create an agent for each message, saving a reference to the message_id
    const consolidationTasks = feedbackByMessage.map((feedbackInput) => {
      const agent = createEvaluationAggregatorAgent(
        evaluationAggregatorSystemPrompt,
        `Evaluation Aggregator Agent for Message ${feedbackInput.message_id}`
      );
      const input = JSON.stringify({
        interviewer_question: feedbackInput.interviewer_question,
        candidate_answer: feedbackInput.candidate_answer,
        feedback: feedbackInput.feedback,
      });
      return {
        messageId: feedbackInput.message_id,
        task: run(agent, input),
      };
    });

    // STEP 3 - Execute all tasks in parallel and build ConsolidatedFeedback array
    // Promise.all preserves order: results[index] corresponds to consolidationTasks[index].task
    // Each task resolves directly to a ConsolidatedFeedback object, pairing messageId with its result
    const consolidatedFeedbackByMessage: ConsolidatedFeedback[] = await Promise.all(
      consolidationTasks.map(item => 
        item.task.then(result => ({
          message_id: item.messageId,
          consolidated_feedback: result.finalOutput as ConsolidatedFeedbackResponse,
        }))
      )
    );

    // STEP 4 - RETURN FAKE SUMMARIES FOR THE SAKE OF TESTING THESE RESULTS
    return {
      consolidated_feedback_by_message: consolidatedFeedbackByMessage,
      what_went_well_summary: "What went well summary",
      opportunities_for_improvement_summary: "Opportunities for improvement summary",
    };

    // // Extract all feedback arrays from each evaluation report and combine them into a single array
    // // Each evaluation report contains a feedback array, so we flatten all of them together
    // var combinedFeedback = [
    //   ...evaluations.contentJudgeEvaluation.feedback,
    //   ...evaluations.structureJudgeEvaluation.feedback,
    //   ...evaluations.fitJudgeEvaluation.feedback,
    //   ...evaluations.communicationJudgeEvaluation.feedback,
    //   ...evaluations.riskJudgeEvaluation.feedback,
    // ];

    // if (evaluations.candidateContextJudgeEvaluation) {
    //   combinedFeedback.push(...evaluations.candidateContextJudgeEvaluation.feedback);
    // }

    // // Separate feedback into GOOD and BAD lists based on the type property
    // // Filter all feedback items where type is "good"
    // var goodFeedback = combinedFeedback.filter(feedback => feedback.type === "good");
    
    // // Filter all feedback items where type is "bad"
    // var badFeedback = combinedFeedback.filter(feedback => feedback.type === "bad");

    // // Extract summaries from each evaluation
    // var evaluationSummaries = [
    //   evaluations.contentJudgeEvaluation.summary,
    //   evaluations.structureJudgeEvaluation.summary,
    //   evaluations.fitJudgeEvaluation.summary,
    //   evaluations.communicationJudgeEvaluation.summary,
    //   evaluations.riskJudgeEvaluation.summary,
    //   ...(evaluations.candidateContextJudgeEvaluation ? [evaluations.candidateContextJudgeEvaluation.summary] : []),
    // ];

    // const positiveAggregatorInput = JSON.stringify({
    //   summaries: evaluationSummaries,
    //   positive_feedback: goodFeedback,
    // });

    // const negativeAggregatorInput = JSON.stringify({
    //   summaries: evaluationSummaries,
    //   negative_feedback: badFeedback,
    // });

    // const positiveAggregatorAgent = createAggregatorAgent(aggregatePositiveEvaluationsPromptV1(jobListingData), "Positive Evaluation Aggregator Agent");
    // const negativeAggregatorAgent = createAggregatorAgent(aggregateNegativeEvaluationsPromptV1(jobListingData), "Negative Evaluation Aggregator Agent");

    // const aggregationTasks = [
    //   run(positiveAggregatorAgent, positiveAggregatorInput),
    //   run(negativeAggregatorAgent, negativeAggregatorInput),
    // ] as const;

    // const [positiveAggregatedEvaluation, negativeAggregatedEvaluation] = await Promise.all(aggregationTasks);

    // return {
    //   positive_evaluation_summary: positiveAggregatedEvaluation.finalOutput ?? "Unknown",
    //   positive_evaluation_feedback: goodFeedback,
    //   negative_evaluation_summary: negativeAggregatedEvaluation.finalOutput ?? "Unknown",
    //   negative_evaluation_feedback: badFeedback,
    // };
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to perform evaluation aggregation: ${error.message}`);
    }
    throw new Error(`Failed to perform evaluation aggregation: ${String(error)}`);
  }
}

/**
 * Distills user context from uploaded files into a consolidated candidate profile.
 * 
 * This function takes an array of FileItem objects, transforms them into a format
 * expected by the distillation prompt, and uses OpenAI's responses.create API to
 * generate a single, clean Markdown profile of the candidate. The profile extracts
 * interview-relevant information while filtering out personal information and
 * following strict safety guidelines.
 * 
 * @param fileItems - Array of FileItem objects containing file metadata and text content
 * @returns A promise that resolves to a Markdown string containing the consolidated candidate profile
 * @throws Error if the API call fails or returns invalid data
 */
export async function performUserContextDistillation(
  fileItems: FileItem[]
): Promise<string> {
  try {
    // Transform FileItem array into the format expected by the distillation prompt
    // Each file item is converted to an object with file_name and text_content properties
    // Only include files that have text content available
    const fileData = fileItems
      .filter(item => item.text !== undefined)
      .map(item => ({
        file_name: item.fileName,
        text_content: item.text ?? "",
      }));

    // Stringify the file data array to use as input to the LLM
    const input = JSON.stringify(fileData);

    // Call OpenAI's responses.create API with the user context distillation prompt
    // The prompt guides the LLM to extract and consolidate candidate information
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      instructions: USER_CONTEXT_DISTILLATION_SYSTEM_PROMPT_V1,
      input: input,
    });

    // Extract the generated candidate profile from the response
    const result = response.output_text;
    if (!result) {
      throw new Error("OpenAI Response gave an empty result");
    }

    return result;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw new Error(`Failed to perform user context distillation: ${error.message}`);
    }
    throw new Error(`Failed to perform user context distillation: ${String(error)}`);
  }
}

