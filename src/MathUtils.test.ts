import { describe, expect, it } from "vitest";
import { MathUtils } from "./MathUtils";

describe("MathUtils.clamp", () => {
    it("returns the value when inside the range", () => {
        expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    });

    it("clamps to the minimum below the range", () => {
        expect(MathUtils.clamp(-1, 0, 10)).toBe(0);
    });

    it("clamps to the maximum above the range", () => {
        expect(MathUtils.clamp(11, 0, 10)).toBe(10);
    });
});

describe("MathUtils.lerp", () => {
    it("returns the endpoints at t = 0 and t = 1", () => {
        expect(MathUtils.lerp(2, 8, 0)).toBe(2);
        expect(MathUtils.lerp(2, 8, 1)).toBe(8);
    });

    it("interpolates linearly", () => {
        expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
    });
});

describe("MathUtils.smoothstep", () => {
    it("clamps outside the edges", () => {
        expect(MathUtils.smoothstep(0, 1, -5)).toBe(0);
        expect(MathUtils.smoothstep(0, 1, 5)).toBe(1);
    });

    it("is 0.5 at the midpoint", () => {
        expect(MathUtils.smoothstep(0, 1, 0.5)).toBe(0.5);
    });

    it("eases in and out of the edges", () => {
        expect(MathUtils.smoothstep(0, 1, 0.1)).toBeLessThan(0.1);
        expect(MathUtils.smoothstep(0, 1, 0.9)).toBeGreaterThan(0.9);
    });
});

describe("MathUtils.mod", () => {
    it("behaves like modulo for positives", () => {
        expect(MathUtils.mod(7, 4)).toBe(3);
    });

    it("wraps negatives into the positive range", () => {
        expect(MathUtils.mod(-1, 4)).toBe(3);
    });
});

describe("MathUtils.hash2", () => {
    it("is deterministic for the same inputs", () => {
        expect(MathUtils.hash2(3, 7, 42)).toBe(MathUtils.hash2(3, 7, 42));
    });

    it("changes with the seed", () => {
        expect(MathUtils.hash2(3, 7, 1)).not.toBe(MathUtils.hash2(3, 7, 2));
    });

    it("stays in [0, 1)", () => {
        for (let i = 0; i < 100; i++) {
            const value = MathUtils.hash2(i, i * 31, 7);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });
});
