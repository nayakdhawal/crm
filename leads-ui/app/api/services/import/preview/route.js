import { NextResponse } from "next/server";
import { parseRateCard } from "@/lib/rateCardParser";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Choose an Excel file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "The file must be 5 MB or smaller" }, { status: 400 });
  }

  try {
    const items = parseRateCard(Buffer.from(await file.arrayBuffer()));
    if (items.length === 0) {
      return NextResponse.json(
        { error: "No rate items found. Check that the file has sections with Sr. no. / Description / Unit / Rate columns." },
        { status: 400 }
      );
    }
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Rate card parse failed:", err);
    return NextResponse.json({ error: "Couldn't read this file. Save it as .xlsx and try again." }, { status: 400 });
  }
}
