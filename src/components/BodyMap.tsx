// Silueta de zonas de dolor con intensidad por frecuencia
// Consume un arreglo de strings (motivos/descripciones de dolor) y pinta rojo
// más intenso donde hay más ocurrencias.

type ZoneId =
  | "head"
  | "neck"
  | "shoulderL"
  | "shoulderR"
  | "chest"
  | "abs"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "handL"
  | "handR"
  | "hip"
  | "quadL"
  | "quadR"
  | "adductor"
  | "kneeL"
  | "kneeR"
  | "shinL"
  | "shinR"
  | "ankleL"
  | "ankleR"
  | "upperBack"
  | "lowerBack"
  | "hamL"
  | "hamR"
  | "calfL"
  | "calfR";

function classify(text: string): ZoneId[] {
  const s = text.toLowerCase();
  const hits: ZoneId[] = [];
  if (/cabeza|conmoc|cara|nariz/.test(s)) hits.push("head");
  if (/cervical|cuello/.test(s)) hits.push("neck");
  if (/hombro|manguito|ac\b/.test(s)) hits.push("shoulderL", "shoulderR");
  if (/costilla|t[oó]rax|pectoral/.test(s)) hits.push("chest");
  if (/abdom/.test(s)) hits.push("abs");
  if (/codo/.test(s)) hits.push("elbowL", "elbowR");
  if (/mu[ñn]eca/.test(s)) hits.push("wristL", "wristR");
  if (/mano|dedos/.test(s)) hits.push("handL", "handR");
  if (/psoas|cadera/.test(s)) hits.push("hip");
  if (/cu[aá]driceps|quad/.test(s)) hits.push("quadL", "quadR");
  if (/aductor/.test(s)) hits.push("adductor");
  if (/rodilla/.test(s)) hits.push("kneeL", "kneeR");
  if (/tibia|espinilla/.test(s)) hits.push("shinL", "shinR");
  if (/tobillo/.test(s)) hits.push("ankleL", "ankleR");
  if (/dorsal|trapecio|espalda alta/.test(s)) hits.push("upperBack");
  if (/lumbar|espalda baja|espalda\b/.test(s)) hits.push("lowerBack");
  if (/isquio/.test(s)) hits.push("hamL", "hamR");
  if (/gemel|s[oó]leo|pantorrilla/.test(s)) hits.push("calfL", "calfR");
  return hits;
}

function tallyZones(entries: string[]): Record<ZoneId, number> {
  const counts = {} as Record<ZoneId, number>;
  entries.forEach((e) => classify(e).forEach((z) => { counts[z] = (counts[z] ?? 0) + 1; }));
  return counts;
}

export function BodyMap({
  entries,
  title = "Mapa de dolor",
}: {
  entries: string[];
  title?: string;
}) {
  const counts = tallyZones(entries);
  const max = Math.max(1, ...Object.values(counts));
  const fill = (id: ZoneId) => {
    const c = counts[id] ?? 0;
    if (!c) return "rgba(0,0,0,0.04)";
    const t = 0.22 + (c / max) * 0.75;
    return `rgba(220,38,38,${t})`;
  };
  const stroke = (id: ZoneId) => (counts[id] ? "rgba(127,29,29,0.9)" : "rgba(0,0,0,0.35)");

  return (
    <div className="border border-border p-4 sm:p-6 mb-4">
      <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-base sm:text-lg">{title}</h3>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {entries.length} registro{entries.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-6 max-w-md mx-auto">
        {/* FRENTE */}
        <div>
          <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Frente
          </p>
          <svg viewBox="0 0 200 420" className="w-full h-auto">
            {/* cuerpo silueta gris de referencia */}
            <g fill="#f4f4f5" stroke="#9ca3af" strokeWidth="1">
              <ellipse cx="100" cy="34" rx="22" ry="26" />
              <rect x="88" y="58" width="24" height="18" rx="6" />
              <path d="M60 82 Q100 72 140 82 L150 200 Q100 214 50 200 Z" />
              <path d="M55 86 L36 200 L28 220 L36 224 L46 210 L64 106 Z" />
              <path d="M145 86 L164 200 L172 220 L164 224 L154 210 L136 106 Z" />
              <ellipse cx="28" cy="230" rx="10" ry="8" />
              <ellipse cx="172" cy="230" rx="10" ry="8" />
              <path d="M60 200 L58 320 L82 320 L92 210 Z" />
              <path d="M140 200 L142 320 L118 320 L108 210 Z" />
              <path d="M58 320 L54 400 L80 400 L82 320 Z" />
              <path d="M142 320 L146 400 L120 400 L118 320 Z" />
              <ellipse cx="67" cy="405" rx="16" ry="8" />
              <ellipse cx="133" cy="405" rx="16" ry="8" />
            </g>
            {/* zonas coloreables */}
            <g strokeWidth="1.2">
              <ellipse cx="100" cy="34" rx="22" ry="26" fill={fill("head")} stroke={stroke("head")} />
              <rect x="88" y="58" width="24" height="18" rx="6" fill={fill("neck")} stroke={stroke("neck")} />
              <ellipse cx="66" cy="92" rx="16" ry="12" fill={fill("shoulderL")} stroke={stroke("shoulderL")} />
              <ellipse cx="134" cy="92" rx="16" ry="12" fill={fill("shoulderR")} stroke={stroke("shoulderR")} />
              <rect x="70" y="100" width="60" height="46" rx="8" fill={fill("chest")} stroke={stroke("chest")} />
              <rect x="76" y="150" width="48" height="42" rx="6" fill={fill("abs")} stroke={stroke("abs")} />
              <ellipse cx="42" cy="160" rx="9" ry="10" fill={fill("elbowL")} stroke={stroke("elbowL")} />
              <ellipse cx="158" cy="160" rx="9" ry="10" fill={fill("elbowR")} stroke={stroke("elbowR")} />
              <ellipse cx="30" cy="216" rx="7" ry="8" fill={fill("wristL")} stroke={stroke("wristL")} />
              <ellipse cx="170" cy="216" rx="7" ry="8" fill={fill("wristR")} stroke={stroke("wristR")} />
              <ellipse cx="28" cy="232" rx="10" ry="8" fill={fill("handL")} stroke={stroke("handL")} />
              <ellipse cx="172" cy="232" rx="10" ry="8" fill={fill("handR")} stroke={stroke("handR")} />
              <rect x="70" y="192" width="60" height="14" rx="6" fill={fill("hip")} stroke={stroke("hip")} />
              <rect x="62" y="210" width="32" height="80" rx="10" fill={fill("quadL")} stroke={stroke("quadL")} />
              <rect x="106" y="210" width="32" height="80" rx="10" fill={fill("quadR")} stroke={stroke("quadR")} />
              <rect x="94" y="212" width="12" height="60" rx="4" fill={fill("adductor")} stroke={stroke("adductor")} />
              <ellipse cx="78" cy="308" rx="14" ry="10" fill={fill("kneeL")} stroke={stroke("kneeL")} />
              <ellipse cx="122" cy="308" rx="14" ry="10" fill={fill("kneeR")} stroke={stroke("kneeR")} />
              <rect x="66" y="322" width="22" height="66" rx="6" fill={fill("shinL")} stroke={stroke("shinL")} />
              <rect x="112" y="322" width="22" height="66" rx="6" fill={fill("shinR")} stroke={stroke("shinR")} />
              <ellipse cx="77" cy="398" rx="10" ry="6" fill={fill("ankleL")} stroke={stroke("ankleL")} />
              <ellipse cx="123" cy="398" rx="10" ry="6" fill={fill("ankleR")} stroke={stroke("ankleR")} />
            </g>
          </svg>
        </div>

        {/* ESPALDA */}
        <div>
          <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Espalda
          </p>
          <svg viewBox="0 0 200 420" className="w-full h-auto">
            <g fill="#f4f4f5" stroke="#9ca3af" strokeWidth="1">
              <ellipse cx="100" cy="34" rx="22" ry="26" />
              <rect x="88" y="58" width="24" height="18" rx="6" />
              <path d="M60 82 Q100 72 140 82 L150 200 Q100 214 50 200 Z" />
              <path d="M55 86 L36 200 L28 220 L36 224 L46 210 L64 106 Z" />
              <path d="M145 86 L164 200 L172 220 L164 224 L154 210 L136 106 Z" />
              <path d="M60 200 L58 320 L82 320 L92 210 Z" />
              <path d="M140 200 L142 320 L118 320 L108 210 Z" />
              <path d="M58 320 L54 400 L80 400 L82 320 Z" />
              <path d="M142 320 L146 400 L120 400 L118 320 Z" />
            </g>
            <g strokeWidth="1.2">
              <rect x="88" y="58" width="24" height="18" rx="6" fill={fill("neck")} stroke={stroke("neck")} />
              <rect x="66" y="82" width="68" height="58" rx="10" fill={fill("upperBack")} stroke={stroke("upperBack")} />
              <rect x="72" y="144" width="56" height="52" rx="8" fill={fill("lowerBack")} stroke={stroke("lowerBack")} />
              <rect x="62" y="222" width="32" height="76" rx="10" fill={fill("hamL")} stroke={stroke("hamL")} />
              <rect x="106" y="222" width="32" height="76" rx="10" fill={fill("hamR")} stroke={stroke("hamR")} />
              <rect x="66" y="322" width="22" height="66" rx="6" fill={fill("calfL")} stroke={stroke("calfL")} />
              <rect x="112" y="322" width="22" height="66" rx="6" fill={fill("calfR")} stroke={stroke("calfR")} />
            </g>
          </svg>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Menos</span>
        <span className="inline-block w-4 h-3 border border-border" style={{ background: "rgba(220,38,38,0.22)" }} />
        <span className="inline-block w-4 h-3 border border-border" style={{ background: "rgba(220,38,38,0.5)" }} />
        <span className="inline-block w-4 h-3 border border-border" style={{ background: "rgba(220,38,38,0.85)" }} />
        <span>Más frecuente</span>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Sin registros de dolor aún.
        </p>
      )}
    </div>
  );
}
