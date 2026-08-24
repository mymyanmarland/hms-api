// kysely runtime patch: kysely@0.29.2 removed the legacy migration constants
// from its ESM index.js even though the type stubs still declare them. The
// @better-auth/kysely-adapter (pulled in transitively by better-auth) imports
// these constants at module load time, so without them the RSC/server-worker
// bundle fails with "Export DEFAULT_MIGRATION_LOCK_TABLE doesn't exist in
// target module". The project doesn't use the kysely adapter (it uses
// prismaAdapter), so these stubs are only needed to satisfy the import.
//
// Lives in hms-api/scripts/ so Vercel (which deploys the hms-api root) can
// run it from `npm install`'s postinstall hook. The patch target is therefore
// resolved relative to this file's own location.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(
  __dirname,
  "..",
  "node_modules",
  "kysely",
  "dist",
  "index.js",
);

const MARKER =
  "export const DEFAULT_MIGRATION_TABLE = 'kysely_migration';\nexport const DEFAULT_MIGRATION_LOCK_TABLE = 'kysely_migration_lock';";

const PATCH = `
// kysely runtime patch: kysely@0.29.2 removed the legacy migration constants
// from its ESM index.js even though the type stubs still declare them. The
// @better-auth/kysely-adapter (pulled in transitively by better-auth) imports
// these constants at module load time, so without them the RSC/server-worker
// bundle fails with "Export DEFAULT_MIGRATION_LOCK_TABLE doesn't exist in
// target module". The project doesn't use the kysely adapter (it uses
// prismaAdapter), so these stubs are only needed to satisfy the import.
export const DEFAULT_MIGRATION_TABLE = 'kysely_migration';
export const DEFAULT_MIGRATION_LOCK_TABLE = 'kysely_migration_lock';
`;

const original = await readFile(target, "utf8");
if (original.includes(MARKER)) {
  console.log("kysely migration constants already patched, skipping.");
  process.exit(0);
}

if (!original.endsWith("\n")) {
  await writeFile(target, original + "\n", "utf8");
}

await writeFile(target, original + PATCH, "utf8");
console.log("Patched kysely runtime to export DEFAULT_MIGRATION_TABLE and DEFAULT_MIGRATION_LOCK_TABLE.");
