import type { PerformanceEvaluationResponse } from "./performance-feedback";

/**
 * Type definition for evaluation reports.
 * Contains the aggregated outputs from all evaluation judge agents.
 */
export type EvaluationReports = {
  contentJudgeEvaluation: PerformanceEvaluationResponse;
  structureJudgeEvaluation: PerformanceEvaluationResponse;
  fitJudgeEvaluation: PerformanceEvaluationResponse;
  communicationJudgeEvaluation: PerformanceEvaluationResponse;
  riskJudgeEvaluation: PerformanceEvaluationResponse;
  candidateContextJudgeEvaluation: PerformanceEvaluationResponse | null | undefined;
};

