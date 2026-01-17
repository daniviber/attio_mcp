/**
 * Token bucket rate limiter for Attio API
 * Read: 100 requests/second
 * Write: 25 requests/second
 */
export class RateLimiter {
  private readTokens: number;
  private writeTokens: number;
  private readonly maxReadTokens: number;
  private readonly maxWriteTokens: number;
  private lastRefill: number;

  constructor(
    maxReadTokens: number = 100,
    maxWriteTokens: number = 25
  ) {
    this.maxReadTokens = maxReadTokens;
    this.maxWriteTokens = maxWriteTokens;
    this.readTokens = maxReadTokens;
    this.writeTokens = maxWriteTokens;
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= 1000) {
      // Refill tokens every second
      const seconds = Math.floor(elapsed / 1000);
      this.readTokens = Math.min(
        this.maxReadTokens,
        this.readTokens + seconds * this.maxReadTokens
      );
      this.writeTokens = Math.min(
        this.maxWriteTokens,
        this.writeTokens + seconds * this.maxWriteTokens
      );
      this.lastRefill = now - (elapsed % 1000);
    }
  }

  async acquireRead(): Promise<void> {
    this.refillTokens();

    if (this.readTokens > 0) {
      this.readTokens--;
      return;
    }

    // Wait until next refill
    const waitTime = 1000 - (Date.now() - this.lastRefill);
    await this.sleep(waitTime);
    this.refillTokens();
    this.readTokens--;
  }

  async acquireWrite(): Promise<void> {
    this.refillTokens();

    if (this.writeTokens > 0) {
      this.writeTokens--;
      return;
    }

    // Wait until next refill
    const waitTime = 1000 - (Date.now() - this.lastRefill);
    await this.sleep(waitTime);
    this.refillTokens();
    this.writeTokens--;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  getStatus(): { readTokens: number; writeTokens: number } {
    this.refillTokens();
    return {
      readTokens: this.readTokens,
      writeTokens: this.writeTokens,
    };
  }
}
