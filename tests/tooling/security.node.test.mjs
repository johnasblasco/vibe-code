import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(new URL(path, new URL('../../', import.meta.url)), 'utf8');

test('runtime execution and network imports stay confined to reviewed adapters; no eval or shell mode', () => {
  const files = globSync('src/**/*.ts', { cwd: root }); assert.ok(files.length > 0);
  for (const path of files) {
    const portable = path.replaceAll('\\', '/');
    const source = ts.createSourceFile(portable, read(portable), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const module = node.moduleSpecifier.text.replace(/^node:/, '');
        if (module === 'child_process') assert.equal(portable, 'src/doctor/process.ts');
        if (['http', 'https', 'dns', 'dns/promises', 'net', 'tls'].includes(module)) assert.equal(portable, 'src/doctor/network.ts');
        assert.ok(!['vm', 'worker_threads', 'cluster', 'module', 'ffi'].includes(module), `unreviewed capability in ${portable}`);
      }
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        if (ts.isIdentifier(node.expression)) {
          assert.ok(!['eval', 'Function', 'require'].includes(node.expression.text), `dynamic execution in ${portable}`);
          if (node.expression.text === 'fetch') assert.equal(portable, 'src/outputs/lookups.ts');
        }
        assert.ok(node.expression.kind !== ts.SyntaxKind.ImportKeyword, `dynamic import requires explicit review in ${portable}`);
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(source).replaceAll(/['"]/g, '') === 'shell') assert.equal(node.initializer.kind, ts.SyntaxKind.FalseKeyword);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test('dependencies are exact, registry-locked and integrity-bound, with no root install lifecycle or publication', () => {
  const manifest = JSON.parse(read('package.json')); const lock = JSON.parse(read('package-lock.json'));
  assert.equal(manifest.private, true); assert.equal(manifest.bin, undefined);
  for (const name of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly', 'publish', 'postpublish']) assert.equal(manifest.scripts[name], undefined);
  for (const section of ['dependencies', 'devDependencies']) {
    assert.deepEqual(lock.packages[''][section], manifest[section]);
    for (const version of Object.values(manifest[section])) assert.match(version, /^\d+\.\d+\.\d+$/);
  }
  for (const [path, dependency] of Object.entries(lock.packages)) {
    if (!path) continue;
    assert.match(dependency.resolved, /^https:\/\/registry\.npmjs\.org\//, `unapproved source in ${path}`);
    assert.match(dependency.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/, `missing integrity in ${path}`);
    assert.equal(dependency.link, undefined);
  }
});

test('CI runs offline security/integrity policies plus the dependency audit with ignored install scripts', () => {
  const manifest = JSON.parse(read('package.json')); const workflow = read('.github/workflows/ci.yml');
  assert.equal(manifest.scripts['test:security'], 'node --test tests/tooling/security.node.test.mjs');
  assert.ok(workflow.includes('npm run test:security'));
  assert.ok(workflow.includes('node tools/update-integrity.mjs'));
  assert.match(workflow, /npm ci --ignore-scripts/); assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /permissions: \{\}/); assert.ok(!workflow.includes('pull_request_target'));
  for (const [, action] of workflow.matchAll(/uses:\s*(\S+)/g)) assert.match(action, /^[\w.-]+\/[\w.-]+@[a-f0-9]{40}$/);
});
