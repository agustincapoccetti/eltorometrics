import logo from "@/assets/logo.png";

export function Logo({
  size = 52,
  withText = true,
  className = "",
}: {
  size?: number;
  withText?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex flex-col items-center gap-0.5 leading-none ${className}`}>
      <img
        src={logo}
        alt="El Toro Rugby Club Calvià"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain drop-shadow-sm"
      />
      {withText && (
        <span className="font-display text-[10px] sm:text-[11px] tracking-[0.18em] whitespace-nowrap">
          EL TORO RUGBY
        </span>
      )}
    </div>
  );
}
