// app/api/export/player/[id]/route.ts
import { NextResponse } from "next/server";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

/* ----------------------------------------
   Puppeteer
---------------------------------------- */
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

async function generatePdf(html: string): Promise<Uint8Array> {
  const execPath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    executablePath: execPath,
    args: chromium.args,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return new Uint8Array(pdfBuffer);
}

/* ----------------------------------------
   Route
---------------------------------------- */
export async function GET(req: Request, { params }: any) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const includeReports = url.searchParams.get("reports") === "1";

    // Spieler laden
    const snap = await getDoc(doc(db, "players", id));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    const player = snap.data();

    // Reports laden
    let reports: any[] = [];
    if (includeReports) {
      const q = query(collection(db, "reports"), where("playerId", "==", id));
      const rs = await getDocs(q);
      reports = rs.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // HTML
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 22px; }
            h2 { font-size: 18px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Spielerprofil – ${player.name}</h1>

          <p><b>Alter:</b> ${player.age ?? "-"}<br/>
          <b>Verein:</b> ${player.club ?? "-"}<br/>
          <b>Liga:</b> ${player.league ?? "-"}<br/>
          <b>Position:</b> ${player.position ?? "-"}<br/>
          <b>Größe:</b> ${player.heightCm ?? "-"} cm</p>

          ${
            includeReports
              ? `
            <h2>Reports</h2>
            <ul>
              ${reports
                .map(
                  (r) =>
                    `<li><b>${new Date(r.createdAt).toLocaleDateString(
                      "de-DE"
                    )}:</b> ${r.notes}</li>`
                )
                .join("")}
            </ul>
          `
              : ""
          }
        </body>
      </html>
    `;

    const pdfUint8 = await generatePdf(html);

    // 🔥 **ULTIMATIVER FIX: PDF → Base64 → String**
    const pdfBase64 = Buffer.from(pdfUint8).toString("base64");

    return new NextResponse(pdfBase64, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${player.name}.pdf"`,
        "Content-Transfer-Encoding": "base64",
      },
    });
  } catch (err) {
    console.error("PDF Export error:", err);
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}