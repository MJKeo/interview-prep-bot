import "./button.css";

/**
 * Props for the Button component.
 */
interface ButtonProps {
  /**
   * The text content to display inside the button.
   */
  children: React.ReactNode;
  /**
   * The type of button (button, submit, reset).
   * Defaults to "button".
   */
  type?: "button" | "submit" | "reset";
  /**
   * Optional click handler function.
   */
  onClick?: () => void;
  /**
   * Whether the button is disabled.
   * Defaults to false.
   */
  disabled?: boolean;
  /**
   * Optional additional CSS classes to apply.
   */
  className?: string;
}

/**
 * Generic button component with consistent styling.
 * 
 * Provides a reusable button with default styling that can be customized
 * through props. Supports click handlers, disabled state, and custom classes.
 * 
 * @param children - The content to display inside the button
 * @param type - The button type (button, submit, reset)
 * @param onClick - Optional click handler function
 * @param disabled - Whether the button is disabled
 * @param className - Optional additional CSS classes
 * @returns A styled button element
 */
export default function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
  className = "",
}: ButtonProps) {
  // Combine default button class with any additional classes
  const combinedClassName = `button ${className}`.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
    >
      {children}
    </button>
  );
}

