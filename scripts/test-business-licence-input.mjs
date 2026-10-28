import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/business-licence-input.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { normalizeBusinessNumber: normalize, validBusinessNumber: valid } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

test('sales accept English, Hindi and Kannada numerals and Indian or western grouping', () => {
  for (const input of ['1200000', '12,00,000', '1,200,000', '१२,००,०००', '೧೨,೦೦,೦೦೦', ' 1200000 ']) {
    assert.equal(valid(input), true, input);
    assert.equal(normalize(input), '1200000', input);
  }
  assert.equal(normalize('೧೨೩.೪೫'), '123.45');
  assert.equal(valid('१२३.४५'), true);
});

test('unknown stays unknown, zero stays zero and workers must be whole numbers', () => {
  assert.equal(valid(''), true);
  assert.equal(normalize(' '), '');
  assert.equal(normalize('०'), '0');
  assert.equal(valid('೦', true), true);
  assert.equal(valid('3.5', true), false);
  assert.equal(valid('१०', true), true);
});

test('malformed, negative, infinite and oversized values cannot pass numeric validation', () => {
  for (const input of [',', '1,,2', '12,34', '1 2', '-1', '1e9', 'Infinity', 'NaN', '<script>', '10.001', '10000000000001']) assert.equal(valid(input), false, input);
  assert.equal(valid('10000001', true), false);
});
