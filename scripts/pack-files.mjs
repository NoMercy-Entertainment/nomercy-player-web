// Copies the root LICENSE and the contributor documents a package lists in `files`
// into the package while it is packed. Usage: node ../../scripts/pack-files.mjs copy|clean
import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCUMENTS = ['CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'RELEASING.md', 'SECURITY.md'];

const packageDir = process.cwd();
const { files = [] } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
const wanted = ['LICENSE', ...DOCUMENTS.filter((name) => files.includes(name))];

for (const name of wanted) {
  const target = join(packageDir, name);

  if (process.argv[2] === 'copy') {
    copyFileSync(join(ROOT, name), target);
  } else if (existsSync(target)) {
    rmSync(target);
  }
}
