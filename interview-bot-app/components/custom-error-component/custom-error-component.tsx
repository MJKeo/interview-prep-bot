import "./custom-error-component.css";
import { CustomError } from "@/types";

/**
 * Props for the CustomErrorComponent.
 */
interface CustomErrorComponentProps {
  /**
   * The custom error object containing the error message and optional retry action.
   */
  customError: CustomError;
}

/**
 * Component for displaying error messages with optional retry functionality.
 * 
 * Displays a card-style error message with a border and low opacity background.
 * If a retry action is provided, shows a retry button with a circular arrow icon.
 * 
 * @param customError - The custom error object containing the message and optional retry action
 * @returns A styled error card component
 */
export default function CustomErrorComponent({ customError }: CustomErrorComponentProps) {
  /**
   * Handles the retry button click by calling the retry action if it exists.
   */
  const handleRetry = () => {
    if (customError.retryAction) {
      customError.retryAction();
    }
  };

  return (
    <div className="custom-error-component">
      <div className="custom-error-component__content">
        <span className="custom-error-component__message">{customError.message}</span>
        {customError.retryAction && (
          <button
            type="button"
            className="custom-error-component__retry-button"
            onClick={handleRetry}
            aria-label="Retry"
            title="Retry"
          >
            <svg
              className="custom-error-component__retry-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

