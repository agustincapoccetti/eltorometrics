import { cn } from "@/lib/utils";

interface Props {
  fullscreen?: boolean;
  label?: string;
  size?: number;
  className?: string;
}

export function RugbyLoader({ fullscreen, label = "Cargando...", size = 56, className }: Props) {
  const ball = (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        width={size}
        height={size * 0.62}
        viewBox="0 0 100 62"
        className="animate-rugby-bounce"
        aria-hidden
      >
        <g className="animate-rugby-spin origin-center" style={{ transformOrigin: "50px 31px" }}>
          <ellipse cx="50" cy="31" rx="46" ry="26" fill="#8b4513" stroke="#000" strokeWidth="2" />
          <path d="M 12 31 Q 50 18 88 31" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M 12 31 Q 50 44 88 31" stroke="#fff" strokeWidth="2" fill="none" />
          <line x1="34" y1="28" x2="34" y2="34" stroke="#fff" strokeWidth="2" />
          <line x1="42" y1="28" x2="42" y2="34" stroke="#fff" strokeWidth="2" />
          <line x1="50" y1="28" x2="50" y2="34" stroke="#fff" strokeWidth="2" />
          <line x1="58" y1="28" x2="58" y2="34" stroke="#fff" strokeWidth="2" />
          <line x1="66" y1="28" x2="66" y2="34" stroke="#fff" strokeWidth="2" />
        </g>
      </svg>
      {label && <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{label}</p>}
    </div>
  );
  if (fullscreen) {
    return <div className="min-h-[60vh] flex items-center justify-center">{ball}</div>;
  }
  return ball;
}
