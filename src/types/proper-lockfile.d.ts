declare module 'proper-lockfile' {
  export interface LockOptions {
    retries?: number;
    stale?: number;
    realpath?: boolean;
    lockfilePath?: string;
  }

  export function lock(path: string, options?: LockOptions): Promise<() => Promise<void>>;
}