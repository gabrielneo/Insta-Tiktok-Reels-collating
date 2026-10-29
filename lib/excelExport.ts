import * as XLSX from "xlsx";
import type { Recommendation } from "./types";

const COLUMN_HEADERS: { key: keyof Recommendation; header: string; width: number }[] = [
  { key: "place_name", header: "Place Name", width: 28 },
  { key: "category", header: "Category", width: 16 },
  { key: "location", header: "Location", width: 24 },
  { key: "recommended_activities", header: "Recommended Activities", width: 42 },
  { key: "price_range", header: "Price Range", width: 12 },
  { key: "rating_or_notes", header: "Notes / Highlights", width: 40 },
  { key: "reel_url", header: "Source Link", width: 38 },
];

/**
 * Converts a list of recommendations into a downloadable .xlsx file.
 * Runs entirely client-side via SheetJS — no server round-trip needed.
 */
export function exportRecommendationsToExcel(
  recommendations: Recommendation[],
  filenamePrefix = "Fieldnotes_Recommendations"
): void {
  if (recommendations.length === 0) return;

  const headerRow = COLUMN_HEADERS.map((c) => c.header);
  const dataRows = recommendations.map((rec) =>
    COLUMN_HEADERS.map((c) => rec[c.key] ?? "")
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  worksheet["!cols"] = COLUMN_HEADERS.map((c) => ({ wch: c.width }));

  // Freeze the header row so it stays visible while scrolling.
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  (worksheet as any)["!panes"] = [
    { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" },
  ];

  // Note: cell background/font styling below only renders with SheetJS Pro.
  // The free `xlsx` package used here will silently ignore the `.s` style
  // property and still produce a valid, correctly-shaped .xlsx file — the
  // header row will just be plain text instead of colored/bold.
  const range = XLSX.utils.decode_range(worksheet["!ref"] as string);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellRef];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2E4B3C" } },
        alignment: { vertical: "center" },
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Recommendations");

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}_${dateStamp}.xlsx`;

  XLSX.writeFile(workbook, filename, { cellStyles: true });
}
