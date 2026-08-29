/** Anillo circular con aspecto 3D (degradado + brillo) para métricas. */
export function Gauge({
  value,
  color = "#10b981",
  label,
  center,
  sub,
  size = 96,
}: {
  /** 0 a 1 */
  value: number;
  color?: string;
  label: string;
  center: string;
  sub?: string;
  size?: number;
}) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const stroke = Math.round(size * 0.11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `${label.replace(/\W/g, "")}-${Math.round(v * 1000)}`;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.55" />
              <stop offset="55%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.85" />
            </linearGradient>
            <filter id={`s-${id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={color} floodOpacity="0.45" />
            </filter>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-secondary" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#g-${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * v} ${c}`}
            filter={`url(#s-${id})`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r + stroke / 2 - 1}
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth={1}
            strokeDasharray={`${c * v} ${c}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display leading-none" style={{ fontSize: size * 0.26 }}>{center}</span>
          {sub && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{sub}</span>}
        </div>
      </div>
      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider leading-tight max-w-[92px]">{label}</span>
    </div>
  );
}
