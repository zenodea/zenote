// Every inline SVG icon in the app, one consistent 16-grid stroke style.

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

/** A list whose bullets are the frame's diamonds: the vault's conversations. */
export function HistoryIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M3.5 1.9 5.1 3.5 3.5 5.1 1.9 3.5Z" />
      <path d="M3.5 6.4 5.1 8 3.5 9.6 1.9 8Z" />
      <path d="M3.5 10.9 5.1 12.5 3.5 14.1 1.9 12.5Z" />
      <path d="M7.5 3.5H14M7.5 8H14M7.5 12.5H14" />
    </svg>
  );
}

export function EllipsisIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="block"
    >
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.5 3.5" />
    </svg>
  );
}

export function SlidersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <path d="M2 3.5h12M2 8h12M2 12.5h12" />
      <circle cx="10.5" cy="3.5" r="1.75" fill="var(--background)" />
      <circle cx="5.5" cy="8" r="1.75" fill="var(--background)" />
      <circle cx="10.5" cy="12.5" r="1.75" fill="var(--background)" />
    </svg>
  );
}

export function GraphIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <path d="M4 4 12 5.5 6.5 12 4 4" />
      <circle cx="4" cy="4" r="1.75" fill="var(--background)" />
      <circle cx="12" cy="5.5" r="1.75" fill="var(--background)" />
      <circle cx="6.5" cy="12" r="1.75" fill="var(--background)" />
    </svg>
  );
}

export function FilePlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5l-4-4Z" />
      <path d="M9 1.5V5.5h4M8 8v4M6 10h4" />
    </svg>
  );
}

export function FolderPlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 2h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-9Z" />
      <path d="M8 7.5v4M6 9.5h4" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M11.5 2 14 4.5 5.5 13 2 14l1-3.5L11.5 2Z" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M8 13.5v-11M3.5 7 8 2.5 12.5 7" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M8 1.5 9.7 6.3 14.5 8 9.7 9.7 8 14.5 6.3 9.7 1.5 8 6.3 6.3Z" />
    </svg>
  );
}

/** Three text lines with the accent slash through them; the drawing fills the middle 60% of `size`. */
export function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <path
        d="M16 16h32M16 32h22M16 48h32"
        stroke="var(--foreground)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M51 13 13 51"
        stroke="var(--accent)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The monogram is the Z, unchanged; the rest is drawn around it on the same rules, 32 wide on a 48 advance. */
export function LogoWordmark({ height = 28 }: { height?: number }) {
  return (
    <svg
      width={height * (304 / 64)}
      height={height}
      viewBox="0 0 304 64"
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <path
        d={[
          "M16 16h32M16 32h22M16 48h32", // Z, the monogram's own rules
          "M64 16V48M64 16h32M64 32h22M64 48h32", // E
          "M112 16V48M112 16 144 48M144 16V48", // N
          "M208 16h32M224 16V48", // T
          "M256 16V48M256 16h32M256 32h22M256 48h32", // E
        ].join("")}
        stroke="var(--foreground)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* O as the frame's diamond: the one letter no arrangement of rules makes. */}
      <path
        d="M176 16 192 32 176 48 160 32Z"
        stroke="var(--foreground)"
        strokeWidth="6.5"
        strokeLinejoin="round"
      />
      <path
        d="M51 13 13 51"
        stroke="var(--accent)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
