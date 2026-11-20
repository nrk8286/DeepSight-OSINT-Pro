import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Import the Worker module without changing this repository's CommonJS tooling.
const source = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

for (const route of ['/api/images/list', '/api/search?q=sample', '/api/stats']) {
  test(`${route} reports a failed database instead of an empty success`, async () => {
    const DB = { prepare() { throw new Error('database offline'); } };
    const response = await worker.fetch(new Request(`https://api.example.test${route}`), { DB });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'database_unavailable' });
  });
}

test('binding status does not invent a database binding', async () => {
  const response = await worker.fetch(new Request('https://api.example.test/api/status'), {});
  assert.equal((await response.json()).info.d1, false);
});
