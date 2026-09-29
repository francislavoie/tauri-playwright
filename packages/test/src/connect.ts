import { PluginClient } from './socket-client.js';
import { TauriPage } from './tauri-page.js';

export interface TauriConnectionOptions {
  /** Unix socket path. Defaults to /tmp/tauri-playwright.sock on Unix. */
  socketPath?: string;
  /** TCP port on 127.0.0.1. Defaults to TAURI_PW_TCP_PORT or 6274 on Windows. */
  tcpPort?: number;
  /** Time to wait for a running app, in milliseconds. Defaults to 30000. */
  timeout?: number;
}

export interface TauriConnection {
  page: TauriPage;
  close(): void;
}

/** Connect to an already-running Tauri app without starting a test runner or reloading it. */
export async function connectTauri(options: TauriConnectionOptions = {}): Promise<TauriConnection> {
  const envPort = process.env.TAURI_PW_TCP_PORT;
  const tcpPort =
    options.tcpPort ??
    (process.platform === 'win32' && !options.socketPath ? Number(envPort || 6274) : undefined);
  const socketPath = tcpPort ? undefined : (options.socketPath ?? '/tmp/tauri-playwright.sock');
  if (tcpPort !== undefined && (!Number.isInteger(tcpPort) || tcpPort < 1 || tcpPort > 65535)) {
    throw new Error(`Invalid Tauri Playwright TCP port: ${tcpPort}`);
  }

  const deadline = Date.now() + (options.timeout ?? 30000);
  let lastError: unknown;
  do {
    const client = new PluginClient(socketPath, tcpPort);
    try {
      await client.connect();
      const response = await client.send({ type: 'ping' });
      if (!response.ok) throw new Error(response.error ?? 'Plugin ping failed');
      return { page: new TauriPage(client), close: () => client.disconnect() };
    } catch (error) {
      client.disconnect();
      lastError = error;
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } while (Date.now() <= deadline);
  throw new Error(
    `Could not connect to Tauri Playwright at ${tcpPort ? `127.0.0.1:${tcpPort}` : socketPath}: ${String(lastError)}`,
  );
}
