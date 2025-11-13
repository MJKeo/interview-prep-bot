"use client";

import { useState } from "react";
import "./test-file-input-screen.css";
import { parseFile } from "@/utils/file-parser";
import { supportedFileTypes } from "@/utils/file-parser";

type FileStatus = "loading" | "success" | "error";

type FileItem = {
  id: string;
  fileName: string;
  status: FileStatus;
  errorMessage?: string;
};

/**
 * Screen component for testing file input.
 * Displays a single input field for testing purposes.
 */
export default function TestFileInputScreen() {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to array
    const newFiles = Array.from(files);
    
    // Initialize all files with "loading" status
    const initialFileItems: FileItem[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      status: "loading" as FileStatus,
      errorMessage: undefined,
    }));
    
    setFileItems((prev) => [...prev, ...initialFileItems]);

    // Process each file individually and update status as each completes
    newFiles.forEach(async (file, index) => {
      const fileItemId = initialFileItems[index].id;
      
      try {
        console.log(file);
        console.log(file.type);
        // Wrap parseFile in try-catch to handle errors
        const text = await parseFile(file);
        
        // Update status to success if text was extracted
        setFileItems((prev) => {
          const updated = [...prev];
          const fileIndex = updated.findIndex((item) => item.id === fileItemId);
          if (fileIndex !== -1) {
            if (text !== null && text !== undefined) {
              updated[fileIndex].status = "success";
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
        
        setFileItems((prev) => {
          const updated = [...prev];
          const fileIndex = updated.findIndex((item) => item.id === fileItemId);
          if (fileIndex !== -1) {
            updated[fileIndex].status = "error";
            updated[fileIndex].errorMessage = errorMessage;
          }
          return updated;
        });
      }
    });
  };

  /**
   * Handles deletion of a file item from the list.
   * @param fileId The unique identifier of the file to delete
   */
  const handleDeleteFile = (fileId: string) => {
    setFileItems((prev) => prev.filter((item) => item.id !== fileId));
  };

  return (
    <div className="test-file-input-container">
      <div className="test-file-input-wrapper">
        <input
          type="file"
          accept={supportedFileTypes}
          onChange={handleFileChange}
          multiple={true}
          className="test-file-input"
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

