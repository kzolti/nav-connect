export class RequestQueue {
  private _minIntervalMs: number;
  private _lastRequestTime = 0;
  private _queue: Array<() => Promise<void>> = [];
  private _processing = false;

  constructor(minIntervalMs: number) {
    this._minIntervalMs = minIntervalMs;
  }

  markRequestSent(): void {
    this._lastRequestTime = Date.now();
  }

  /**
   * Queues `fn` so it runs at most once per `minIntervalMs` (measured from
   * the last actually sent request). The returned promise settles with
   * `fn`'s value or rejection: each queued task wires `resolve`/`reject`
   * onto `fn()` via `run().then(resolve, reject)`, so the caller always
   * receives the outcome even though the task itself never rejects.
   * When the queue is idle, `processQueue()` is started to drain it.
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this._minIntervalMs <= 0) {
      return fn();
    }

    return new Promise<T>((resolve, reject) => {
      const run = async (): Promise<T> => {
        const now = Date.now();
        const wait = this._lastRequestTime + this._minIntervalMs - now;
        if (wait > 0) {
          await RequestQueue.sleep(wait);
        }
        return fn();
      };
      this._queue.push(() => run().then(resolve, reject));
      if (!this._processing) {
        this._processing = true;
        void this.processQueue();
      }
    });
  }

  /**
   * Drains the queue as long as it is non-empty, then resets `_processing`
   * so a future `enqueue` restarts the loop. State flow:
   * - idle (`_processing === false`): the next `enqueue` flips the flag and
   *   starts `processQueue` without awaiting it.
   * - processing: further `enqueue` calls only append tasks; the running
   *   loop picks them up.
   * - each task settles its own promise (see `enqueue`), so the try/catch
   *   below is defensive only: a task must never stop the loop or strand
   *   `_processing` as `true`.
   * The `finally` guarantees `_processing` is cleared even if a task throws.
   */
  private async processQueue(): Promise<void> {
    try {
      while (this._queue.length > 0) {
        const task = this._queue.shift()!;
        try {
          await task();
        } catch {
          // Tasks settle their own promise (the caller gets the rejection via
          // .then(resolve, reject)), so this branch is defensive only: a task
          // must never stop the queue or strand _processing.
        }
      }
    } finally {
      this._processing = false;
    }
  }

  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}