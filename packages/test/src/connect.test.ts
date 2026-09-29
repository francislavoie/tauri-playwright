import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { connectTauri } from './connect.js';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe('connectTauri', () => {
  it('connects to a running TCP app without navigating it', async () => {
    const commands: unknown[] = [];
    const server = createServer((socket) => {
      socket.on('data', (data) => {
        for (const line of data.toString().trim().split('\n')) {
          commands.push(JSON.parse(line));
          socket.write(JSON.stringify({ ok: true, data: 'ready' }) + '\n');
        }
      });
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');

    const connection = await connectTauri({ tcpPort: address.port, timeout: 1000 });
    try {
      expect(await connection.page.evaluate('document.title')).toBe('ready');
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({ type: 'ping' });
    } finally {
      connection.close();
    }
  });

  it('rejects invalid ports before connecting', async () => {
    await expect(connectTauri({ tcpPort: 65536 })).rejects.toThrow('Invalid');
  });
});
