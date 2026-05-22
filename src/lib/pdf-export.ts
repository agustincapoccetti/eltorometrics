import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";

export type PdfTable = {
  title: string;
  head: string[];
  rows: (string | number)[][];
};

export async function exportPdf({
  title,
  subtitle,
  tables = [],
  chartEls = [],
  filename,
}: {
  title: string;
  subtitle?: string;
  tables?: PdfTable[];
  chartEls?: HTMLElement[];
  filename: string;
}) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("EL TORO RUGBY PERFORMANCE", 40, y);
  y += 20;
  doc.setFontSize(14);
  doc.text(title, 40, y);
  y += 16;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, 40, y);
    y += 16;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es")}`, 40, y);
  y += 16;

  for (const el of chartEls) {
    try {
      const dataUrl = await toPng(el, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const imgW = pageW - 80;
      const ratio = el.offsetHeight / el.offsetWidth;
      const imgH = imgW * ratio;
      if (y + imgH > 780) { doc.addPage(); y = 40; }
      doc.addImage(dataUrl, "PNG", 40, y, imgW, imgH);
      y += imgH + 16;
    } catch (e) {
      console.error("Chart export failed", e);
    }
  }

  for (const t of tables) {
    if (y > 720) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(t.title, 40, y);
    y += 8;
    autoTable(doc, {
      startY: y + 4,
      head: [t.head],
      body: t.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      theme: "grid",
      margin: { left: 40, right: 40 },
    });
    // @ts-ignore lastAutoTable is attached by plugin
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  doc.save(filename);
}
