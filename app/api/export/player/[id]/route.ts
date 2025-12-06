import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { adminDb } from "@/lib/firebaseAdmin";   // <- Admin SDK

export const runtime = "nodejs";

// ----------------------------------------
// PDF GENERATOR
// ----------------------------------------
async function generatePdf(html: string): Promise<Uint8Array> {
  const execPath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return new Uint8Array(pdf);
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

    // Player laden (Admin SDK ➜ keine Permission Errors)
    const snap = await adminDb.collection("players").doc(id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const player = snap.data();

    // Reports laden
    let reports: any[] = [];
    if (includeReports) {
      const rs = await adminDb
        .collection("reports")
        .where("playerId", "==", id)
        .get();

      reports = rs.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const html = `
      <html>
        <body style="font-family: Arial; padding: 24px;">
          <h1>Spieler – ${player.name}</h1>
          <p>Alter: ${player.age ?? "-"}</p>
          <p>Verein: ${player.club ?? "-"}</p>
          <p>Position: ${player.position ?? "-"}</p>

          ${includeReports ? `
            <h2>Reports</h2>
            ${reports.map(r => `<p>${r.notes}</p>`).join("")}
          ` : ""}
        </body>
      </html>
    `;

    const pdfBytes = await generatePdf(html);

    // 100% gültige PDF-Antwort
    return new NextResponse(pdfBytes, {
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