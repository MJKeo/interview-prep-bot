"use client";

import "./attach-files.css";
import { useState, useEffect, useRef } from "react";
import { parseFile, supportedFileTypes } from "@/utils/file-parser";
import { FileStatus, type FileItem, type UploadedFileItem } from "@/types";
import AttachedFileItem from "@/components/attached-file-item";
import SavedFileItem from "@/components/saved-file-item";
import { fetchAllSavedFiles, saveUploadedFile, deleteSavedFileItem } from "@/utils/local-database";

/**
 * Component for attaching files with options to upload new files or choose existing ones.
 * Displays a vertical stack with a file input and a label for existing files.
 */
export default function AttachFiles() {
    const [uploadedFileItems, setUploadedFileItems] = useState<FileItem[]>([]);
    const [savedFileItems, setSavedFileItems] = useState<FileItem[]>([]);

    useEffect(() => {
        const fetchSavedFileItems = async () => {
            try {
                const savedFileItems = await fetchAllSavedFiles();
                console.log("Saved file items:", savedFileItems);
                setSavedFileItems(savedFileItems);
            } catch (error) {
                console.error("Error fetching saved file items:", error);
            }
        }
        fetchSavedFileItems();
    }, []);

    const saveFileItem = async (fileItem: FileItem) => {
        try {
            await saveUploadedFile(fileItem);
        } catch (error) {
            console.error("Error saving file item:", error);
        }
    }

    const uniqueNewFiles = (newFiles: File[]) => {
        // Create a set of all file names from both uploadedFileItems and savedFileItems
        const existingFileNames = new Set([
            ...uploadedFileItems.map((item) => item.fileName),
            ...savedFileItems.map((item) => item.fileName),
        ]);
        return newFiles.filter((file) => !existingFileNames.has(file.name));
    }

    const parseNewFileItems = async (uniqueNewFileItems: UploadedFileItem[]) => {
        // Process each unique file individually and update status as each completes
        // Store the fileItemId for each file before async processing
        uniqueNewFileItems.forEach(async (fileItem) => {
            // Wrap parseFile in try-catch to handle errors
            try {
                const text = await parseFile(fileItem.originalFile);
                console.log(`Fetching for ${fileItem.fileName}`);
                
                // Update status to success if text was extracted
                setUploadedFileItems((current) => {
                    const updated = [...current];
                    const fileIndex = updated.findIndex((item) => item.id === fileItem.id);
                    if (fileIndex !== -1) {
                        if (text) {
                            console.log(`${fileItem.fileName} SUCCESS`);
                            updated[fileIndex].status = FileStatus.SUCCESS;
                            updated[fileIndex].text = text;
                            saveFileItem(updated[fileIndex]);
                        } else {
                            // Null or undefined text is treated as an error
                            console.log(`${fileItem.fileName} FAIL`);
                            updated[fileIndex].status = FileStatus.ERROR;
                            updated[fileIndex].errorMessage = "Unable to extract text from the document";
                        }
                    }
                    return updated;
                });
            } catch (error) {
                // Determine error message based on error type
                console.log("ERROR:", error);
                let errorMessage: string;
                if (error instanceof Error && error.message.includes("10MB")) {
                    // File size error
                    errorMessage = "File must be 10MB or less";
                } else {
                    // General parsing error
                    errorMessage = "Unable to extract text from the document";
                }
                
                setUploadedFileItems((current) => {
                    const updated = [...current];
                    const fileIndex = updated.findIndex((item) => item.id === fileItem.id);
                    if (fileIndex !== -1) {
                        updated[fileIndex].status = FileStatus.ERROR;
                        updated[fileIndex].errorMessage = errorMessage;
                    }
                    return updated;
                });
            }
        });
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Convert FileList to array
        let uniqueNewFileItems: UploadedFileItem[] = [];

        setUploadedFileItems((prev) => {
            // Use only files that haven't already been attached
            const newFiles = uniqueNewFiles(Array.from(files));

            // Initialize new file items as "loading" (we'll initiate their parsing later)
            uniqueNewFileItems = newFiles.map((file) => ({
                id: `${file.name}-${Date.now()}`,
                originalFile: file,
                fileName: file.name,
                status: FileStatus.LOADING,
                errorMessage: undefined,
              }));

            return [...prev, ...uniqueNewFileItems];
        });

        // No new files? No need to run the rest of the code
        if (uniqueNewFileItems.length === 0) return;

        parseNewFileItems(uniqueNewFileItems);
    }

    /**
     * Handles deletion of a file item from the list.
     * @param fileItem The file item to delete
     */
    const handleDeleteFile = async (fileItem: FileItem) => {
        try {
            await deleteSavedFileItem(fileItem);
            setSavedFileItems((prev) => {
                return prev.filter((item) => item.id !== fileItem.id);
            });
            setUploadedFileItems((prev) => {
                return prev.filter((item) => item.id !== fileItem.id);
            });
        } catch (error) {
            console.error("Error deleting saved file item:", error);
        }
    }

    /**
     * Handles attaching a saved file item by adding it to the uploaded files list.
     * Finds the file item in savedFileItems and adds it to uploadedFileItems with SAVED status.
     * @param fileItem The file item to attach
     */
    const handleAttachSavedFileItem = (fileItem: FileItem) => {
        // Find the file item in savedFileItems to ensure it exists
        const foundItem = savedFileItems.find((item) => item.id === fileItem.id);
        if (!foundItem) {
            console.warn("File item not found in savedFileItems:", fileItem);
            return;
        }

        // Remove the file from savedFileItems
        setSavedFileItems((prev) => prev.filter((item) => item.id !== fileItem.id));

        // Add the file item to uploadedFileItems with SAVED status
        // This will cause it to render in the attached section with isAttached={true}
        setUploadedFileItems((prev) => {
            const alreadyExists = prev.some((item) => item.id === fileItem.id);
            if (alreadyExists) {
                return prev;
            }
            // Add the file item back to savedFileItems
            // Use the found item but ensure it has the proper structure for a saved file
            return [
                ...prev, foundItem
            ];
        });
    }

    /**
     * Handles removing a saved file item from attachments.
     * Removes the file from uploadedFileItems and ensures it exists in savedFileItems.
     * @param fileItem The file item to remove from attachments
     */
    const handleRemoveSavedFileItemFromAttached = (fileItem: FileItem) => {
        // Find the file item in uploadedFileItems to ensure it exists
        const foundItem = uploadedFileItems.find((item) => item.id === fileItem.id);
        if (!foundItem) {
            console.warn("File item not found in uploadedFileItems:", fileItem);
            return;
        }

        // Remove the file from uploadedFileItems
        setUploadedFileItems((prev) => prev.filter((item) => item.id !== fileItem.id));

        // Add the file back to savedFileItems if it's not already there
        setSavedFileItems((prev) => {
            const alreadyExists = prev.some((item) => item.id === fileItem.id);
            if (alreadyExists) {
                return prev;
            }
            // Add the file item back to savedFileItems
            // Use the found item but ensure it has the proper structure for a saved file
            return [
                ...prev, foundItem
            ];
        });
    }

    return (
        <div className="attach-file-container">
        <div className="attach-file-stack">
            {/* List of attached files */}
            {uploadedFileItems.map((item) => (
                item.status === FileStatus.SAVED ? (
                    <SavedFileItem
                        key={item.id}
                        fileItem={item}
                        isAttached={true}
                        attachSavedFileItem={handleAttachSavedFileItem}
                        removeSavedFileItemFromAttached={handleRemoveSavedFileItemFromAttached}
                        deleteSavedFileItem={() => handleDeleteFile(item)}
                    />
                ) : (
                    <AttachedFileItem
                        key={item.id}
                        fileItem={item}
                        deleteFileItem={() => handleDeleteFile(item)}
                    />
                )
            ))}
            {/* File input component for uploading new files */}
            <label className="attach-file-input-label">
            <input
                className="attach-file-input"
                type="file"
                accept={supportedFileTypes}
                onChange={handleFileChange}
                multiple={true}
                aria-label="Upload a new file"
            />
            <span className="attach-file-input-text">Upload a new file</span>
            </label>
            <p className="file-size-note">Note: Uploaded files must be under 10MB each</p>
            
            {/* Label for choosing existing files */}
            {savedFileItems.length > 0 && <p className="attach-file-existing-label">
            Or choose one of your existing files
            </p>}
            {/* List of saved files */}
            {savedFileItems.map((item) => (
                <SavedFileItem
                    key={item.id}
                    fileItem={item}
                    isAttached={false}
                    attachSavedFileItem={handleAttachSavedFileItem}
                    removeSavedFileItemFromAttached={handleRemoveSavedFileItemFromAttached}
                    deleteSavedFileItem={() => handleDeleteFile(item)}
                />
            ))}
        </div>
        </div>
    );
}
