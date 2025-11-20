"use client";

import { useState, useEffect, useRef } from "react";
import "./sidebar.css";
import type { JobListingWithId, SidebarSelection } from "@/types";
import { deleteJobListing } from "@/utils/local-database";

/**
 * Props for the Sidebar component.
 */
interface SidebarProps {
  /**
   * Array of job listings to display in the sidebar.
   * Each item contains an id and the full job listing data.
   */
  jobListings: JobListingWithId[];

  /**
   * The currently selected job listing (from the parent component).
   * Necessary when we create a new listing
   */
  currentJobListing: JobListingWithId | null;

  /**
   * Callback function called when a job listing is deleted.
   * Receives the deleted job listing as a parameter.
   * 
   * @param deletedJobListing - The job listing that was deleted
   */
  onDeleteJobListing: (deletedJobListing: JobListingWithId) => void;
  /**
   * Callback function called when the "New Listing" button is clicked.
   * Used to navigate back to the enter job listing URL screen and reset state.
   */
  onNewJobListing: () => void;
  /**
   * Callback function called when a job listing is selected from the sidebar.
   * 
   * @param selection - The job listing that was clicked
   */
  onSelectJobListing: (selectedListing: JobListingWithId) => void;
}

/**
 * Sidebar component that displays a hierarchical list of job listings and their interviews.
 * 
 * Features:
 * - Two-level structure: job listings (first layer) and interviews (second layer)
 * - Collapsible interview sublists for each job listing
 * - Hover highlighting for better UX
 * - Click highlighting to show selected item
 * - Fixed width sidebar positioned on the left
 * 
 * @param jobListings - Array of job listings to display
 * @param selectedItem - Currently selected item for highlighting
 * @param onItemClick - Callback when an item is clicked
 * @returns A sidebar component with job listings and nested interviews
 */
export default function Sidebar({
  jobListings,
  currentJobListing,
  onDeleteJobListing,
  onNewJobListing,
  onSelectJobListing,
}: SidebarProps) {
  // Track which job listings have their interview lists expanded
  // Key is jobListingId, value is boolean (true = expanded, false = collapsed)
  const [expandedJobListings, setExpandedJobListings] = useState<Set<string>>(
    new Set()
  );
  // Track the currently selected sidebar item using local state
  const [selectedItem, setSelectedItem] = useState<SidebarSelection | null>(null);
  // Track which job listing's menu is currently open (null if none)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // Ref to track menu container for click outside detection
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /**
   * Effect hook that initializes all job listings with interviews to be expanded on mount.
   * All collapsible items start in their non-collapsed (expanded) form.
   */
  useEffect(() => {
    // Initialize all job listings with interviews as expanded
    const initialExpanded = new Set<string>();
    jobListings.forEach((jobListing) => {
      const interviewIds = Object.keys(jobListing.data.interviews ?? {});
      if (interviewIds.length > 0) {
        initialExpanded.add(jobListing.id);
      }
    });
    setExpandedJobListings(initialExpanded);
  }, [jobListings]);

  useEffect(() => {
    if (currentJobListing) {
        setSelectedItem({ jobListingId: currentJobListing.id });
    } else {
        setSelectedItem(null);
    }
  }, [currentJobListing]);

  /**
   * Effect hook that handles clicking outside the menu to close it.
   * Closes the menu when a click occurs outside the menu container.
   */
  useEffect(() => {
    /**
     * Handles clicks outside the menu to close it.
     * 
     * @param event - The click event
     */
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId === null) return;
      
      const menuElement = menuRefs.current.get(openMenuId);
      if (menuElement && !menuElement.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    // Add event listener when a menu is open
    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup event listener on unmount or when menu closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  /**
   * Toggles the expanded state of a job listing's interview list.
   * 
   * @param jobListingId - The ID of the job listing to toggle
   */
  const toggleJobListingExpansion = (jobListingId: string) => {
    setExpandedJobListings((prev) => {
      const next = new Set(prev);
      if (next.has(jobListingId)) {
        next.delete(jobListingId);
      } else {
        next.add(jobListingId);
      }
      return next;
    });
  };

  /**
   * Handles clicking on the collapse/expand icon.
   * Only toggles the collapse status, does not select the item.
   * 
   * @param e - The click event
   * @param jobListingId - The ID of the job listing to toggle
   */
  const handleCollapseIconClick = (e: React.MouseEvent, jobListingId: string) => {
    // Stop event propagation to prevent the parent click handler from firing
    e.stopPropagation();
    // Toggle expansion without selecting
    toggleJobListingExpansion(jobListingId);
  };

  /**
   * Handles clicking on a job listing item (excluding the collapse icon).
   * Only selects the job listing, does not change collapse status.
   * 
   * @param jobListingId - The ID of the clicked job listing
   */
  const handleJobListingClick = (jobListing: JobListingWithId) => {
    // Do nothing if this is the same thing already clicked
    if (jobListing.id === selectedItem?.jobListingId) {
      return;
    }

    updateSelectedItem(jobListing);
    
    // Notify parent component of the selection
    onSelectJobListing(jobListing);
  };

  const updateSelectedItem = (jobListing: JobListingWithId) => {
    // Update local state to select the job listing (without an interview ID)
    const selection: SidebarSelection = { jobListingId: jobListing.id };
    setSelectedItem(selection);
  }

  /**
   * Handles clicking on an interview item.
   * Selects both the job listing and the specific interview.
   * 
   * @param jobListingId - The ID of the parent job listing
   * @param interviewId - The ID of the clicked interview
   */
  const handleInterviewClick = (jobListingId: string, interviewId: string) => {
    // Expand the parent job listing if it's collapsed
    setExpandedJobListings((prev) => {
      const next = new Set(prev);
      next.add(jobListingId);
      return next;
    });
    // Update local state to select the interview
    const selection: SidebarSelection = { jobListingId, interviewId };
    setSelectedItem(selection);
  };

  /**
   * Checks if a job listing item is currently selected.
   * 
   * @param jobListingId - The ID of the job listing to check
   * @returns True if this job listing is selected (and no interview is selected)
   */
  const isJobListingSelected = (jobListingId: string): boolean => {
    return (
      selectedItem?.jobListingId === jobListingId &&
      selectedItem?.interviewId === undefined
    );
  };

  /**
   * Checks if an interview item is currently selected.
   * 
   * @param jobListingId - The ID of the parent job listing
   * @param interviewId - The ID of the interview to check
   * @returns True if this interview is selected
   */
  const isInterviewSelected = (jobListingId: string, interviewId: string): boolean => {
    return (
      selectedItem?.jobListingId === jobListingId &&
      selectedItem?.interviewId === interviewId
    );
  };

  /**
   * Handles clicking on the three-dot menu icon.
   * Toggles the menu open/closed state for the specified job listing.
   * 
   * @param e - The click event
   * @param jobListingId - The ID of the job listing
   */
  const handleMenuIconClick = (e: React.MouseEvent, jobListingId: string) => {
    // Stop event propagation to prevent the parent click handler from firing
    e.stopPropagation();
    // Toggle menu: if already open, close it; otherwise, open it
    setOpenMenuId((prev) => (prev === jobListingId ? null : jobListingId));
  };

  /**
   * Handles clicking on a menu button (Rename or Delete).
   * Prevents event propagation and closes the menu.
   * 
   * @param e - The click event
   * @param action - The action being performed ("rename" or "delete")
   * @param jobListingId - The ID of the job listing the action is being performed on
   */
  const handleMenuButtonClick = (e: React.MouseEvent, action: "rename" | "delete", jobListingId: string) => {
    // Stop event propagation to prevent parent handlers from firing
    e.stopPropagation();
    // Close the menu
    setOpenMenuId(null);
    
    if (action === "rename") {
      // Placeholder for rename functionality
    } else if (action === "delete") {
      // Find the job listing to delete
      const jobListingToDelete = jobListings.find(
        (listing) => listing.id === jobListingId
      );
      
      // If the job listing exists, delete it from the database and notify parent
      if (jobListingToDelete) {
        // Delete from IndexedDB
        deleteJobListing(jobListingToDelete)
          .then(() => {
            // Notify parent component to update its state
            onDeleteJobListing(jobListingToDelete);
          })
          .catch((error) => {
            // Log error but don't crash the component
            console.error("Failed to delete job listing:", error);
          });
      }
    }
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="sidebar-list">
          {jobListings.map((jobListing) => {
            const jobListingId = jobListing.id;
            const displayName = jobListing.data["display-name"];
            const interviews = jobListing.data.interviews;
            const interviewIds = Object.keys(interviews ?? {});
            const hasInterviews = interviewIds.length > 0;
            const isExpanded = expandedJobListings.has(jobListingId);
            const isSelected = isJobListingSelected(jobListingId);

            return (
              <li key={jobListingId} className="sidebar-list-item">
                {/* Job Listing Item - hstack with collapse button, label, and menu icon */}
                <div className={`sidebar-job-listing ${isSelected ? "sidebar-item-selected" : ""}`}>
                  {/* Expand/Collapse Button */}
                  {hasInterviews && (
                    <button
                      type="button"
                      className="sidebar-expand-button"
                      onClick={(e) => handleCollapseIconClick(e, jobListingId)}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  )}
                  {/* Job Listing Label */}
                  <span
                    className="sidebar-job-listing-name"
                    onClick={() => handleJobListingClick(jobListing)}
                  >
                    {displayName}
                  </span>
                  {/* Three-dot menu icon */}
                  <div
                    className="sidebar-menu-container"
                    ref={(el) => {
                      if (el) {
                        menuRefs.current.set(jobListingId, el);
                      } else {
                        menuRefs.current.delete(jobListingId);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="sidebar-menu-icon"
                      onClick={(e) => handleMenuIconClick(e, jobListingId)}
                      aria-label="Menu"
                    >
                      <span className="sidebar-menu-dots">
                        <span className="sidebar-menu-dot"></span>
                        <span className="sidebar-menu-dot"></span>
                        <span className="sidebar-menu-dot"></span>
                      </span>
                    </button>
                    {/* Tooltip menu dropdown */}
                    {openMenuId === jobListingId && (
                      <div className="sidebar-menu-tooltip">
                        <button
                          type="button"
                          className="sidebar-menu-button"
                          onClick={(e) => handleMenuButtonClick(e, "rename", jobListingId)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="sidebar-menu-button"
                          onClick={(e) => handleMenuButtonClick(e, "delete", jobListingId)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interview Sublist */}
                {hasInterviews && isExpanded && (
                  <ul className="sidebar-interview-list">
                    {interviewIds.map((interviewId) => {
                      const interview = interviews ? interviews[interviewId] : null;
                      const interviewDisplayName = interview ? interview["display-name"] : null;
                      const interviewIsSelected = isInterviewSelected(
                        jobListingId,
                        interviewId
                      );

                      return (
                        <li
                          key={interviewId}
                          className="sidebar-interview-item"
                        >
                          <div
                            className={`sidebar-interview ${interviewIsSelected ? "sidebar-item-selected" : ""}`}
                            onClick={() =>
                              handleInterviewClick(jobListingId, interviewId)
                            }
                          >
                            {/* Interview Display Name */}
                            <span className="sidebar-interview-name">
                              {interviewDisplayName}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {/* New Listing button - appears below all job listings */}
        <button
          type="button"
          className="sidebar-new-listing-button"
          onClick={() => {
            // Reset selected item to nothing
            setSelectedItem(null);
            // Call parent callback to handle navigation and state reset
            onNewJobListing();
          }}
        >
          New Listing
        </button>
      </nav>
    </aside>
  );
}

