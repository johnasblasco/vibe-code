import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadKit, loadYamlFile } from '../../src/data/loader.js';
import { decide } from '../../src/engine/index.js';
import type { Environment } from '../../src/expressions/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const kit = await loadKit(root);
const scenarios = await Promise.all((await readdir(new URL('../scenarios/', import.meta.url))).sort()
  .filter((name) => name.endsWith('.yaml')).map(async (name) =>
    (await loadYamlFile(root, `tests/scenarios/${name}`)).data as {
      id: string; answers: Environment; expect: Record<string, string | boolean | number | string[]>;
    }));

test.each(scenarios)('acceptance persona: $id', (scenario) => {
  const result = decide(kit, scenario.answers);
  const expected = scenario.expect;
  const consumed = new Set<string>();
  for (const [key, field] of [['tier', result.tier], ['stop', result.stop]] as const) {
    if (key in expected) { expect(field).toBe(expected[key]); consumed.add(key); }
  }
  const collections = {
    loads: result.files, questions: result.questionIds, gates: result.gates,
    failure_modes: result.failureModes.map((entry) => entry.id),
    contradictions: result.contradictions.map((rule) => rule.id),
  };
  for (const [prefix, values] of Object.entries(collections)) {
    for (const suffix of ['include', 'exclude']) {
      const key = `${prefix}_${suffix}`;
      if (!(key in expected)) continue;
      consumed.add(key);
      for (const value of expected[key] as string[]) {
        const found = prefix === 'loads'
          ? values.some((item) => item === value || item.startsWith(value.replace(/\*+$/, '')))
          : values.includes(value);
        expect(found, `${scenario.id}: ${key} ${value}`).toBe(suffix === 'include');
      }
    }
  }
  for (const [key, count] of Object.entries({
    max_standard_questions: result.depths.standard.length,
    max_idea_questions: result.counts.idea,
    max_idea_needing_input: result.counts.ideaNeedingInput,
  })) {
    if (!(key in expected)) continue;
    consumed.add(key);
    expect(count, `${scenario.id}: ${key}`).toBeLessThanOrEqual(expected[key] as number);
  }
  expect([...consumed].sort(), 'Every YAML assertion must be exercised').toEqual(Object.keys(expected).sort());
  console.log(`PASS ${scenario.id}: ${result.tier}; idea ${result.counts.idea}, need input ${result.counts.ideaNeedingInput}`);
});
