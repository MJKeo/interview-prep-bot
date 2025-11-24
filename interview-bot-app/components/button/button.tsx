import "./button.css";
import { ButtonType } from "@/types";

/**
 * Props for the Button component.
 */
interface ButtonProps {
  /**
   * The text content to display inside the button.
   */
  children: React.ReactNode;
  /**
   * The HTML type of button (button, submit, reset).
   * Defaults to "button".
   */
  htmlType?: "button" | "submit" | "reset";
  /**
   * The visual variant type of the button (primary or secondary).
   * Defaults to "primary".
   */
  type?: ButtonType;
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
  /**
   * Optional tooltip text to display when hovering over the button.
   */
  tooltip?: string;
}

/**
 * Generic button component with consistent styling.
 * 
 * Provides a reusable button with default styling that can be customized
 * through props. Supports click handlers, disabled state, and custom classes.
 * Supports primary and secondary visual variants.
 * 
 * @param children - The content to display inside the button
 * @param htmlType - The HTML button type (button, submit, reset)
 * @param type - The visual variant type (primary or secondary)
 * @param onClick - Optional click handler function
 * @param disabled - Whether the button is disabled
 * @param className - Optional additional CSS classes
 * @param tooltip - Optional tooltip text to display when hovering over the button
 * @returns A styled button element
 */
export default function Button({
  children,
  htmlType = "button",
  type = ButtonType.PRIMARY,
  onClick,
  disabled = false,
  className = "",
  tooltip,
}: ButtonProps) {
  // Combine default button class with variant class and any additional classes
  const variantClass = type === ButtonType.PRIMARY ? "button--primary" : "button--secondary";
  const combinedClassName = `button ${variantClass} ${className}`.trim();

  return (
    <button
      type={htmlType}
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
      title={tooltip}
    >
      {children}
    </button>
  );
}

