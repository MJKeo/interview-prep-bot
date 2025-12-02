"use client";

import { useState, useEffect } from "react";
import "./research-job-screen.css";
import { performDeepResearchAndContextDistillationAction, createInterviewGuideAction } from "@/app/actions";
import CustomErrorComponent from "@/components/custom-error-component";
import type { JobListingResearchResponse, DeepResearchReports, FileItem, JobListingWithId } from "@/types";
import Button from "@/components/button";
import { ButtonType, type CustomError } from "@/types";
import LoadingBar from "@/components/loading-bar";
import ResearchReportSection from "@/components/research-report-section";
import { NON_TRANSIENT_ERROR_MESSAGE, TRANSIENT_ERROR_MESSAGE } from "@/utils/constants";

/**
 * Props for the ResearchJobScreen component.
 */
interface ResearchJobScreenProps {
  /**
   * The scraped content from the job listing website.
   * This is required and will be parsed to extract structured attributes.
   */
  jobListingParsedData: JobListingResearchResponse;
  /**
   * List of attached files that were successfully uploaded (with SUCCESS or SAVED status).
   * These files will be used for user context distillation.
   */
  attachedFiles: FileItem[];
  /**
   * Reference to the current job listing being explored.
   * Contains the job listing ID and full data structure.
   */
  currentJobListing: JobListingWithId;
  /**
   * Callback function called when the current job listing is updated.
   * Used to save updated job listing data (e.g., deep research reports, interview guide) to the database.
   */
  onCurrentListingUpdated: () => void;
  /**
   * Callback function to navigate to the mock interview screen.
   * Called when the "start mock interview" button is clicked.
   * 
   * @param deepResearchReports - Deep research reports to pass to the interview screen
   * @param interviewGuide - The interview guide to pass to the interview screen
   */
  onStartMockInterview: (deepResearchReports: DeepResearchReports, interviewGuide: string) => void;
}

/**
 * Screen component for researching a job listing.
 * Accepts scraped job listing content, parses it to extract structured attributes,
 * and displays the results in a textbox.
 */
export default function ResearchJobScreen({ jobListingParsedData, attachedFiles, currentJobListing, onCurrentListingUpdated, onStartMockInterview }: ResearchJobScreenProps) {
   //  State for if deep research is running
   const [isLoadingDeepResearch, setIsLoadingDeepResearch] = useState<boolean>(false);
   //  State for if guide creation is running
  const [isLoadingGuide, setIsLoadingGuide] = useState<boolean>(false);
   // State to track if research has been completed successfully
   const [hasCompletedResearch, setHasCompletedResearch] = useState<boolean>(false);
   // State for error messages
   const [error, setError] = useState<CustomError | null>(null);
  // State for deep research reports
  const [deepResearchAndContextDistillationReports, setDeepResearchAndContextDistillationReports] = useState<DeepResearchReports | null>(null);
  // State for the interview guide
  const [interviewGuide, setInterviewGuide] = useState<string | null>(null);
  // State determining if we've parsed our selected job listing (if provided)
  const [hasParsedSelectedJobListing, setHasParsedSelectedJobListing] = useState<boolean>(false);

  useEffect(() => {
    if (currentJobListing) {
      setDeepResearchAndContextDistillationReports(currentJobListing.data["deep-research-report"]);
      setInterviewGuide(currentJobListing.data["interview-guide"]);
    }

    setHasParsedSelectedJobListing(true);
  }, [currentJobListing]);

  /**
   * Effect hook that runs when parsedData changes.
   * Calls the server action to perform deep research and user context distillation in parallel if parsedData exists.
   */
  useEffect(() => {
    /**
     * Async function to perform deep research on the parsed job listing and user context distillation.
     * Both operations run in parallel automatically when parsedData is available.
     */
    const runDeepResearch = async () => {
      try {
        setIsLoadingDeepResearch(true);
        setError(null);
        // Call the server action to perform deep research and user context distillation in parallel
        const deepResearchResult = await performDeepResearchAndContextDistillationAction(jobListingParsedData, attachedFiles);
        
        // Check if the deep research was successful
        if (deepResearchResult.success && deepResearchResult.reports) {
          // Store the deep research reports
          setDeepResearchAndContextDistillationReports(deepResearchResult.reports);

          // Save this to the db
          currentJobListing.data["deep-research-report"] = deepResearchResult.reports;
          onCurrentListingUpdated();
        } else {
          // Handle error from deep research action
          throw new Error(deepResearchResult.error ?? TRANSIENT_ERROR_MESSAGE);
        }
      } catch (err) {
        // Handle exceptions and display error message
        if (err instanceof Error) {
          setError({ message: err.message, retryAction: runDeepResearch });
        } else {
          setError({ message: NON_TRANSIENT_ERROR_MESSAGE, retryAction: null });
        }
      } finally {
        setIsLoadingDeepResearch(false);
      }
    };

    // Call the deep research function when parsedData is available
    if (hasParsedSelectedJobListing 
      && jobListingParsedData 
      && !isLoadingDeepResearch 
      && !deepResearchAndContextDistillationReports) {
      runDeepResearch();
    }
  }, [jobListingParsedData, hasParsedSelectedJobListing]);

  /**
   * Effect hook that runs when deepResearchReports changes.
   * Calls the server action to create an interview guide if both parsedData and deepResearchReports exist.
   */
  useEffect(() => {
    /**
     * Async function to create an interview guide from the job listing research and deep research reports.
     * Called automatically when deepResearchReports is available.
     */
    const createGuide = async () => {
      try {
        if (!deepResearchAndContextDistillationReports) {
          // This should be impossible since we check if deepResearchAndContextDistillationReports exists prior to calling this function
          setError({ message: NON_TRANSIENT_ERROR_MESSAGE, retryAction: null });
          return;
        }

        setIsLoadingGuide(true);
        setError(null);
        // Call the server action to create the interview guide
        const guideResult = await createInterviewGuideAction(jobListingParsedData, deepResearchAndContextDistillationReports);

        // Check if the guide creation was successful
        if (guideResult.success && guideResult.guide) {
          // Store the interview guide
          setInterviewGuide(guideResult.guide);

          // Save this to the db
          currentJobListing.data["interview-guide"] = guideResult.guide;
          onCurrentListingUpdated();
        } else {
          // Handle error from guide creation action
          throw new Error(guideResult.error ?? TRANSIENT_ERROR_MESSAGE);
        }
      } catch (err) {
        // Handle exceptions and display error message
        if (err instanceof Error) {
          setError({ message: err.message, retryAction: createGuide });
        } else {
          setError({ message: NON_TRANSIENT_ERROR_MESSAGE, retryAction: null });
        }
      } finally {
        setIsLoadingGuide(false);
      }
    };

    // Call the guide creation function when deepResearchReports is available
    if (hasParsedSelectedJobListing 
      && jobListingParsedData 
      && deepResearchAndContextDistillationReports 
      && !isLoadingGuide
      && !interviewGuide) {
      createGuide();
    }
  }, [deepResearchAndContextDistillationReports, hasParsedSelectedJobListing]);

  useEffect(() => {
    if (interviewGuide && deepResearchAndContextDistillationReports) {
      setHasCompletedResearch(true);
    }
  }, [interviewGuide, deepResearchAndContextDistillationReports]);

  // Loading messages for deep research loading bar
  const deepResearchMessages = [
    "Scouring the web for company insights and data...",
    "Analyzing recent financial reports and press releases...",
    "Mapping out the company's strategic landscape...",
    "Identifying core competitors and market challenges...",
    "Decoding the role's success metrics and KPIs...",
    "Investigating team dynamics and company culture...",
    "Researching industry trends and domain-specific tools...",
    "Synthesizing thousands of data points into key insights...",
    "Distilling findings into clear, actionable reports...",
    "Finalizing your comprehensive deep research profile...",
    "Greasing the axels...",
    "Turning on cheat codes...",
    "Phoning a friend...",
    "Dotting \"i\"s and crossing \"t\"s...",
  ];

  // Loading messages for interview guide loading bar
  const interviewGuideMessages = [
    "Synthesizing company research with job requirements...",
    "Extracting key success metrics and performance indicators...",
    "Identifying high-yield areas for exploration...",
    "Drafting role-specific situational challenges...",
    "Formulating targeted behavioral questions...",
    "Mapping candidate background to role expectations...",
    "Designing culture fit and motivation probes...",
    "Structuring the strategic interview roadmap...",
    "Refining interviewer context and guidelines...",
    "Finalizing your custom interview guide...",
    "Predicting plot twists...",
    "Translating from sanskrit...",
    "Getting into the flow state...",
  ];

  // Check if the button should be enabled
  const canStartInterview = hasCompletedResearch && deepResearchAndContextDistillationReports && interviewGuide;

  return (
    <div className="research-job-container">
      <div className="research-job-content">
        {/* Main Title */}
        <h1 className="page-title research-job-title">Perform Research</h1>
        
        {/* Job Listing Information Section */}
        {jobListingParsedData && (
          <div className="research-job-section">
            <h2 className="research-job-section-title">Job Listing Information</h2>
            <div className="research-job-header">
              <div className="research-job-detail-row">
                <span className="research-job-detail-label">Role Title:</span>
                <span className="research-job-detail-value">{jobListingParsedData.job_title}</span>
              </div>
              <div className="research-job-detail-row">
                <span className="research-job-detail-label">Company:</span>
                <span className="research-job-detail-value">{jobListingParsedData.company_name}</span>
              </div>
              <div className="research-job-detail-column">
                <span className="research-job-detail-label">Description:</span>
                <span className="research-job-detail-value description-value">{jobListingParsedData.job_description}</span>
              </div>
            </div>
          </div>
        )}

        {/* Deep Research Loading Bar */}
        {isLoadingDeepResearch && (
          <div className="research-job-loading-bar">
            <LoadingBar
              timeToLoad={30}
              initialLoadingMessage="Beginning deep research..."
              waitingMessages={deepResearchMessages}
            />
          </div>
        )}

        {/* Deep Research Reports Section */}
        {deepResearchAndContextDistillationReports && (
          <div className="research-job-section reports-section">
            <div className="research-job-section-header">
              <h2 className="research-job-section-title">Research Reports</h2>
              <div className="research-job-section-subtitle">
                <p>
                  These deep research reports are designed to give you a significant competitive advantage. They go far beyond the job description to help you understand the company's strategic priorities, business model, and current challenges. You'll gain clarity on what "success" looks like for this specific role, including the necessary skills, key team collaborations, and relevant industry jargon.
                </p>
                <p>
                  By internalizing this context, you can view the opportunity through the lens of your interviewers; understanding what they truly value and what problems they need you to solve. Use these insights to craft tailored, impactful responses that demonstrate deep industry awareness and prove you're ready to hit the ground running.
                </p>
              </div>
            </div>
            
            <div className="research-job-reports">
              <ResearchReportSection
                title="Company Strategy Report"
                objective="This report analyzes the company's mission and market positioning to provide a clear view of their overall business strategy and competitive landscape. It highlights key milestones and objectives so you can understand the broader context in which the company operates."
                usage="Use these insights to demonstrate your commercial awareness by aligning your answers with the company's business goals. It will also help you ask strategic questions that show you understand the 'big picture' beyond just the job description."
                reportContent={deepResearchAndContextDistillationReports.companyStrategyReport}
              />
              <ResearchReportSection
                title="Role Success Report"
                objective="This report defines the role's core purpose and breaks down the specific responsibilities and metrics the company uses to measure success. It clarifies the essential competencies required, giving you a precise understanding of what they are looking for in a top performer."
                usage="This knowledge enables you to tailor your pitch to their exact needs, showing clearly how your experience will drive the results they value. It helps you move beyond generic answers to articulate specifically how you will solve their problems."
                reportContent={deepResearchAndContextDistillationReports.roleSuccessReport}
              />
              <ResearchReportSection
                title="Team Culture Report"
                objective="This section investigates the team's structure, operational workflows, and communication styles to give you a sense of the day-to-day work environment. It explores the organization's core values and cultural norms to help you understand how work actually gets done."
                usage="Leverage these insights to demonstrate a strong cultural fit and navigate behavioral questions with confidence. It allows you to show that you understand their collaboration style and have the right mindset to thrive in their specific team dynamic."
                reportContent={deepResearchAndContextDistillationReports.teamCultureReport}
              />
              <ResearchReportSection
                title="Domain Knowledge Report"
                objective="This report outlines the strategic function of this role within the broader industry, covering standard tools, key concepts, and current domain challenges. It provides a focused overview of the technical landscape and trends relevant to this specific position."
                usage="Use this to ensure you are speaking the industry language fluently and can discuss technical trends with authority. It equips you to demonstrate your subject matter expertise and specific problem areas you'd be able to help solve."
                reportContent={deepResearchAndContextDistillationReports.domainKnowledgeReport}
              />
            </div>
          </div>
        )}

        {/* Interview Guide Loading Bar */}
        {isLoadingGuide && (
          <div className="research-job-loading-bar">
            <LoadingBar
              timeToLoad={17}
              initialLoadingMessage="Creating interview guide..."
              waitingMessages={interviewGuideMessages}
            />
          </div>
        )}

        {interviewGuide && (
          <p className="loading-progress-text">Interview Guide completed! You can begin your practice interview whenever you're ready.</p>
        )}

        {/* Display error message if something went wrong */}
        {error && 
          <div className="error-message-container">
            <CustomErrorComponent customError={error} />
          </div>
        }
      </div>

      {/* Sticky Footer Button */}
      <div className="research-job-footer">
        <Button
          htmlType="button"
          type={ButtonType.PRIMARY}
          disabled={!canStartInterview}
          onClick={() => {
            if (canStartInterview) {
              onStartMockInterview(deepResearchAndContextDistillationReports!, interviewGuide!);
            }
          }}
        >
          Begin Practice Interview
        </Button>
      </div>
    </div>
  );
}

