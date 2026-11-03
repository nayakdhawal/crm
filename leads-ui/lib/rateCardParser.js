import * as XLSX from "xlsx";

const UNIT_PATTERNS = [
  { test: /sq\.?\s*f/i, pricing_type: "per_sqft", unit: "Sq. Ft." },
  { test: /r\.?\s*f\.?\s*t/i, pricing_type: "per_rft", unit: "R.F.T." },
  { test: /nos/i, pricing_type: "flat", unit: "Nos." },
];

const isHeaderRow = (row) =>
  row.some((cell) => typeof cell === "string" && /^sr\.?\s*no/i.test(cell.trim()));

function findUnit(row) {
  for (const idx of [2, 3]) {
    const cell = row[idx];
    if (typeof cell !== "string") continue;
    const match = UNIT_PATTERNS.find((p) => p.test.test(cell.trim()));
    if (match) return match;
  }
  return null;
}

function qualifierFor(sectionTitle) {
  if (/without material/i.test(sectionTitle)) return " (without material)";
  if (/carpent/i.test(sectionTitle)) return " (with material)";
  return "";
}

// Reads a rate card laid out as sections: a section title, a header row
// (Sr. no. / Description / Unit / Qty / Rate), then item rows. Notes and
// material specifications are skipped because they aren't items.
export function parseRateCard(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

  const items = [];
  let section = null;

  rows.forEach((row, i) => {
    const next = rows[i + 1] || [];
    const unit = findUnit(row);
    const rate = typeof row[4] === "number" ? row[4] : null;
    const label = typeof row[1] === "string" ? row[1].trim() : null;

    if (label && unit && rate !== null) {
      if (!section) return;
      items.push({
        section: section.title,
        name: `${label}${section.qualifier}`,
        unit: unit.unit,
        pricing_type: unit.pricing_type,
        rate,
      });
      return;
    }

    const first = typeof row[0] === "string" ? row[0].trim() : null;
    const isLetterMarker = first !== null && /^[A-Z]$/.test(first);
    const title = isLetterMarker ? label : first;
    const isTitle = title && !unit && rate === null && (isHeaderRow(next) || isLetterMarker);
    if (isTitle) {
      section = { title, qualifier: qualifierFor(title) };
    }
  });

  return items;
}
