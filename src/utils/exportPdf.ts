import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ChatMessage } from "../service/chatStore";
import { getChartBlob } from "../utils/fileStore";

export async function exportChatToPdf(
  messages: (ChatMessage & { chartHtml?: string })[],
  filename = "chat.pdf"
) {
  const doc = new jsPDF();
  let y = 10;

  for (const m of messages) {
    // Role
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${m.role.toUpperCase()}:`, 10, y);
    y += 6;

    // Text
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(m.text, 180);
    doc.text(split, 10, y);
    y += split.length * 6 + 4;

    // Chart → convert ke image
    if (m.chartId) {
      const blob = await getChartBlob(m.chartId);
      if (blob) {
        const html = await blob.text();

        // ✅ Sanitize warna supaya html2canvas tidak error karena `oklch()`
        const safeHtml = html.replace(/oklch\([^)]+\)/g, "#9ca3af");

        const temp = document.createElement("div");
        temp.innerHTML = safeHtml;
        temp.style.width = "800px"; // supaya konsisten skala
        document.body.appendChild(temp);

        const canvas = await html2canvas(temp, { background: "#fff" });
        const imgData = canvas.toDataURL("image/png");

        const pdfWidth = 180;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (y + pdfHeight > 280) {
          doc.addPage();
          y = 10;
        }

        doc.addImage(imgData, "PNG", 10, y, pdfWidth, pdfHeight);
        y += pdfHeight + 10;

        document.body.removeChild(temp);
      }
    }

    // auto new page kalau terlalu panjang
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  }

  doc.save(filename);
}
