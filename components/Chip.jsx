export default function Chip({ active = false, onClick, children, tone, type = "button" }) {
  return (
    <button
      type={type}
      className={`chip ${active ? "chip-on" : ""} ${tone === "warn" && active ? "chip-warn" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
