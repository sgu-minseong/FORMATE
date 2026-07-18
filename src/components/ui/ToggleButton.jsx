import Button from "./Button.jsx";

export default function ToggleButton({
  pressed = false,
  variant = "secondary",
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant}
      className={`ui-toggle-button ${className}`.trim()}
      aria-pressed={pressed}
      {...props}
    />
  );
}
