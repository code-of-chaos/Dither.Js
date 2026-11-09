/**
 * Small math helpers used by the noise and dither pipeline.
 * The standard Math library has no clamp/lerp/smoothstep/mod equivalents.
 */
export class MathUtils {
    static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    static smoothstep(edge0: number, edge1: number, x: number): number {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    static mod(value: number, period: number): number {
        return ((value % period) + period) % period;
    }

    static hash2(x: number, y: number, seed: number): number {
        let h =
            Math.imul(x, 374761393)
            ^ Math.imul(y, 668265263)
            ^ Math.imul(seed, 2246822519);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
}
