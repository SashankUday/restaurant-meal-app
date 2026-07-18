export default function PlateScore({ score = 0, size = 56 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const boundedScore = Math.max(0, Math.min(10, Number(score) || 0));
  const filled = circumference * (boundedScore / 10);

  return (
    <div className="plate-score" style={{ width: size, height: size }} aria-label={`Rated ${boundedScore.toFixed(1)} out of 10`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="#fff" stroke="var(--rim)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="plate-score-num" style={{ fontSize: size * 0.3 }}>{boundedScore.toFixed(1)}</span>
    </div>
  );
}
