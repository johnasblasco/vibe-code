import { expect, test } from 'vitest';
import { validateAnswerForQuestion } from '../../src/state/index.js';
import { loadYamlFile } from '../../src/data/loader.js';
import { fileURLToPath } from 'node:url';
const fixture = (await loadYamlFile(fileURLToPath(new URL('../../', import.meta.url)), 'tests/security-scenarios/cli-hardening.yaml')).data;

test('proposal eligibility validates the current question without accepting or persisting an answer', () => {
  const question = fixture.proposal_question;
  const before = structuredClone(question);
  expect(validateAnswerForQuestion(question, { state: 'answered', value: false })).toEqual({ state: 'answered', value: false });
  expect(question).toEqual(before);
  expect(() => validateAnswerForQuestion(question, { state: 'answered', value: 'unknown' })).toThrow();
  expect(() => validateAnswerForQuestion(question, { state: 'not_applicable', reason: 'reason' })).toThrow();
  expect(() => validateAnswerForQuestion({ type: 'boolean' }, { state: 'answered', value: 'false' })).toThrow();
  expect(() => validateAnswerForQuestion({ type: 'boolean', states_allowed: ['deferred'] }, { state: 'answered', value: false })).toThrow();
  expect(() => validateAnswerForQuestion({ type: 'text' }, { state: 'answered', value: 'Authorization: Bearer synthetic-fixture' })).toThrow();
});
