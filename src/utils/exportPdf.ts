// src\utils\exportPdf.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ChatMessage } from "../service/chatStore";
import { getChartBlob } from "./fileStore";

/** Metadata opsional untuk header PDF */
type ExportMeta = {
  domain?: string;
  sessionId?: string;
  generatedAt?: Date;
};

/** Chat message yang mungkin bawa chartId & createdAt */
type Msg = ChatMessage & {
  chartId?: string;
  createdAt?: unknown; // Date | number | string | Firestore Timestamp
};

/** helper unit mm (jsPDF sudah pakai mm) */
function mm(val: number) {
  return val;
}

/* -------------------- type guards / utils -------------------- */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasFuncProp<T extends string>(
  v: unknown,
  prop: T
): v is Record<T, (...args: never[]) => unknown> {
  return isObject(v) && typeof v[prop] === "function";
}
function hasNumProp<T extends string>(
  v: unknown,
  prop: T
): v is Record<T, number> {
  return isObject(v) && typeof v[prop] === "number";
}

/** Konversi berbagai tipe tanggal → Date | null */
function coerceDate(v: unknown): Date | null {
  try {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    // Firestore Timestamp .toDate()
    if (hasFuncProp(v, "toDate")) {
      const d = v.toDate() as unknown;
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    }

    // Bentuk {seconds, nanoseconds?}
    if (hasNumProp(v, "seconds")) {
      const sec = (v as Record<"seconds", number>).seconds;
      const nsec =
        (isObject(v) &&
        typeof (v as Record<string, unknown>)["nanoseconds"] === "number"
          ? (v as Record<string, number>)["nanoseconds"]
          : 0) || 0;
      const ms = sec * 1000 + Math.round(nsec / 1e6);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }

    if (typeof v === "number") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Bersihkan HTML jadi teks rapi (pelihara bullet & linebreak) */
function htmlToPlainText(html: string): string {
  const prepped = html
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>\s*/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n");
  const tmp = document.createElement("div");
  tmp.innerHTML = prepped;
  const txt = (tmp.textContent || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return txt;
}

/**
 * Render HTML chart (hasil Plotly write_html) di dalam IFRAME,
 * tunggu sampai plot siap, lalu snapshot jadi PNG dengan html2canvas.
 */
async function htmlToPng(
  html: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  // robust: netralisir oklch() agar html2canvas aman
  const safeHtml = html.replace(/oklch\([^)]+\)/g, "#9ca3af");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "1200px";
  iframe.style.height = "800px";
  // perlu scripts + sama-origin buat bisa dibaca
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return null;
  }

  // Tulis HTML-nya langsung—script di dalamnya akan dieksekusi
  doc.open();
  doc.write(safeHtml);
  doc.close();

  // Tunggu Plotly siap (ada elemen .js-plotly-plot & ukurannya > 0)
  await new Promise<void>((resolve) => {
    const start = Date.now();
    const maxWait = 10_000;

    const tick = () => {
      const body = doc.body;
      const plot = body && body.querySelector(".js-plotly-plot");
      const hasPlot = !!plot && plot.getBoundingClientRect().width > 0;
      const w = iframe.contentWindow;
      const hasGlobalPlotly =
        !!w && "Plotly" in (w as unknown as Record<string, unknown>);
      if (hasPlot && hasGlobalPlotly) {
        setTimeout(() => resolve(), 250);
        return;
      }
      if (Date.now() - start > maxWait) {
        resolve();
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });

  try {
    const body = doc.body as HTMLElement;

    // NOTE: beberapa tipe @types/html2canvas lama tidak mengenal 'scale'.
    // Kita pakai opsi yang pasti ada: backgroundColor + useCORS.
    const canvas = await html2canvas(body, {
      background: "#ffffff",
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const width = canvas.width;
    const height = canvas.height;
    return { dataUrl, width, height };
  } catch (err) {
    console.warn("htmlToPng failed:", err);
    return null;
  } finally {
    document.body.removeChild(iframe);
  }
}

/* ----------------------- MAIN EXPORT ----------------------- */
/**
 * Export chat → PDF ala “siap kirim ke bos”:
 * - Header (Domain, Session, Generated at)
 * - Untuk setiap giliran: Prompt (user) → Chart (jika ada) → Analysis (plain text)
 */
export async function exportChatToPdf(
  messages: Msg[],
  filename = "chat.pdf",
  meta: ExportMeta = {}
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { w: 210, h: 297, margin: 12 };
  let y = page.margin;

  const ensureSpace = (need: number) => {
    if (y + need > page.h - page.margin) {
      doc.addPage();
      y = page.margin;
    }
  };

  // ---------- HEADER ----------
  const domain = meta.domain ?? "-";
  const sessionId = meta.sessionId ?? "-";
  const generatedAt = meta.generatedAt ?? new Date();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Conversation Insight Report", mm(page.margin), mm(y));
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Domain: ${domain}`, mm(page.margin), mm(y));
  y += 6;
  doc.text(`Session: ${sessionId}`, mm(page.margin), mm(y));
  y += 6;
  doc.text(
    `Generated at: ${generatedAt.toLocaleString()}`,
    mm(page.margin),
    mm(y)
  );

  y += 8;

  doc.setDrawColor(180);
  doc.line(mm(page.margin), mm(y), mm(page.w - page.margin), mm(y));
  y += 8;

  // ---------- BODY ----------
  for (const m of messages) {
    if (m.role === "user") {
      const created = coerceDate(m.createdAt);

      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Prompt", mm(page.margin), mm(y));
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const promptText = (m.text ?? "").trim();
      const lines = doc.splitTextToSize(promptText, page.w - page.margin * 2);
      doc.text(lines, mm(page.margin), mm(y));
      y += lines.length * 5 + 4;

      if (created) {
        doc.setTextColor(120);
        doc.setFontSize(9);
        doc.text(created.toLocaleString(), mm(page.margin), mm(y));
        doc.setTextColor(0);
        y += 6;
      }

      doc.setDrawColor(235);
      doc.line(mm(page.margin), mm(y), mm(page.w - page.margin), mm(y));
      y += 6;
      continue;
    }

    if (m.role === "assistant") {
      // 1) CHART (jika ada)
      if (m.chartId) {
        try {
          const blob = await getChartBlob(m.chartId);
          if (blob) {
            const html = await blob.text();
            const img = await htmlToPng(html);
            if (img) {
              const maxW = page.w - page.margin * 2;
              const imgW = maxW;
              const imgH = (img.height * imgW) / img.width;

              ensureSpace(imgH + 6);
              doc.addImage(
                img.dataUrl,
                "PNG",
                mm(page.margin),
                mm(y),
                mm(imgW),
                mm(imgH)
              );
              y += imgH + 6;
            }
          }
        } catch (err) {
          console.warn("Render chart error:", err);
        }
      }

      // 2) ANALYSIS TEXT (plain)
      const raw = (m.text ?? "").trim();
      if (raw) {
        ensureSpace(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Analysis", mm(page.margin), mm(y));
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const text = /<\w+[^>]*>/.test(raw) ? htmlToPlainText(raw) : raw;
        const lines = doc.splitTextToSize(text, page.w - page.margin * 2);
        doc.text(lines, mm(page.margin), mm(y));
        y += lines.length * 5 + 8;

        doc.setDrawColor(235);
        doc.line(mm(page.margin), mm(y), mm(page.w - page.margin), mm(y));
        y += 6;
      }
    }
  }

  doc.save(filename);
}
