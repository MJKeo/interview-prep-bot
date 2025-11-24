import "./attached-file-item.css";
import { type FileItem } from "@/types";
import { FileStatus } from "@/types";

/**
 * Props for the AttachedFileItem component.
 */
interface AttachedFileItemProps {
  /**
   * The file item to display.
   */
  fileItem: FileItem;
  /**
   * Callback function to delete the file item.
   * Takes the FileItem instance as its only parameter.
   */
  deleteFileItem: (item: FileItem) => void;
  /**
   * Optional callback to detach the file (move to saved files).
   * If provided, a "-" button will be shown.
   */
  detachFileItem?: (item: FileItem) => void;
}

/**
 * Component for displaying a single attached file item.
 * Shows status indicator, file name, optional error message, and delete/detach buttons.
 * 
 * Status indicators:
 * - Success: Green circular badge with checkmark
 * - Error: Red circular badge with exclamation point
 * - Loading: Spinning circular animation
 * 
 * @param fileItem - The file item to display
 * @param deleteFileItem - Function to call when delete button is clicked
 * @param detachFileItem - Optional function to call when detach button is clicked
 * @returns A styled file item component
 */
export default function AttachedFileItem({
  fileItem,
  deleteFileItem,
  detachFileItem,
}: AttachedFileItemProps) {
  return (
    <div className="attached-file-item">
      {/* Status indicator - shows different icons based on status */}
      {fileItem.status === FileStatus.SUCCESS && (
        <span className="status-icon success-icon">✓</span>
      )}
      {fileItem.status === FileStatus.ERROR && (
        <span className="status-icon error-icon">!</span>
      )}
      {fileItem.status === FileStatus.LOADING && (
        <span className="status-icon loading-spinner"></span>
      )}

      {/* File information - vertical stack of file name and error message */}
      <div className="file-info">
        <span className="file-name">{fileItem.fileName}</span>
        {fileItem.errorMessage && (
          <span className="error-message">{fileItem.errorMessage}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        {/* Detach button - visible if detachFileItem is provided */}
        {detachFileItem && (
          <button
            type="button"
            className="remove-button"
            onClick={() => detachFileItem(fileItem)}
            title="Remove from attachments"
            aria-label={`Detach ${fileItem.fileName}`}
          >
            −
          </button>
        )}

        {/* Delete button - calls deleteFileItem when clicked */}
        <button
          type="button"
          className="delete-button"
          onClick={() => deleteFileItem(fileItem)}
          aria-label={`Delete ${fileItem.fileName}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
