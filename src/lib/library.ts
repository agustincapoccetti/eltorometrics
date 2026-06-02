export const LIBRARY_CATEGORIES = [
  { v: "rugby", l: "Rugby", icon: "🏉" },
  { v: "gym", l: "Gym", icon: "🏋️" },
  { v: "fisio", l: "Fisio", icon: "🧑‍⚕️" },
] as const;

export function categoryLabel(v: string) {
  return LIBRARY_CATEGORIES.find((c) => c.v === v)?.l ?? v;
}
export function categoryIcon(v: string) {
  return LIBRARY_CATEGORIES.find((c) => c.v === v)?.icon ?? "•";
}

/** Try to derive a thumbnail URL from common video providers. */
export function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    if (host === "youtube.com" && u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2];
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }

    // Vimeo (requires API for real thumb; use a generic frame service)
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://vumbnail.com/${id}.jpg`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getThumbnail(item: { thumbnail_url?: string | null; url: string }): string | null {
  return item.thumbnail_url || deriveThumbnail(item.url);
}
