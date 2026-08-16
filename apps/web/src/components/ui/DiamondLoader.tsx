const TRACE_MS = 700;
const APPEAR_MS = 140;

/** Work that finishes inside this window never shows a loader at all. */
export const LOADER_GRACE_MS = 130;

/**
 * The frame's diamond with an arc running its outline. A stroke on the path
 * rather than a shape travelling along it, so it turns the corners exactly
 * instead of cutting them.
 *
 * Mounted only once the grace window is spent, so it fades in on sight; the
 * caller owns the wait.
 */
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
        {/* pathLength normalises the perimeter to 100, so one dash pattern and
            one keyframe offset hold at any size. */}
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
