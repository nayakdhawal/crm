// A square that morphs into a circle and turns, with an optional message underneath.
// Usage: <MorphingSquare message="Loading..." />
//        <MorphingSquare message="Saving..." color="#15803D" size={32} />
// Colour defaults to the app's accent colour (--accent in globals.css).

export function MorphingSquare({ message, color = "var(--accent)", size = 40, className = "" }) {
  return (
    <div
      className={`morphing-square ${className}`.trim()}
      role="status"
      aria-live="polite"
      style={{ "--morph-color": color, "--morph-size": `${size}px` }}
    >
      <span className="morphing-square-shape" aria-hidden="true" />
      {message && <span className="morphing-square-message">{message}</span>}
    </div>
  );
}
