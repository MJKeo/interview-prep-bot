"use client";

import { useState, useEffect, useRef } from "react";
import "./upload-file.css";
import { parseFile } from "@/utils/file-parser";
import { supportedFileTypes } from "@/utils/file-parser";

type FileStatus = "loading" | "success" | "error";

type FileItem = {
  id: string;
  fileName: string;
  status: FileStatus;
  errorMessage?: string;
  text?: string;
};

/**
 * Props for the UploadFile component.
 */
interface UploadFileProps {
  /**
   * Optional callback function that receives the current file items whenever they change.
   * Useful for parent components to track file upload status.
   */
  onFilesChange?: (fileItems: FileItem[]) => void;
}

/**
 * Screen component for testing file input.
 * Displays a single input field for testing purposes.
 */
export default function TestFileInputScreen({ onFilesChange }: UploadFileProps) {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  // Ref to the file input element, used to reset its value after file selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Effect hook that calls the onFilesChange callback whenever fileItems changes.
   * Allows parent components to track file upload status.
   */
  useEffect(() => {
    if (onFilesChange) {
      onFilesChange(fileItems);
    }
  }, [fileItems, onFilesChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to array
    const newFiles = Array.from(files);
    
    // Filter out files that already exist (by name) in the current fileItems
    // Use functional update to get current state, filter duplicates, and update state
    let uniqueNewFiles: File[] = [];
    let initialFileItems: FileItem[] = [];
    
    setFileItems((prev) => {
      const existingFileNames = new Set(prev.map((item) => item.fileName));
      // Filter to only include files that don't have duplicate names
      uniqueNewFiles = newFiles.filter((file) => !existingFileNames.has(file.name));
      
      // If no unique files, return previous state unchanged
      if (uniqueNewFiles.length === 0) {
        return prev;
      }
      
      // Initialize unique files with "loading" status
      initialFileItems = uniqueNewFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        fileName: file.name,
        status: "loading" as FileStatus,
        errorMessage: undefined,
      }));
      
      return [...prev, ...initialFileItems];
    });
    
    // If no unique files were found, reset input and return early
    if (uniqueNewFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    
    // Process each unique file individually and update status as each completes
    // Store the fileItemId for each file before async processing
    uniqueNewFiles.forEach(async (file, index) => {
      const fileItemId = initialFileItems[index].id;
      
      try {
        console.log(file);
        console.log(file.type);
        // Wrap parseFile in try-catch to handle errors
        const text = await parseFile(file);
        
        // Update status to success if text was extracted
        setFileItems((current) => {
          const updated = [...current];
          const fileIndex = updated.findIndex((item) => item.id === fileItemId);
          if (fileIndex !== -1) {
            if (text !== null && text !== undefined) {
              updated[fileIndex].status = "success";
              updated[fileIndex].text = text;
            } else {
              // Null or undefined text is treated as an error
              updated[fileIndex].status = "error";
              updated[fileIndex].errorMessage = "Unable to extract text from the document";
            }
          }
          return updated;
        });
      } catch (error) {
        // Handle any errors (including timeouts) by showing error status
        console.error(`Error parsing file ${file.name}:`, error);
        
        // Determine error message based on error type
        let errorMessage: string;
        if (error instanceof Error && error.message.includes("10MB")) {
          // File size error
          errorMessage = "File must be 10MB or less";
        } else {
          // General parsing error
          errorMessage = "Unable to extract text from the document";
        }
        
        setFileItems((current) => {
          const updated = [...current];
          const fileIndex = updated.findIndex((item) => item.id === fileItemId);
          if (fileIndex !== -1) {
            updated[fileIndex].status = "error";
            updated[fileIndex].errorMessage = errorMessage;
          }
          return updated;
        });
      }
    });

    
    // Reset the input value so the same file can be selected again
    // This ensures onChange fires even if the user selects the same file after deleting it
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Handles deletion of a file item from the list.
   * @param fileId The unique identifier of the file to delete
   */
  const handleDeleteFile = (fileId: string) => {
    setFileItems((prev) => {
      const updated = prev.filter((item) => item.id !== fileId);
      return updated;
    });
  };

  return (
    <div className="upload-file-input-container">
      <div className="upload-file-input-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          accept={supportedFileTypes}
          onChange={handleFileChange}
          multiple={true}
          className="upload-file-input"
        />
        <p className="file-size-note">Uploaded files must be under 10MB each</p>
        
        {fileItems.length > 0 && (
          <ul className="file-list">
            {fileItems.map((item) => (
              <li key={item.id} className="file-item">
                {item.status === "success" && (
                  <span className="status-icon success-icon">✓</span>
                )}
                {item.status === "error" && (
                  <span className="status-icon error-icon">!</span>
                )}
                <div className="file-info">
                  <span className="file-name">{item.fileName}</span>
                  {item.status === "error" && item.errorMessage && (
                    <span className="error-message">{item.errorMessage}</span>
                  )}
                </div>
                {item.status === "loading" && (
                  <span className="loading-text">loading...</span>
                )}
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDeleteFile(item.id)}
                  aria-label={`Delete ${item.fileName}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

