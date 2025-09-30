export function generateQuestionFromColumnName(columnName: string): string {
  const norm = columnName.trim().toLowerCase();

  if (
    norm.includes("reason") ||
    norm.includes("status") ||
    norm.includes("category")
  ) {
    return `Apa saja 10 alasan atau kategori terbanyak di kolom "${columnName}"? Buat juga diagram batangnya.`;
  }

  if (
    norm.includes("rate") ||
    norm.includes("percentage") ||
    norm.includes("ratio")
  ) {
    return `Berapa nilai rata-rata dan distribusi dari kolom "${columnName}"? Tampilkan histogram.`;
  }

  if (
    norm.includes("time") ||
    norm.includes("duration") ||
    norm.includes("ctat")
  ) {
    return `Analisis distribusi dan variasi waktu dari kolom "${columnName}". Tampilkan histogram atau tren.`;
  }

  return `Tampilkan analisis deskriptif dan visualisasi chart untuk kolom "${columnName}".`;
}
