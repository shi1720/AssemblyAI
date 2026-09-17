import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
function query(sql) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "./node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      process.env.BENCHBACK_LOCAL_STATE || ".wrangler/state",
      "--command",
      sql,
      "--json",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}
query(
  "CREATE TABLE IF NOT EXISTS benchback_local_migrations (name TEXT PRIMARY KEY NOT NULL)",
);
const applied = new Set(
  query("SELECT name FROM benchback_local_migrations")[0].results.map(
    (x) => x.name,
  ),
);
for (const file of readdirSync("drizzle")
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort()) {
  if (applied.has(file)) continue;
  // Only committed migration filenames (digits, letters, underscores, dots) enter SQL.
  if (!/^[\w.]+$/.test(file)) throw new Error("Invalid migration name");
  query(
    readFileSync("drizzle/" + file, "utf8") +
      `\nINSERT INTO benchback_local_migrations(name) VALUES ('${file}');`,
  );
  console.log("Applied " + file);
}
console.log("Local D1 migrations are up to date.");
