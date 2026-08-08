// Silueta 3D de zonas de dolor con intensidad por frecuencia.
// Acepta entradas con fecha opcional para mostrar historial y último registro por zona al hacer click.

import { useMemo, useState } from "react";

type ZoneId =
  | "head" | "neck"
  | "shoulderL" | "shoulderR"
  | "chest" | "abs"
  | "elbowL" | "elbowR"
  | "wristL" | "wristR"
  | "handL" | "handR"
  | "hip"
  | "quadL" | "quadR"
  | "adductor"
  | "kneeL" | "kneeR"
  | "shinL" | "shinR"
  | "ankleL" | "ankleR"
  | "upperBack" | "lowerBack"
  | "glute"
  | "hamL" | "hamR"
  | "calfL" | "calfR";

const ZONE_LABEL: Record<ZoneId, string> = {
  head: "Cabeza", neck: "Cuello",
  shoulderL: "Hombro izq.", shoulderR: "Hombro der.",
  chest: "Pecho / costillas", abs: "Abdomen",
  elbowL: "Codo izq.", elbowR: "Codo der.",
  wristL: "Muñeca izq.", wristR: "Muñeca der.",
  handL: "Mano izq.", handR: "Mano der.",
  hip: "Cadera",
  quadL: "Cuádriceps izq.", quadR: "Cuádriceps der.",
  adductor: "Aductores",
  kneeL: "Rodilla izq.", kneeR: "Rodilla der.",
  shinL: "Tibia izq.", shinR: "Tibia der.",
  ankleL: "Tobillo izq.", ankleR: "Tobillo der.",
  upperBack: "Espalda alta / dorsales", lowerBack: "Lumbar",
  glute: "Glúteos",
  hamL: "Isquios izq.", hamR: "Isquios der.",
  calfL: "Gemelos izq.", calfR: "Gemelos der.",
};

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
  if (/gl[uú]teo/.test(s)) hits.push("glute");
  if (/isquio/.test(s)) hits.push("hamL", "hamR");
  if (/gemel|s[oó]leo|pantorrilla/.test(s)) hits.push("calfL", "calfR");
  return hits;
}

export type PainEntry = string | { text: string; date?: string };

function normalize(entries: PainEntry[]): { text: string; date?: string }[] {
  return entries.map((e) => (typeof e === "string" ? { text: e } : e));
}

export function BodyMap({
  entries,
  title = "Mapa de dolor",
}: {
  entries: PainEntry[];
  title?: string;
}) {
  const [selected, setSelected] = useState<ZoneId | null>(null);

  const normalized = useMemo(() => normalize(entries), [entries]);

  const byZone = useMemo(() => {
    const map: Record<string, { text: string; date?: string }[]> = {};
    normalized.forEach((e) => {
      classify(e.text).forEach((z) => {
        (map[z] ??= []).push(e);
      });
    });
    return map as Record<ZoneId, { text: string; date?: string }[]>;
  }, [normalized]);

  const counts = useMemo(() => {
    const c = {} as Record<ZoneId, number>;
    (Object.keys(byZone) as ZoneId[]).forEach((z) => { c[z] = byZone[z].length; });
    return c;
  }, [byZone]);

  const max = Math.max(1, ...Object.values(counts));

  const intensity = (id: ZoneId) => {
    const c = counts[id] ?? 0;
    if (!c) return 0;
    return 0.25 + (c / max) * 0.7;
  };

  const zoneFill = (id: ZoneId) => {
    const t = intensity(id);
    if (!t) return "rgba(56,189,248,0.06)";
    return `rgba(248,58,58,${0.2 + t * 0.6})`;
  };

  const zoneStroke = (id: ZoneId) =>
    selected === id
      ? "#ffffff"
      : counts[id]
        ? "rgba(255,120,120,0.95)"
        : "rgba(125,211,252,0.35)";

  const zoneStrokeW = (id: ZoneId) => (selected === id ? 2 : 1);

  const selectedEntries = selected ? (byZone[selected] ?? []) : [];
  const selectedLast = selectedEntries
    .filter((e) => e.date)
    .sort((a, b) => (b.date! > a.date! ? 1 : -1))[0];

  return (
    <div
      className="border border-sky-500/30 p-4 sm:p-6 mb-4 rounded-sm"
      style={{
        background:
          "radial-gradient(90% 70% at 50% 0%, rgba(14,90,160,0.45) 0%, rgba(3,10,26,0) 70%), linear-gradient(180deg, #061024 0%, #02060f 100%)",
      }}
    >
      <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-base sm:text-lg text-sky-100">{title}</h3>
        <p className="text-[10px] uppercase tracking-widest text-sky-300/60">
          {normalized.length} registro{normalized.length === 1 ? "" : "s"} · toca una zona
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-8 max-w-lg mx-auto">
        {/* ========== FRENTE ========== */}
        <div>
          <p className="text-center text-[10px] uppercase tracking-widest text-sky-300/60 mb-1">Frente</p>
          <svg viewBox="0 0 220 460" className="w-full h-auto select-none">
            <defs>
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.55" />
                <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="skinGradSide" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.5" />
              </linearGradient>
              <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="painGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g filter="url(#softShadow)" stroke="rgba(125,211,252,0.85)" strokeWidth="0.8">

              {/* silueta base 3D */}
              {/* cabeza */}
              <ellipse cx="110" cy="38" rx="26" ry="30" fill="url(#skinGrad)" />
              {/* cuello */}
              <path d="M96,66 Q110,74 124,66 L126,84 Q110,90 94,84 Z" fill="url(#skinGrad)" />
              {/* torso trapezoidal con hombros redondeados */}
              <path d="M64,96 Q110,80 156,96 Q168,150 156,206 Q110,220 64,206 Q52,150 64,96 Z" fill="url(#skinGrad)" />
              {/* brazos */}
              <path d="M58,100 Q40,130 34,190 Q30,220 38,244 Q46,246 50,222 Q56,178 66,142 Z" fill="url(#skinGradSide)" />
              <path d="M162,100 Q180,130 186,190 Q190,220 182,244 Q174,246 170,222 Q164,178 154,142 Z" fill="url(#skinGradSide)" />
              {/* manos */}
              <ellipse cx="42" cy="252" rx="12" ry="16" fill="url(#skinGrad)" />
              <ellipse cx="178" cy="252" rx="12" ry="16" fill="url(#skinGrad)" />
              {/* cadera */}
              <path d="M66,204 Q110,220 154,204 L158,234 Q110,246 62,234 Z" fill="url(#skinGrad)" />
              {/* piernas */}
              <path d="M70,232 Q78,300 82,346 Q84,360 100,360 Q108,300 104,232 Z" fill="url(#skinGrad)" />
              <path d="M150,232 Q142,300 138,346 Q136,360 120,360 Q112,300 116,232 Z" fill="url(#skinGrad)" />
              {/* pantorrillas */}
              <path d="M78,360 Q82,410 88,442 L100,442 Q102,400 100,360 Z" fill="url(#skinGrad)" />
              <path d="M142,360 Q138,410 132,442 L120,442 Q118,400 120,360 Z" fill="url(#skinGrad)" />
              {/* pies */}
              <ellipse cx="88" cy="448" rx="14" ry="7" fill="url(#skinGrad)" />
              <ellipse cx="132" cy="448" rx="14" ry="7" fill="url(#skinGrad)" />
            </g>

            {/* zonas interactivas (overlays semitransparentes) */}
            <g>
              <Zone d="M84,14 A26,30 0 0,1 136,38 A26,30 0 0,1 84,38 Z" id="head" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M94,68 Q110,76 126,68 L126,86 Q110,92 94,86 Z" id="neck" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M60,96 Q70,86 90,90 L92,120 Q74,124 62,120 Z" id="shoulderL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M160,96 Q150,86 130,90 L128,120 Q146,124 158,120 Z" id="shoulderR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M74,116 Q110,108 146,116 L150,164 Q110,172 70,164 Z" id="chest" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M78,168 Q110,174 142,168 L144,208 Q110,214 76,208 Z" id="abs" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M36,170 Q30,182 34,196 Q46,196 48,182 Z" id="elbowL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M184,170 Q190,182 186,196 Q174,196 172,182 Z" id="elbowR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M34,232 Q30,242 40,246 Q48,244 46,232 Z" id="wristL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M186,232 Q190,242 180,246 Q172,244 174,232 Z" id="wristR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M30,248 A12,16 0 1,0 54,254 A12,16 0 1,0 30,248 Z" id="handL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M166,248 A12,16 0 1,0 190,254 A12,16 0 1,0 166,248 Z" id="handR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M68,210 Q110,222 152,210 L156,232 Q110,242 64,232 Z" id="hip" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M72,236 Q80,290 84,330 L102,330 Q104,286 104,236 Z" id="quadL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M148,236 Q140,290 136,330 L118,330 Q116,286 116,236 Z" id="quadR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M104,238 L116,238 L116,300 L104,300 Z" id="adductor" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M80,332 Q92,342 102,332 L102,356 Q92,362 82,356 Z" id="kneeL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M140,332 Q128,342 118,332 L118,356 Q128,362 138,356 Z" id="kneeR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M82,360 Q86,400 92,432 L102,432 L100,360 Z" id="shinL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M138,360 Q134,400 128,432 L118,432 L120,360 Z" id="shinR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M76,438 A14,7 0 1,0 100,442 A14,7 0 1,0 76,438 Z" id="ankleL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M120,438 A14,7 0 1,0 144,442 A14,7 0 1,0 120,438 Z" id="ankleR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
            </g>
          </svg>
        </div>

        {/* ========== ESPALDA ========== */}
        <div>
          <p className="text-center text-[10px] uppercase tracking-widest text-sky-300/60 mb-1">Espalda</p>
          <svg viewBox="0 0 220 460" className="w-full h-auto select-none">
            <g filter="url(#softShadow)" stroke="rgba(125,211,252,0.85)" strokeWidth="0.8">

              <ellipse cx="110" cy="38" rx="26" ry="30" fill="url(#skinGrad)" />
              <path d="M96,66 Q110,74 124,66 L126,84 Q110,90 94,84 Z" fill="url(#skinGrad)" />
              <path d="M64,96 Q110,80 156,96 Q168,150 156,206 Q110,220 64,206 Q52,150 64,96 Z" fill="url(#skinGrad)" />
              <path d="M58,100 Q40,130 34,190 Q30,220 38,244 Q46,246 50,222 Q56,178 66,142 Z" fill="url(#skinGradSide)" />
              <path d="M162,100 Q180,130 186,190 Q190,220 182,244 Q174,246 170,222 Q164,178 154,142 Z" fill="url(#skinGradSide)" />
              <path d="M66,204 Q110,220 154,204 L158,244 Q110,258 62,244 Z" fill="url(#skinGrad)" />
              <path d="M70,244 Q78,304 82,346 Q84,360 100,360 Q108,304 104,244 Z" fill="url(#skinGrad)" />
              <path d="M150,244 Q142,304 138,346 Q136,360 120,360 Q112,304 116,244 Z" fill="url(#skinGrad)" />
              <path d="M78,360 Q82,410 88,442 L100,442 Q102,400 100,360 Z" fill="url(#skinGrad)" />
              <path d="M142,360 Q138,410 132,442 L120,442 Q118,400 120,360 Z" fill="url(#skinGrad)" />
            </g>

            <g>
              <Zone d="M94,68 Q110,76 126,68 L126,86 Q110,92 94,86 Z" id="neck" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M70,94 Q110,86 150,94 L152,150 Q110,158 68,150 Z" id="upperBack" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M74,152 Q110,158 146,152 L148,202 Q110,208 72,202 Z" id="lowerBack" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M68,208 Q110,224 152,208 L156,250 Q110,262 64,250 Z" id="glute" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M72,252 Q80,306 84,342 L102,342 Q104,300 104,252 Z" id="hamL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M148,252 Q140,306 136,342 L118,342 Q116,300 116,252 Z" id="hamR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M82,360 Q86,400 92,432 L102,432 L100,360 Z" id="calfL" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
              <Zone d="M138,360 Q134,400 128,432 L118,432 L120,360 Z" id="calfR" onClick={setSelected} selected={selected} counts={counts} fill={zoneFill} stroke={zoneStroke} strokeW={zoneStrokeW} />
            </g>
          </svg>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-sky-300/70">
        <span>Menos</span>
        <span className="inline-block w-4 h-3 border border-sky-500/30" style={{ background: "rgba(248,58,58,0.28)" }} />
        <span className="inline-block w-4 h-3 border border-sky-500/30" style={{ background: "rgba(248,58,58,0.55)" }} />
        <span className="inline-block w-4 h-3 border border-sky-500/30" style={{ background: "rgba(248,58,58,0.9)" }} />
        <span>Más frecuente</span>
      </div>

      {/* Detalle zona seleccionada */}
      {selected && (
        <div className="mt-5 border border-sky-500/30 p-4 bg-sky-950/40">
          <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-sky-300/60">Zona seleccionada</p>
              <h4 className="text-base font-medium text-sky-50">{ZONE_LABEL[selected]}</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-sky-300/60">Frecuencia</p>
              <p className="text-lg font-medium text-sky-50">{selectedEntries.length}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-[10px] uppercase tracking-widest underline hover:no-underline text-sky-200"
            >
              Cerrar
            </button>
          </div>
          {selectedLast && (
            <p className="text-xs text-sky-300/70 mb-2">
              Último registro: <span className="font-medium text-sky-50">{selectedLast.date}</span> · {selectedLast.text}
            </p>
          )}

          {selectedEntries.length > 0 ? (
            <ul className="space-y-1 max-h-40 overflow-auto pr-1">
              {selectedEntries
                .slice()
                .sort((a, b) => (a.date && b.date ? (b.date > a.date ? 1 : -1) : 0))
                .map((e, i) => (
                  <li key={i} className="text-xs border-l-2 border-red-500 pl-2 text-sky-100">
                    {e.date && <span className="font-display uppercase tracking-wider mr-2 text-sky-300/70">{e.date}</span>}
                    <span>{e.text}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-xs text-sky-300/70">Sin registros para esta zona todavía.</p>
          )}
        </div>
      )}

      {normalized.length === 0 && (
        <p className="text-xs text-sky-300/60 text-center mt-3">
          Sin registros de dolor aún.
        </p>
      )}

    </div>
  );
}

function Zone({
  id, d, onClick, selected, counts, fill, stroke, strokeW,
}: {
  id: ZoneId;
  d: string;
  onClick: (id: ZoneId) => void;
  selected: ZoneId | null;
  counts: Record<ZoneId, number>;
  fill: (id: ZoneId) => string;
  stroke: (id: ZoneId) => string;
  strokeW: (id: ZoneId) => number;
}) {
  const has = (counts[id] ?? 0) > 0;
  return (
    <path
      d={d}
      fill={has || selected === id ? fill(id) : "rgba(56,189,248,0.04)"}
      stroke={stroke(id)}
      strokeWidth={strokeW(id)}
      filter={has ? "url(#painGlow)" : undefined}
      style={{ cursor: "pointer", transition: "fill .2s, stroke .2s" }}
      onClick={() => onClick(selected === id ? (null as any) : id)}
    >

      <title>{ZONE_LABEL[id]}{has ? ` · ${counts[id]} registro${counts[id] === 1 ? "" : "s"}` : ""}</title>
    </path>
  );
}
