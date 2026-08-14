// Formato de fecha consistente en toda la app: dd/mm (o dd/mm/aa cuando cambia el año).
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** "14/08" — o "14/08/25" si no es del año en curso. */
export function fmtDate(iso?: string | null): string {
  const d = iso ? parseIso(iso) : null;
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear ? `${dd}/${mm}` : `${dd}/${mm}/${String(d.getFullYear()).slice(2)}`;
}

/** "vie 14 ago" */
export function fmtDateLong(iso?: string | null): string {
  const d = iso ? parseIso(iso) : null;
  if (!d) return "—";
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Hoy" / "Mañana" / "Ayer" / fecha larga */
export function fmtRelative(iso?: string | null): string {
  const d = iso ? parseIso(iso) : null;
  if (!d) return "—";
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return fmtDateLong(iso);
}

/** "09:30" a partir de "09:30:00" */
export function fmtTime(t?: string | null): string {
  return t ? String(t).slice(0, 5) : "";
}
