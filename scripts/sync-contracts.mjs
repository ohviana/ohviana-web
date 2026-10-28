// Copies @ohviana/contracts and @ohviana/shared from ohviana-apis (their source of truth) into
// packages/. Run after the API's contract changes, then commit the result.
//   npm run sync:contracts            copy from ../ohviana-apis (or OHVIANA_APIS_DIR)
//   npm run sync:contracts:check      exit 1 if the copy is out of date (for CI)
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const apis = resolve(root, process.env.OHVIANA_APIS_DIR ?? '../ohviana-apis');
const PACKAGES = ['contracts', 'shared'];
const check = process.argv.includes('--check');

if (!existsSync(join(apis, 'packages'))) {
  console.error(`ohviana-apis not found at ${apis} (set OHVIANA_APIS_DIR).`);
  process.exit(1);
}

/** Relative paths of every file under `dir`. */
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => !f.split(/[\\/]/).includes('node_modules') && statSync(join(dir, f)).isFile())
    .sort();
}

let stale = 0;
for (const name of PACKAGES) {
  const from = join(apis, 'packages', name);
  const to = join(root, 'packages', name);
  if (check) {
    const a = files(from);
    const b = files(to);
    const changed = [...new Set([...a, ...b])].filter(
      (f) =>
        !a.includes(f) ||
        !b.includes(f) ||
        !readFileSync(join(from, f)).equals(readFileSync(join(to, f))),
    );
    for (const f of changed) console.error(`out of date: packages/${name}/${f}`);
    stale += changed.length;
  } else {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, {
      recursive: true,
      filter: (src) => !relative(from, src).split(/[\\/]/).includes('node_modules'),
    });
    console.warn(`synced packages/${name} from ${relative(root, from)}`);
  }
}
if (check && stale) {
  console.error('Run `npm run sync:contracts` and commit the result.');
  process.exit(1);
}
if (check) console.warn('contracts and shared match ohviana-apis.');
