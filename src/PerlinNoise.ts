import { MathUtils } from "./MathUtils";

/**
 * Tileable 2D Perlin gradient noise. Lattice coordinates wrap at `period`,
 * so sampling the [0, period) cell range produces a seamless tile.
 * Raw output is roughly in [-1, 1] (see FractalBrownianNoise for normalized values).
 */
export class PerlinNoise {
    private static readonly GRADIENTS: ReadonlyArray<
        readonly [number, number]
    > = Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return [Math.cos(angle), Math.sin(angle)] as const;
    });

    constructor(
        private readonly period: number,
        private readonly seed: number,
    ) {}

    sample(x: number, y: number): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const fx = x - x0;
        const fy = y - y0;

        const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
        const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

        const ix0 = MathUtils.mod(x0, this.period);
        const iy0 = MathUtils.mod(y0, this.period);
        const ix1 = MathUtils.mod(x0 + 1, this.period);
        const iy1 = MathUtils.mod(y0 + 1, this.period);

        const n00 = this.gradientDot(ix0, iy0, fx, fy);
        const n10 = this.gradientDot(ix1, iy0, fx - 1, fy);
        const n01 = this.gradientDot(ix0, iy1, fx, fy - 1);
        const n11 = this.gradientDot(ix1, iy1, fx - 1, fy - 1);

        return MathUtils.lerp(
            MathUtils.lerp(n00, n10, u),
            MathUtils.lerp(n01, n11, u),
            v,
        );
    }

    private gradientDot(
        ix: number,
        iy: number,
        dx: number,
        dy: number,
    ): number {
        const gradients = PerlinNoise.GRADIENTS;
        const g =
            gradients[
                Math.floor(
                    MathUtils.hash2(ix, iy, this.seed) * gradients.length,
                ) % gradients.length
            ];
        return g[0] * dx + g[1] * dy;
    }
}
