// app/api/player/pdf/route.ts
import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

// NEXT SETTINGS
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// ---------------------------------------------------
// PDF GENERATOR
// ---------------------------------------------------
async function generatePdf(html: string): Promise<Buffer> {
  const execPath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: execPath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfUint8 = await page.pdf({ format: "A4" });

  await browser.close();

  // ❗ FIX: erzwinge Node.js Buffer (kein Uint8Array)
  return Buffer.from(pdfUint8);
}

// ---------------------------------------------------
// ROUTE: GET /api/player/pdf?id=xxx
// ---------------------------------------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const snap = await getDoc(doc(db, "players", id));
    if (!snap.exists()) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const player = snap.data();

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 22px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Spielerprofil – ${player.name}</h1>
        <p><b>Alter:</b> ${player.age ?? "-"}</p>
        <p><b>Verein:</b> ${player.club ?? "-"}</p>
        <p><b>Position:</b> ${player.position ?? "-"}</p>
      </body>
      </html>
    `;

    const pdfBuffer = await generatePdf(html);

    // PDF → base64 für NextResponse (100% kompatibel)
    const base64 = pdfBuffer.toString("base64");

    const filename = `${player.name.replace(/[^a-z0-9]/gi, "_")}.pdf`;

    return new NextResponse(base64, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Transfer-Encoding": "base64",
      },
    });
  } catch (err: any) {
    console.error("PDF export error:", err);
    return NextResponse.json(
      { error: "PDF export failed", details: String(err) },
      { status: 500 }
    );
  }
}