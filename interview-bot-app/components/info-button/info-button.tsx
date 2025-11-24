import "./info-button.css";

/**
 * Props for the InfoButton component.
 */
interface InfoButtonProps {
  /**
   * Optional click handler.
   */
  onClick?: () => void;
  /**
   * Optional tooltip text (for title attribute).
   */
  tooltip?: string;
}

/**
 * A small circular button with a question mark, used for help/info tooltips.
 */
export default function InfoButton({ onClick, tooltip = "More information" }: InfoButtonProps) {
  return (
    <button
      type="button"
      className="info-button"
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
    >
      ?
    </button>
  );
}

