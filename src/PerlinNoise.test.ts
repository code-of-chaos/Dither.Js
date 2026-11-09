import { describe, expect, it } from "vitest";
import { PerlinNoise } from "./PerlinNoise";

describe("PerlinNoise", () => {
    it("stays within [-1, 1]", () => {
        const noise = new PerlinNoise(8, 1234);
        for (let y = 0; y < 40; y++) {
            for (let x = 0; x < 40; x++) {
                const value = noise.sample(x * 0.37, y * 0.41);
                expect(value).toBeGreaterThanOrEqual(-1);
                expect(value).toBeLessThanOrEqual(1);
            }
        }
    });

    it("tiles seamlessly across the period in both axes", () => {
        const period = 8;
        const noise = new PerlinNoise(period, 99);
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const base = noise.sample(x * 0.7, y * 0.7);
                expect(noise.sample(x * 0.7 + period, y * 0.7)).toBeCloseTo(
                    base,
                    12,
                );
                expect(noise.sample(x * 0.7, y * 0.7 + period)).toBeCloseTo(
                    base,
                    12,
                );
            }
        }
    });

    it("is deterministic per seed and varies between seeds", () => {
        const a = new PerlinNoise(8, 1);
        const b = new PerlinNoise(8, 1);
        const c = new PerlinNoise(8, 2);
        expect(a.sample(1.25, 3.5)).toBe(b.sample(1.25, 3.5));
        expect(a.sample(1.25, 3.5)).not.toBe(c.sample(1.25, 3.5));
    });
});
