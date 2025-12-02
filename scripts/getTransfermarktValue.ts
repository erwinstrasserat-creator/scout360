// scripts/getTransfermarktValue.ts
// Nur für interne Zwecke. Nicht in Produktion deployen.

import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Holt geschätzten Marktwert von Transfermarkt
 * (very fragile, da HTML sich ändern kann)
 */
export async function getTransfermarktValue(
  playerName: string,
  clubName?: string
): Promise<{ value: string | null; currency: string | null; url: string | null }> {
  const query = encodeURIComponent(
    clubName ? `${playerName} ${clubName}` : playerName
  );

  // 1) Suchseite
  const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${query}`;
  const searchHtml = await (await fetch(searchUrl)).text();
  const $search = cheerio.load(searchHtml);

  const firstLink = $search('table tbody tr td a[href*="/profil/spieler"]').first();
  if (!firstLink.length) {
    return { value: null, currency: null, url: null };
  }

  const playerUrl = "https://www.transfermarkt.com" + firstLink.attr("href");

  // 2) Spielerprofil
  const detailHtml = await (await fetch(playerUrl)).text();
  const $detail = cheerio.load(detailHtml);

  // typischerweise span mit data-value / data-currency
  const valueElem = $detail('a[data-ajax="marktwert"]').first();
  const valueText =
    valueElem.attr("data-value") || valueElem.text().trim() || null;
  const currency = valueElem.attr("data-currency") || "€";

  return {
    value: valueText,
    currency,
    url: playerUrl,
  };
}

// Beispiel-Aufruf:
//  npx ts-node scripts/getTransfermarktValue.ts "Jamal Musiala" "Bayern München"

if (require.main === module) {
  const [, , nameArg, ...clubParts] = process.argv;
  const clubArg = clubParts.join(" ");

  if (!nameArg) {
    console.error("Usage: ts-node getTransfermarktValue.ts \"Spielername\" [Verein]");
    process.exit(1);
  }

  getTransfermarktValue(nameArg, clubArg)
    .then((res) => {
      console.log("Ergebnis:", res);
    })
    .catch((err) => {
      console.error("Fehler beim Scrapen:", err);
    });
}