// app/api/export/player/[id]/route.ts
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/* ----------------------------------------------------
   PDF GENERATOR – returns BASE64 string (safe)
---------------------------------------------------- */
async function generatePdf(html: string): Promise<string> {
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

  return Buffer.from(pdfBuffer).toString("base64");
}

/* ----------------------------------------------------
   ROUTE HANDLER
---------------------------------------------------- */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    const snap = await adminDb.collection("players").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const player = snap.data();

    const url = new URL(req.url);
    const includeReports = url.searchParams.get("reports") === "1";

    let reports: any[] = [];

    if (includeReports) {
      const rs = await adminDb
        .collection("reports")
        .where("playerId", "==", id)
        .get();

      reports = rs.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // HTML for PDF
    const html = `
      <html>
        <body style="font-family: Arial; padding: 24px;">
          <h1>Spieler – ${player.name}</h1>

          <p><b>Alter:</b> ${player.age ?? "-"}</p>
          <p><b>Verein:</b> ${player.club ?? "-"}</p>
          <p><b>Position:</b> ${player.position ?? "-"}</p>
          <p><b>Größe:</b> ${player.heightCm ?? "-"} cm</p>

          ${
            includeReports
              ? `
                <h2>Reports</h2>
                ${reports
                  .map(
                    (r) =>
                      `<p><b>${new Date(r.createdAt).toLocaleDateString(
                        "de-DE"
                      )}:</b> ${r.notes}</p>`
                  )
                  .join("")}
              `
              : ""
          }
        </body>
      </html>
    `;

    const base64Pdf = await generatePdf(html);

    return new NextResponse(base64Pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${player.name}.pdf"`,
        "Content-Transfer-Encoding": "base64",
      },
    });
  } catch (err) {
    console.error("PDF Export error:", err);
    return NextResponse.json(
      { error: "PDF export failed" },
      { status: 500 }
    );
  }
}