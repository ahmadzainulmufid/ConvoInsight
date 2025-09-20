// src/utils/cleanText.ts
export function cleanAndSplitText(
  content: string,
  chartCount: number
): string[] {
  if (!content) return [];

  const text = content.replace(/`+/g, "");

  const rawLines = text.split(/\r?\n/);

  const cleanedLines: string[] = [];
  let counter = 1;

  for (const raw of rawLines) {
    let line = raw.trimEnd();

    if (/see the chart for more details/i.test(line)) continue;
    if (/files\/\d+.*_visualization\.html/i.test(line)) continue;

    if (/^\s*[*-]\s+/.test(line)) {
      line = line.replace(/^\s*[*-]\s+/, `${counter++}. `);
    }

    cleanedLines.push(line);
  }

  // Gabungkan kembali, rapikan spasi kosong berlebih
  const cleaned = cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (chartCount <= 1) return [cleaned];

  // Bagi merata isi teks ke sejumlah chart (per kata)
  const words = cleaned.split(/\s+/);
  const chunkSize = Math.ceil(words.length / chartCount);
  const parts: string[] = [];

  for (let i = 0; i < chartCount; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    const piece = words.slice(start, end).join(" ").trim();
    parts.push(piece);
  }

  return parts;
}
