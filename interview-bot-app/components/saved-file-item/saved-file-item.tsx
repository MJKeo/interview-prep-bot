import "./saved-file-item.css";
import { type FileItem } from "@/types";

/**
 * Props for the SavedFileItem component.
 */
interface SavedFileItemProps {
  /**
   * The saved file item to display.
   */
  fileItem: FileItem;
  /**
   * Whether the file is currently attached.
   */
  isAttached: boolean;
  /**
   * Callback function to attach the saved file item.
   * Takes the FileItem instance as its only parameter.
   */
  attachSavedFileItem: (item: FileItem) => void;
  /**
   * Callback function to remove the saved file item from attachments.
   * Takes the FileItem instance as its only parameter.
   */
  removeSavedFileItemFromAttached: (item: FileItem) => void;
  /**
   * Callback function to delete the saved file item.
   * Takes the FileItem instance as its only parameter.
   */
  deleteSavedFileItem: (item: FileItem) => void;
}

/**
 * Component for displaying a single saved file item.
 * Shows file name with action buttons for attaching, removing, and deleting.
 * 
 * Button visibility:
 * - "+" button: Visible when file is not attached, adds file to attachments
 * - "-" button: Visible when file is attached, removes file from attachments
 * - "×" button: Always visible, deletes the file
 * 
 * @param fileItem - The saved file item to display
 * @param isAttached - Whether the file is currently attached
 * @param attachSavedFileItem - Function to call when attach button is clicked
 * @param removeSavedFileItemFromAttached - Function to call when remove button is clicked
 * @param deleteSavedFileItem - Function to call when delete button is clicked
 * @returns A styled saved file item component
 */
export default function SavedFileItem({
  fileItem,
  isAttached,
  attachSavedFileItem,
  removeSavedFileItemFromAttached,
  deleteSavedFileItem,
}: SavedFileItemProps) {
  return (
    <div className="saved-file-item">
      {/* File information - displays file name */}
      <div className="file-info">
        <span className="file-name">{fileItem.fileName}</span>
      </div>

      {/* Action buttons - attach/remove and delete */}
      <div className="action-buttons">
        {/* Attach button - visible when file is not attached */}
        {!isAttached && (
          <button
            type="button"
            className="attach-button"
            onClick={() => attachSavedFileItem(fileItem)}
            title="Add to attachments"
            aria-label={`Add ${fileItem.fileName} to attachments`}
          >
            +
          </button>
        )}

        {/* Remove button - visible when file is attached */}
        {isAttached && (
          <button
            type="button"
            className="remove-button"
            onClick={() => removeSavedFileItemFromAttached(fileItem)}
            title="Remove from attachments"
            aria-label={`Remove ${fileItem.fileName} from attachments`}
          >
            −
          </button>
        )}

        {/* Delete button - always visible */}
        <button
          type="button"
          className="delete-button"
          onClick={() => deleteSavedFileItem(fileItem)}
          title="Delete file"
          aria-label={`Delete ${fileItem.fileName}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

