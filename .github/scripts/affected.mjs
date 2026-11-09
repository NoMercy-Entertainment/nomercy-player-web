// Prints the CI matrix for the packages a change touches, plus their dependents.
// Usage: node .github/scripts/affected.mjs <base-sha|all> [head-sha]
// A change outside packages/ (root config, lockfile, workflows) selects every package.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, appendFileSync } from 'node:fs';

const [base = 'all', head = 'HEAD'] = process.argv.slice(2);
const SHORT = { 'video-player': 'video', 'music-player': 'music' };

const dirs = readdirSync('packages').filter(d => existsSync(`packages/${d}/package.json`));
const manifests = Object.fromEntries(dirs.map(d => [d, JSON.parse(readFileSync(`packages/${d}/package.json`, 'utf8'))]));
const byName = Object.fromEntries(dirs.map(d => [manifests[d].name, d]));

const workspaceDeps = d => ['dependencies', 'devDependencies', 'peerDependencies']
  .flatMap(k => Object.entries(manifests[d][k] ?? {}))
  .filter(([n, v]) => byName[n] && String(v).startsWith('workspace:'))
  .map(([n]) => byName[n]);

const reach = (d, seen = new Set()) => {
  for (const dep of workspaceDeps(d)) {
    if (!seen.has(dep)) { seen.add(dep); reach(dep, seen); }
  }
  return seen;
};

let selected;
let reason;
if (base === 'all' || /^0+$/.test(base)) {
  selected = new Set(dirs);
  reason = 'no base: all packages';
} else {
  const files = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const outside = files.filter(f => !f.startsWith('packages/'));
  if (outside.length) {
    selected = new Set(dirs);
    reason = `root change (${outside[0]}): all packages`;
  } else {
    const touched = new Set(files.map(f => f.split('/')[1]).filter(d => dirs.includes(d)));
    selected = new Set(touched);
    for (const d of dirs) {
      if ([...reach(d)].some(dep => touched.has(dep))) selected.add(d);
    }
    reason = `touched: ${[...touched].join(', ') || 'none'}`;
  }
}

const include = dirs.filter(d => selected.has(d)).map((d) => {
  const s = manifests[d].scripts ?? {};
  return {
    short: SHORT[d] ?? d,
    dir: d,
    name: manifests[d].name,
    typecheck: Boolean(s.typecheck),
    lint: Boolean(s.lint),
    test: Boolean(s.test),
    build: s['build:all'] ? 'build:all' : (s.build ? 'build' : ''),
    e2e: Boolean(s['test:e2e']),
    needs_core: reach(d).has('core'),
  };
});

console.error(`affected: ${reason} -> ${include.map(i => i.short).join(', ') || 'none'}`);
const matrix = JSON.stringify({ include });
console.log(matrix);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${matrix}\nany=${include.length > 0}\n`);
}
