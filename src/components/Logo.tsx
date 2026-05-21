import logo from "@/assets/logo.png";

export function Logo({ size = 28, withText = true, className = "" }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img src={logo} alt="El Toro Rugby Club Calvià" width={size} height={size} style={{ width: size, height: size }} className="object-contain" />
      {withText && <span className="font-display text-sm tracking-wider">EL TORO · RUGBY</span>}
    </div>
  );
}
