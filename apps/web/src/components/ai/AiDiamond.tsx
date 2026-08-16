/** The assistant's mark: the frame's diamond, tracing its own edge while it thinks. */
export function AiDiamond({
  size = 16,
  busy = false,
  className,
}: {
  size?: number;
  busy?: boolean;
  className?: string;
}) {
  const half = size / 2;
  const edge = (scale: number) => {
    const inset = half * (1 - scale) + scale;
    const far = size - inset;
    return `M ${half} ${inset} L ${far} ${half} L ${half} ${far} L ${inset} ${half} Z`;
  };

  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      className={`block ${className ?? ""}`}
    >
      <path
        d={edge(1)}
        fill="none"
        stroke="currentColor"
        strokeOpacity={busy ? 0.25 : 0.8}
      />
      <path d={edge(0.35)} fill="currentColor" fillOpacity={busy ? 0.4 : 0.8} />
      {busy && (
        <path
          d={edge(1)}
          pathLength={100}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="26 74"
          style={{
            ["--trace" as string]: "100px",
            animation: "diamond-trace 700ms linear infinite",
          }}
        />
      )}
    </svg>
  );
}
