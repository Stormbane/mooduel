/**
 * Run SQL migrations against Supabase Postgres.
 * Usage: npx tsx scripts/run-migrations.ts
 */

import { Client } from "pg";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase Postgres.");

  const dirs = [
    resolve(__dirname, "../supabase"),
    resolve(__dirname, "../../bt-calibrate/migrations"),
  ];

  for (const dir of dirs) {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (file === "all_migrations.sql") continue; // skip the combined file
      console.log(`Running: ${file}...`);
      const sql = readFileSync(resolve(dir, file), "utf-8");
      try {
        await client.query(sql);
        console.log("  OK");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ERROR: ${msg}`);
      }
    }
  }

  await client.end();
  console.log("Done.");
}

run().catch(console.error);
