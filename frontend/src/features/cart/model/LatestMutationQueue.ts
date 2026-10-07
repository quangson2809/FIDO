export interface MutationHandlers<T> {
  onLatestSuccess: (value: T) => void;
  onLatestError: () => void | Promise<void>;
}

/**
 * Serializes write operations and only publishes the newest queued result.
 * This keeps server responses from overwriting a newer cart intent.
 */
export class LatestMutationQueue<T> {
  private tail: Promise<void> = Promise.resolve();
  private generation = 0;

  enqueue(operation: () => Promise<T>, handlers: MutationHandlers<T>): void {
    const operationGeneration = ++this.generation;

    this.tail = this.tail.then(async () => {
      try {
        const value = await operation();
        if (operationGeneration === this.generation) {
          handlers.onLatestSuccess(value);
        }
      } catch {
        if (operationGeneration === this.generation) {
          await handlers.onLatestError();
        }
      }
    });
  }

  invalidate(): void {
    this.generation += 1;
  }
}
