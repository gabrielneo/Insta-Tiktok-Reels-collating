import * as XLSX from "xlsx";
import type { Recommendation } from "./types";

const COLUMN_HEADERS: {
  header: string;
  width: number;
  value: (rec: Recommendation) => string | number;
}[] = [
  { header: "Place Name", width: 28, value: (rec) => rec.place_name },
  { header: "Category", width: 16, value: (rec) => rec.category },
  { header: "Location", width: 24, value: (rec) => rec.location },
  { header: "Recommended Activities", width: 42, value: (rec) => rec.recommended_activities },
  { header: "Price Range", width: 12, value: (rec) => rec.price_range },
  { header: "Notes / Highlights", width: 40, value: (rec) => rec.rating_or_notes },
  { header: "Source Link", width: 38, value: (rec) => rec.reel_url },
  // Filled in after "Find on Google Maps"; blank otherwise.
  { header: "Address", width: 36, value: (rec) => (rec.geo?.status === "found" ? rec.geo.formatted_address : "") },
  { header: "Latitude", width: 12, value: (rec) => (rec.geo?.status === "found" ? rec.geo.lat : "") },
  { header: "Longitude", width: 12, value: (rec) => (rec.geo?.status === "found" ? rec.geo.lng : "") },
  { header: "Google Maps Link", width: 38, value: (rec) => (rec.geo?.status === "found" ? rec.geo.maps_url : "") },
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
    COLUMN_HEADERS.map((c) => c.value(rec) ?? "")
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
