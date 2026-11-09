import { describe, expect, it } from "vitest";
import { FractalBrownianNoise } from "./FractalBrownianNoise";

describe("FractalBrownianNoise", () => {
    it("normalizes output to [0, 1]", () => {
        const noise = new FractalBrownianNoise(64, 16, 3, 7);
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const value = noise.sample(x * 1.3, y * 1.3);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(1);
            }
        }
    });

    it("produces variation rather than a flat field", () => {
        const noise = new FractalBrownianNoise(64, 16, 3, 7);
        const values = new Set<number>();
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                values.add(noise.sample(x, y));
            }
        }
        expect(values.size).toBeGreaterThan(1);
    });

    it("tiles seamlessly across the full cell range", () => {
        const cells = 64;
        const noise = new FractalBrownianNoise(cells, 16, 3, 21);
        for (let y = 0; y < cells; y += 7) {
            for (let x = 0; x < cells; x += 7) {
                expect(noise.sample(x + cells, y)).toBe(noise.sample(x, y));
                expect(noise.sample(x, y + cells)).toBe(noise.sample(x, y));
            }
        }
    });
});
