import assert from 'node:assert/strict';
import { toAnalysisView, uploadAnalysis } from '../src/services/analysis.js';

// Receives a real TestClient response from the Python contract test through stdin.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const data = JSON.parse(input);
const view = toAnalysisView(data);
assert.equal(view.confidence, (data.prediction.confidence * 100).toFixed(1));
assert.equal(view.rows.length, 3);
assert.equal(view.isMock, true);
assert.equal(view.raw, data);
const broken = structuredClone(data);
broken.fft.magnitudeDb.pop();
assert.throws(() => toAnalysisView(broken));
const invalid = structuredClone(data);
invalid.prediction.confidence = 96.8;
assert.throws(() => toAnalysisView(invalid));
globalThis.fetch = async (url, options) => {
  assert.ok(url.endsWith('/api/test/analyze'));
  assert.equal(options.method, 'POST');
  assert.ok(options.body.get('file'));
  return { ok: true, json: async () => data };
};
assert.equal((await uploadAnalysis(new Blob(['audio']))).main, view.main);
globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ detail: 'invalid audio' }) });
await assert.rejects(uploadAnalysis(new Blob(['audio'])), /invalid audio/);
