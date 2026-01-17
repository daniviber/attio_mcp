import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter } from "../../src/utils/rate-limiter.js";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(100, 25);
  });

  describe("acquireRead", () => {
    it("should immediately grant read tokens when available", async () => {
      const start = Date.now();
      await rateLimiter.acquireRead();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("should decrement read tokens after acquiring", async () => {
      const statusBefore = rateLimiter.getStatus();
      await rateLimiter.acquireRead();
      const statusAfter = rateLimiter.getStatus();

      expect(statusAfter.readTokens).toBe(statusBefore.readTokens - 1);
    });
  });

  describe("acquireWrite", () => {
    it("should immediately grant write tokens when available", async () => {
      const start = Date.now();
      await rateLimiter.acquireWrite();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("should decrement write tokens after acquiring", async () => {
      const statusBefore = rateLimiter.getStatus();
      await rateLimiter.acquireWrite();
      const statusAfter = rateLimiter.getStatus();

      expect(statusAfter.writeTokens).toBe(statusBefore.writeTokens - 1);
    });
  });

  describe("getStatus", () => {
    it("should return current token counts", () => {
      const status = rateLimiter.getStatus();

      expect(status).toHaveProperty("readTokens");
      expect(status).toHaveProperty("writeTokens");
      expect(status.readTokens).toBe(100);
      expect(status.writeTokens).toBe(25);
    });
  });

  describe("token exhaustion", () => {
    it("should exhaust read tokens after 100 rapid requests", async () => {
      const limiter = new RateLimiter(5, 2);

      for (let i = 0; i < 5; i++) {
        await limiter.acquireRead();
      }

      const status = limiter.getStatus();
      expect(status.readTokens).toBe(0);
    });

    it("should exhaust write tokens after 25 rapid requests", async () => {
      const limiter = new RateLimiter(5, 2);

      for (let i = 0; i < 2; i++) {
        await limiter.acquireWrite();
      }

      const status = limiter.getStatus();
      expect(status.writeTokens).toBe(0);
    });
  });

  describe("token refill", () => {
    it("should refill tokens after 1 second", async () => {
      const limiter = new RateLimiter(5, 2);

      // Exhaust tokens
      for (let i = 0; i < 5; i++) {
        await limiter.acquireRead();
      }

      // Wait for refill
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const status = limiter.getStatus();
      expect(status.readTokens).toBeGreaterThan(0);
    });
  });
});
