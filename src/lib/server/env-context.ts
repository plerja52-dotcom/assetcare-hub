// Exposes the Cloudflare Worker `env` (which carries `env.DB` for D1) to any
// server-route handler that runs inside a request. Populated in src/server.ts.
// In `vite dev` our custom fetch handler is bypassed, so getEnv() returns
// undefined and the DB layer falls back to JSON-file storage.
import { AsyncLocalStorage } from "node:async_hooks";

export interface WorkerEnv {
  DB?: D1DatabaseLike;
  [k: string]: unknown;
}

export interface D1DatabaseLike {
  prepare(sql: string): {
    bind: (...args: unknown[]) => {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
  batch(statements: unknown[]): Promise<unknown>;
  exec(sql: string): Promise<unknown>;
}

const envStore = new AsyncLocalStorage<{ env: WorkerEnv }>();

export function runWithEnv<T>(env: WorkerEnv, fn: () => T): T {
  return envStore.run({ env }, fn);
}

export function getEnv(): WorkerEnv | undefined {
  return envStore.getStore()?.env;
}
