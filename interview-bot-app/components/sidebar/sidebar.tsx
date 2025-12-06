"use client";

import { useState, useEffect, useRef } from "react";
import "./sidebar.css";
import type { JobListingWithId, SidebarSelection } from "@/types";
import { deleteJobListing, saveJobListing } from "@/utils/local-database";
import { APP_NAME } from "@/utils/constants";
import githubIcon from "@/images/github-mark-white.png";
import linkedinIcon from "@/images/InBug-White.png";
import interviewIcon from "@/images/interview-icon-white.png";

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
   * Callback function called whenever a job listing has been updated
   */
  onDidUpdateJobListing: (jobListing: JobListingWithId) => void;


  currentInterviewId: string | null;

  /**
   * Callback function called when a job listing is deleted.
   * Receives the deleted job listing as a parameter.
   * 
   * @param deletedJobListing - The job listing that was deleted
   */
  onDeleteJobListing: (deletedJobListing: JobListingWithId) => void;

  onDeleteInterview: (jobListing: JobListingWithId, interviewId: string) => void;

  /**
   * Callback function called when the "New Listing" button is clicked.
   * Used to navigate back to the enter job listing URL screen and reset state.
   */
  onNewJobListing: () => void;

  onNewInterview: (jobListing: JobListingWithId) => void;

  /**
   * Callback function called when a job listing is selected from the sidebar.
   * 
   * @param selection - The job listing that was clicked
   */
  onSelectJobListing: (selectedListing: JobListingWithId) => void;

  // Called when an interview is selected from the sidebar.
  onSelectInterview: (jobListing: JobListingWithId, interviewId: string) => void;
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
  onDidUpdateJobListing,
  currentInterviewId,
  onDeleteJobListing,
  onDeleteInterview,
  onNewJobListing,
  onNewInterview,
  onSelectJobListing,
  onSelectInterview,
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
  // Track which interview's menu is currently open (null if none)
  // Format: "${jobListingId}-${interviewId}"
  const [openInterviewMenuId, setOpenInterviewMenuId] = useState<string | null>(null);
  // Ref to track menu container for click outside detection (job listings)
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Ref to track menu container for click outside detection (interviews)
  const interviewMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track which item is currently being edited (null when not editing)
  // Contains jobListingId and optionally interviewId
  const [editingItem, setEditingItem] = useState<SidebarSelection | null>(null);
  // Current value being edited
  const [editValue, setEditValue] = useState<string>("");
  // Ref for the input/textarea element to handle auto-focus and selection
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  /**
   * Effect hook that handles auto-focus and cursor positioning when entering edit mode.
   * When an item enters edit mode, focuses the textarea, sets cursor to end, and auto-resizes.
   */
  useEffect(() => {
    if (editInputRef.current && editingItem && editInputRef.current instanceof HTMLTextAreaElement) {
      editInputRef.current.focus();
      // Select all text so typing immediately replaces existing content
      editInputRef.current.setSelectionRange(0, editInputRef.current.value.length);
      // Auto-resize textarea to fit content
      editInputRef.current.style.height = "auto";
      editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
    }
  }, [editingItem]);

  useEffect(() => {
    if (currentJobListing && currentInterviewId) {
        setSelectedItem({ jobListingId: currentJobListing.id, interviewId: currentInterviewId });
    } else if (currentJobListing) {
        setSelectedItem({ jobListingId: currentJobListing.id });
    } else {
        setSelectedItem(null);
    }
  }, [currentJobListing, currentInterviewId]);

  useEffect(() => {
    // Expand the job listing if an interview inside is selected
    if (selectedItem?.interviewId) {
      setExpandedJobListings((prev) => {
        const next = new Set(prev);
        next.add(selectedItem.jobListingId);
        return next;
      });
    }
  }, [selectedItem]);

  /**
   * Effect hook that handles clicking outside the menu to close it.
   * Closes the menu when a click occurs outside the menu container.
   * Handles both job listing menus and interview menus.
   */
  useEffect(() => {
    /**
     * Handles clicks outside the menu to close it.
     * 
     * @param event - The click event
     */
    const handleClickOutside = (event: MouseEvent) => {
      // Handle job listing menu
      if (openMenuId !== null) {
        const menuElement = menuRefs.current.get(openMenuId);
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
      
      // Handle interview menu
      if (openInterviewMenuId !== null) {
        const menuElement = interviewMenuRefs.current.get(openInterviewMenuId);
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenInterviewMenuId(null);
        }
      }
    };

    // Add event listener when a menu is open
    if (openMenuId !== null || openInterviewMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup event listener on unmount or when menu closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId, openInterviewMenuId]);

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
    // (if we clicked on an interview within this job listing, clicking on the listing should cause an action)
    if (jobListing.id === selectedItem?.jobListingId && !selectedItem?.interviewId) {
      toggleJobListingExpansion(jobListing.id);
      return;
    }

    updateSelectedItem(jobListing);

    // Expand the interviews contained within this if it's not open
    if (!expandedJobListings.has(jobListing.id)) {
      setExpandedJobListings((prev) => {
        const next = new Set(prev);
        next.add(jobListing.id);
        return next;
      });
    }
    
    // Notify parent component of the selection
    onSelectJobListing(jobListing);
  };

  const updateSelectedItem = (jobListing: JobListingWithId) => {
    // Update local state to select the job listing (without an interview ID)
    const selection: SidebarSelection = { jobListingId: jobListing.id };
    setSelectedItem(selection);
  }

  /**
   * Handles completing the edit sequence.
   * If the value is empty, reverts to the original name.
   * Otherwise, calls the appropriate update method and resets edit state.
   */
  const handleEditComplete = () => {
    if (!editingItem) return;

    // If empty, cancel the rename (revert to original)
    if (editValue.trim() === "") {
      setEditingItem(null);
      setEditValue("");
      return;
    }

    // Find the job listing
    const jobListing = jobListings.find(jl => jl.id === editingItem.jobListingId);
    if (!jobListing) {
      // Reset state if job listing not found
      setEditingItem(null);
      setEditValue("");
      return;
    }

    // Call appropriate update method
    if (editingItem.interviewId) {
      interviewNameUpdated(jobListing, editingItem.interviewId, editValue.trim());
    } else {
      jobListingNameUpdated(jobListing, editValue.trim());
    }

    // Reset edit state
    setEditingItem(null);
    setEditValue("");
  };

  /**
   * Handles changes to the edit textarea value.
   * Also handles auto-resizing for the textarea element.
   * 
   * @param e - The change event
   */
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    // Auto-resize textarea to fit content
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  /**
   * Handles keyboard events in the edit textarea.
   * Enter completes the edit, Escape cancels it.
   * 
   * @param e - The keyboard event
   */
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      // Enter completes the edit for both textareas
      e.preventDefault();
      handleEditComplete();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Cancel edit and don't update name
      setEditingItem(null);
      setEditValue("");
    }
  };

  /**
   * Placeholder method for when a job listing name is updated.
   * Called after the user completes editing a job listing name.
   * 
   * @param jobListing - The job listing whose name was updated
   * @param newDisplayName - The new display name
   */
  const jobListingNameUpdated = (jobListing: JobListingWithId, newDisplayName: string) => {
    if (jobListing.data["display-name"] === newDisplayName) {
      return;
    }

    // Perform rename and notify parent component
    jobListing.data["display-name"] = newDisplayName;
    onDidUpdateJobListing(jobListing);
  };

  /**
   * Placeholder method for when an interview name is updated.
   * Called after the user completes editing an interview name.
   * 
   * @param jobListing - The job listing containing the interview
   * @param interviewId - The ID of the interview whose name was updated
   * @param newDisplayName - The new display name
   */
  const interviewNameUpdated = (jobListing: JobListingWithId, interviewId: string, newDisplayName: string) => {
    const changedInterview = jobListing.data.interviews?.[interviewId];
    if (!changedInterview || changedInterview["display-name"] === newDisplayName) {
        return;
    }
    // TODO: Implement name update logic
    changedInterview["display-name"] = newDisplayName;
    onDidUpdateJobListing(jobListing);
  };

  /**
   * Handles clicking on an interview item.
   * Selects both the job listing and the specific interview.
   * 
   * @param jobListingId - The ID of the parent job listing
   * @param interviewId - The ID of the clicked interview
   */
  const handleInterviewClick = (jobListing: JobListingWithId, interviewId: string) => {
    // Expand the parent job listing if it's collapsed
    setExpandedJobListings((prev) => {
      const next = new Set(prev);
      next.add(jobListing.id);
      return next;
    });
    // Update local state to select the interview
    const selection: SidebarSelection = { jobListingId: jobListing.id, interviewId };
    setSelectedItem(selection);

    // Notify parent component of the selection
    onSelectInterview(jobListing, interviewId);
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
      !selectedItem?.interviewId
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
   * Handles clicking on a menu button (New Interview, Rename, or Delete) for job listings.
   * Prevents event propagation and closes the menu.
   * 
   * @param e - The click event
   * @param action - The action being performed ("new-interview", "rename", or "delete")
   * @param jobListing - The job listing the action is being performed on
   */
  const handleMenuButtonClick = (e: React.MouseEvent, action: "new-interview" | "rename" | "delete", jobListing: JobListingWithId) => {
    // Stop event propagation to prevent parent handlers from firing
    e.stopPropagation();
    // Close the menu
    setOpenMenuId(null);
    
    if (action === "new-interview") {
      // Call parent callback to create a new interview for this job listing
      onNewInterview(jobListing);
    } else if (action === "rename") {
      // Enter edit mode for this job listing
      const displayName = jobListing.data["display-name"];
      setEditingItem({ jobListingId: jobListing.id });
      setEditValue(displayName);
    } else if (action === "delete") {
      // Notify parent component to update its state
      onDeleteJobListing(jobListing);
    }
  };

  /**
   * Handles clicking on the three-dot menu icon for interviews.
   * Toggles the menu open/closed state for the specified interview.
   * 
   * @param e - The click event
   * @param jobListingId - The ID of the parent job listing
   * @param interviewId - The ID of the interview
   */
  const handleInterviewMenuIconClick = (e: React.MouseEvent, jobListingId: string, interviewId: string) => {
    // Stop event propagation to prevent the parent click handler from firing
    e.stopPropagation();
    // Create composite key for interview menu
    const menuKey = `${jobListingId}-${interviewId}`;
    // Toggle menu: if already open, close it; otherwise, open it
    setOpenInterviewMenuId((prev) => (prev === menuKey ? null : menuKey));
  };

  /**
   * Handles clicking on a menu button (Rename or Delete) for interviews.
   * Prevents event propagation and closes the menu.
   * 
   * @param e - The click event
   * @param action - The action being performed ("rename" or "delete")
   * @param jobListing - The job listing containing the interview
   * @param interviewId - The ID of the interview the action is being performed on
   */
  const handleInterviewMenuButtonClick = (
    e: React.MouseEvent,
    action: "rename" | "delete",
    jobListing: JobListingWithId,
    interviewId: string
  ) => {
    // Stop event propagation to prevent parent handlers from firing
    e.stopPropagation();
    // Close the menu
    setOpenInterviewMenuId(null);
    
    if (action === "rename") {
      // Enter edit mode for this interview
      const interview = jobListing.data.interviews?.[interviewId];
      const displayName = interview ? interview["display-name"] : "";
      setEditingItem({ jobListingId: jobListing.id, interviewId });
      setEditValue(displayName);
    } else if (action === "delete") {
      // Notify parent component after successful deletion
      onDeleteInterview(jobListing, interviewId);
    }
  };

  return (
    <aside className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-header" onClick={() => {
                // Reset selected item to nothing
                setSelectedItem(null);
                // Call parent callback to handle navigation and state reset
                onNewJobListing();
              }}>
            <h1 className="sidebar-title">
              <img
                src={interviewIcon.src}
                alt="Interview Pro"
                className="sidebar-title-icon"
              />
              {APP_NAME}
            </h1>
          </div>
        {jobListings.length > 0 && (
          <h2 className="sidebar-subtitle">
            My Saved Jobs
          </h2>
        )}
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
              <li key={jobListingId} className={`sidebar-list-item ${isExpanded ? "sidebar-list-item-expanded" : ""}`}>
                {/* Job Listing Item - hstack with collapse button, label, and menu icon */}
                <div className={`sidebar-job-listing ${isSelected ? "sidebar-item-selected" : ""}`}>
                  {/* Expand/Collapse Button - always visible */}
                  <button
                    type="button"
                    className="sidebar-expand-button"
                    onClick={(e) => handleCollapseIconClick(e, jobListingId)}
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                  {/* Job Listing Label - conditionally render textarea or span */}
                  {editingItem?.jobListingId === jobListingId && !editingItem?.interviewId ? (
                    <textarea
                      ref={editInputRef as React.RefObject<HTMLTextAreaElement>}
                      className="sidebar-job-listing-name-input"
                      value={editValue}
                      onChange={handleEditChange}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleEditComplete}
                      onClick={(e) => e.stopPropagation()}
                      rows={1}
                    />
                  ) : (
                    <span
                      className="sidebar-job-listing-name"
                      onClick={() => handleJobListingClick(jobListing)}
                    >
                      {displayName}
                    </span>
                  )}
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
                    onClick={(e) => handleMenuIconClick(e, jobListingId)}
                  >
                    <button
                      type="button"
                      className="sidebar-menu-icon"
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
                          onClick={(e) => handleMenuButtonClick(e, "new-interview", jobListing)}
                        >
                          New Interview
                        </button>
                        <button
                          type="button"
                          className="sidebar-menu-button"
                          onClick={(e) => handleMenuButtonClick(e, "rename", jobListing)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="sidebar-menu-button"
                          onClick={(e) => handleMenuButtonClick(e, "delete", jobListing)}
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
                      const interviewMenuKey = `${jobListingId}-${interviewId}`;
                      const isInterviewMenuOpen = openInterviewMenuId === interviewMenuKey;

                      return (
                        <li
                          key={interviewId}
                          className="sidebar-interview-item"
                        >
                          <div
                            className={`sidebar-interview ${interviewIsSelected ? "sidebar-item-selected" : ""}`}
                            onClick={() =>
                              handleInterviewClick(jobListing, interviewId)
                            }
                          >
                            {/* Interview Display Name - conditionally render textarea or span */}
                            {editingItem?.jobListingId === jobListingId && editingItem?.interviewId === interviewId ? (
                              <textarea
                                ref={editInputRef as React.RefObject<HTMLTextAreaElement>}
                                className="sidebar-interview-name-input"
                                value={editValue}
                                onChange={handleEditChange}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleEditComplete}
                                onClick={(e) => e.stopPropagation()}
                                rows={1}
                              />
                            ) : (
                              <span className="sidebar-interview-name">
                                {interviewDisplayName}
                              </span>
                            )}
                            {/* Three-dot menu icon for interview */}
                            <div
                              className="sidebar-menu-container"
                              ref={(el) => {
                                if (el) {
                                  interviewMenuRefs.current.set(interviewMenuKey, el);
                                } else {
                                  interviewMenuRefs.current.delete(interviewMenuKey);
                                }
                              }}
                              onClick={(e) => handleInterviewMenuIconClick(e, jobListingId, interviewId)}
                            >
                              <button
                                type="button"
                                className="sidebar-menu-icon"
                                aria-label="Menu"
                              >
                                <span className="sidebar-menu-dots">
                                  <span className="sidebar-menu-dot"></span>
                                  <span className="sidebar-menu-dot"></span>
                                  <span className="sidebar-menu-dot"></span>
                                </span>
                              </button>
                              {/* Tooltip menu dropdown */}
                              {isInterviewMenuOpen && (
                                <div className="sidebar-menu-tooltip">
                                  <button
                                    type="button"
                                    className="sidebar-menu-button"
                                    onClick={(e) => handleInterviewMenuButtonClick(e, "rename", jobListing, interviewId)}
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    className="sidebar-menu-button"
                                    onClick={(e) => handleInterviewMenuButtonClick(e, "delete", jobListing, interviewId)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
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
          <span className="sidebar-new-listing-text">+ New Job</span>
        </button>
      </nav>
      </div>
      {/* Footer with social icons - always stuck to bottom */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-social-icon"
          aria-label="GitHub"
          onClick={() => {
            window.open("https://github.com/MJKeo", "_blank", "noopener,noreferrer");
          }}
        >
          <img
            src={githubIcon.src}
            alt="GitHub"
            className="sidebar-icon-img"
          />
        </button>
        <button
          type="button"
          className="sidebar-social-icon"
          aria-label="LinkedIn"
          onClick={() => {
            window.open("https://www.linkedin.com/in/michael-keohane", "_blank", "noopener,noreferrer");
          }}
        >
          <img
            src={linkedinIcon.src}
            alt="LinkedIn"
            className="sidebar-icon-img"
          />
        </button>
      </div>
    </aside>
  );
}

