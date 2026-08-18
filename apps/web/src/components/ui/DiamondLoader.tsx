const TRACE_MS = 700;
const APPEAR_MS = 140;

export function DiamondLoader({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const half = size / 2;
  const diamond = `M ${half} 1 L ${size - 1} ${half} L ${half} ${size - 1} L 1 ${half} Z`;

  return (
    <span
      role="status"
      className={className}
      style={{ animation: `loader-appear ${APPEAR_MS}ms ease both` }}
    >
      <svg width={size} height={size} aria-hidden className="block">
        <path
          d={diamond}
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity={0.2}
        />
        <path
          d={diamond}
          pathLength={100}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="26 74"
          style={{
            ["--trace" as string]: "100px",
            animation: `diamond-trace ${TRACE_MS}ms linear infinite`,
          }}
        />
      </svg>
      <span className="sr-only">Loading</span>
    </span>
  );
}
