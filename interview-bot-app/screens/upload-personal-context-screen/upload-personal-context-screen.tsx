"use client";

import { useState } from "react";
import "./upload-personal-context-screen.css";
import UploadFile from "@/components/upload-file";
import Button from "@/components/button";

type FileItem = {
  id: string;
  fileName: string;
  status: "loading" | "success" | "error";
  errorMessage?: string;
  text?: string;
};

/**
 * Screen component for uploading personal context files.
 * Displays an UploadFile component for users to upload their personal context documents.
 */
export default function UploadPersonalContextScreen() {
  // State to track if at least one file has been successfully uploaded
  const [hasSuccessfulFiles, setHasSuccessfulFiles] = useState<boolean>(false);
  // State to store all file items with their parsed text content
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  /**
   * Callback function that receives file items from the UploadFile component.
   * Updates the hasSuccessfulFiles state based on whether any files have status "success".
   * Also stores the file items so we can access them when the button is clicked.
   * @param fileItems The current array of file items from the UploadFile component
   */
  const handleFilesChange = (fileItems: FileItem[]) => {
    // Store the file items so we can access them later
    setFileItems(fileItems);
    // Check if at least one file has been successfully parsed
    const hasSuccess = fileItems.some((item) => item.status === "success");
    setHasSuccessfulFiles(hasSuccess);
  };

  /**
   * Handles the "skip" button click.
   * Navigates away or skips the file upload step.
   */
  const handleSkip = () => {
    // TODO: Implement skip functionality
    console.log("Skip clicked");
  };

  /**
   * Handles the "use these files" button click.
   * Logs the name and text of all successfully parsed files to the console.
   */
  const handleUseFiles = () => {
    // Filter to only successfully parsed files
    const successfulFiles = fileItems.filter((item) => item.status === "success");
    
    // Log each file's name and text content
    successfulFiles.forEach((file) => {
      console.log(`File: ${file.fileName}`);
      console.log(`Text: ${file.text || ""}`);
      console.log("---");
    });
  };

  return (
    <div className="upload-personal-context-container">
      <div className="upload-personal-context-content">
        <UploadFile onFilesChange={handleFilesChange} />
        
        <div className="button-group">
          <Button
            type="button"
            onClick={handleSkip}
            className="skip-button"
          >
            skip
          </Button>
          <Button
            type="button"
            onClick={handleUseFiles}
            disabled={!hasSuccessfulFiles || fileItems.some((item) => item.status === "loading")}
          >
            use these files
          </Button>
        </div>
      </div>
    </div>
  );
}

