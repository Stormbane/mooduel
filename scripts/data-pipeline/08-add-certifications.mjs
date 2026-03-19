/**
 * Step 8: Add MPAA/certification data from TMDB to the corpus.
 *
 * Fetches /movie/{id}/release_dates for each movie in the corpus,
 * extracts US certification (or falls back to GB, AU, DE).
 * Safe to re-run (skips movies that already have certification).
 *
 * Usage: node scripts/data-pipeline/08-add-certifications.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");
const RATE_LIMIT_MS = 55;

// Load env
const envFile = join(PROJECT_ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const match = line.match(/^(TMDB_READ_ACCESS_TOKEN)=(.+)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
if (!TOKEN) { console.error("No TMDB_READ_ACCESS_TOKEN"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Preferred countries for certification (in priority order)
const CERT_COUNTRIES = ["US", "GB", "AU", "DE", "FR", "CA"];

async function fetchCertification(tmdbId) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    for (const country of CERT_COUNTRIES) {
      const entry = (data.results || []).find((r) => r.iso_3166_1 === country);
      if (!entry) continue;
      for (const rd of entry.release_dates || []) {
        if (rd.certification && rd.certification.trim()) {
          return { certification: rd.certification.trim(), certCountry: country };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Adding Certifications to Corpus ===\n");

  const lines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
  const corpus = lines.map((l) => JSON.parse(l));

  const needCert = corpus.filter((m) => !m.certification);
  console.log(`Total corpus: ${corpus.length}`);
  console.log(`Already have cert: ${corpus.length - needCert.length}`);
  console.log(`Need certification: ${needCert.length}\n`);

  let fetched = 0;
  let empty = 0;
  const startTime = Date.now();

  for (let i = 0; i < needCert.length; i++) {
    const movie = needCert[i];

    if (i % 500 === 0 && i > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = i / elapsed;
      const eta = ((needCert.length - i) / rate / 60).toFixed(1);
      console.log(`  ${i}/${needCert.length} — ${fetched} found — ETA ${eta}min`);
    }

    const result = await fetchCertification(movie.tmdbId);
    if (result) {
      movie.certification = result.certification;
      movie.certCountry = result.certCountry;
      fetched++;
    } else {
      empty++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  const withCert = corpus.filter((m) => m.certification).length;
  console.log(`\n=== Done ===`);
  console.log(`Certifications found: ${fetched}`);
  console.log(`No certification: ${empty}`);
  console.log(`Total with cert: ${withCert}/${corpus.length} (${(withCert / corpus.length * 100).toFixed(1)}%)`);

  // Distribution
  const certCounts = {};
  for (const m of corpus) {
    if (m.certification) certCounts[m.certification] = (certCounts[m.certification] || 0) + 1;
  }
  const sorted = Object.entries(certCounts).sort((a, b) => b[1] - a[1]);
  console.log("\nCertification distribution:");
  for (const [cert, count] of sorted.slice(0, 10)) {
    console.log(`  ${cert.padEnd(8)} ${count}`);
  }

  console.log("\nWriting updated corpus...");
  const output = corpus.map((m) => JSON.stringify(m)).join("\n") + "\n";
  writeFileSync(CORPUS_FILE, output, "utf-8");
  console.log("Done.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
