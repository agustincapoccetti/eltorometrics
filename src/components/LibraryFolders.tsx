import { FolderOpen, Folder } from "lucide-react";

export type LibraryFolder = {
  id: string;
  name: string;
  category: string;
};

/** Chips de carpetas (subcategorías) para una categoría dada. */
export function FolderChips({
  folders,
  value,
  onChange,
  counts,
}: {
  folders: LibraryFolder[];
  value: string;
  onChange: (v: string) => void;
  counts?: Record<string, number>;
}) {
  const options = [
    { v: "all", l: "Todas" },
    ...folders.map((f) => ({ v: f.id, l: f.name })),
    { v: "none", l: "Sin carpeta" },
  ];
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
        Carpeta:
      </span>
      {options.map((o) => {
        const active = value === o.v;
        const n = counts?.[o.v];
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border inline-flex items-center gap-1.5 ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            {active ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
            {o.l}
            {typeof n === "number" && <span className="opacity-60">({n})</span>}
          </button>
        );
      })}
    </div>
  );
}
