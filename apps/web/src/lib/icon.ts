export function shade(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return hex;

  const target = amount < 0 ? 0 : 255;
  const strength = Math.abs(amount);
  const mixed = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16);
    return Math.round(channel + (target - channel) * strength)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${mixed.join("")}`;
}

export function iconSvg(
  accent: string,
  { radius = 14, inset = 0 }: { radius?: number; inset?: number } = {},
): string {
  const bright = shade(accent, 0.12);
  const deep = shade(accent, -0.28);
  const slash = shade(accent, -0.68);
  const scale = (64 - inset * 2) / 64;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bright}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <path d="M16 16h32M16 32h22M16 48h32" fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M51 13 13 51" stroke="${slash}" stroke-width="6.5" stroke-linecap="round"/>
  </g>
</svg>`;
}
