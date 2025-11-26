"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./research-report-section.css";

/**
 * Props for the ResearchReportSection component.
 */
interface ResearchReportSectionProps {
  /**
   * The title of the report section (e.g., "Company Strategy Report").
   */
  title: string;
  /**
   * The objective text for this research phase.
   */
  objective: string;
  /**
   * The usage guidance text for this research.
   */
  usage: string;
  /**
   * The markdown content of the report itself.
   */
  reportContent: string;
  /**
   * Whether the section should be initially open (default: false).
   */
  initiallyOpen?: boolean;
}

/**
 * ResearchReportSection component that displays a collapsible research report section.
 * 
 * Features:
 * - Collapsible header with chevron icon (▶/▼) and title
 * - Click header to toggle open/closed state
 * - When open, displays:
 *   - Objective section with label and text
 *   - Usage section with label and text
 *   - Report content rendered as markdown
 * 
 * @param title - The title of the report section
 * @param objective - The objective text for this research phase
 * @param usage - The usage guidance text for this research
 * @param reportContent - The markdown content of the report
 * @param initiallyOpen - Whether the section should be initially open (default: false)
 * @returns A collapsible research report section component
 */
export default function ResearchReportSection({
  title,
  objective,
  usage,
  reportContent,
  initiallyOpen = false,
}: ResearchReportSectionProps) {
  // State to track if the section is open or closed
  const [isOpen, setIsOpen] = useState<boolean>(initiallyOpen);

  /**
   * Handles clicking on the header to toggle the section open/closed.
   */
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="research-report-section">
      {/* Header with chevron icon and title - clickable to toggle */}
      <button
        type="button"
        className="research-report-section__header"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
      >
        <span className="research-report-section__chevron">
          {isOpen ? "▼" : "▶"}
        </span>
        <span className="research-report-section__title">{title}</span>
      </button>

      {/* Content area - visible only when open */}
      {isOpen && (
        <div className="research-report-section__content">
          {/* Objective section */}
          <div className="research-report-section__metadata">
            <div className="research-report-section__label">Overview:</div>
            <div className="research-report-section__text">{objective}</div>
          </div>

          {/* Usage section */}
          <div className="research-report-section__metadata">
            <div className="research-report-section__label">How to use this report:</div>
            <div className="research-report-section__text">{usage}</div>
          </div>

          {/* Report content rendered as markdown */}
          <div className="research-report-section__report">
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reportContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

