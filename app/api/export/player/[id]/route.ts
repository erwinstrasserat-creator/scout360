// app/api/export/player/[id]/route.ts
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// ----------------------------------------
// PDF GENERATOR
// ----------------------------------------
async function generatePdf(html: string): Promise<Uint8Array> {
  const execPath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    executablePath: execPath,
    args: chromium.args,
    headless: true, // wichtig für Vercel, keine chromium.headless-Property
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  // pdfBuffer ist ein Buffer, wir geben als Uint8Array zurück
  return new Uint8Array(pdfBuffer);
}

// ----------------------------------------
// ROUTE
// ----------------------------------------
export async function GET(req: Request, { params }: any) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const includeReports = url.searchParams.get("reports") === "1";

    // Player laden (Admin SDK → keine Firestore-Regel-Probleme)
    const snap = await adminDb.collection("players").doc(id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const player = snap.data() as any;

    // Reports laden (optional)
    let reports: any[] = [];
    if (includeReports) {
      const rs = await adminDb
        .collection("reports")
        .where("playerId", "==", id)
        .get();

      reports = rs.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // HTML für PDF
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { margin-top: 24px; font-size: 18px; }
            p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>Spieler – ${player.name}</h1>

          <p><b>Alter:</b> ${player.age ?? "-"}</p>
          <p><b>Verein:</b> ${player.club ?? "-"}</p>
          <p><b>Position:</b> ${player.position ?? "-"}</p>
          <p><b>Größe:</b> ${player.heightCm ?? "-"} cm</p>

          ${
            includeReports && reports.length
              ? `
                <h2>Reports</h2>
                ${reports
                  .map(
                    (r) =>
                      `<p><b>${r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("de-DE")
                        : ""}:</b> ${r.notes ?? ""}</p>`
                  )
                  .join("")}
              `
              : ""
          }
        </body>
      </html>
    `;

    const pdfBytes = await generatePdf(html);

    // ✅ TS-freundlich: Uint8Array → Blob, Blob ist gültiger BodyInit
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${player.name}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF Export error:", err);
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}