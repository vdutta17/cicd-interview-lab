import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from './server.js';

for (const [path, status, expected] of [
  ['/health', 201, { status: 'ok' }],
  ['/', 200, { service: 'cicd-interview-lab', version: 'local' }],
  ['/missing', 404, { error: 'Not found' }],
]) {
  test(`GET ${path} returns ${status}`, async () => {
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), expected);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
}
