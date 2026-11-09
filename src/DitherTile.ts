import { FractalBrownianNoise } from "./FractalBrownianNoise";
import { MathUtils } from "./MathUtils";
import { RgbColor } from "./RgbColor";

/**
 * All visual knobs of the tile. `scale`/`octaves` shape the large island
 * field, `detail*` the fine detail field; `clampLow`/`clampHigh` soft-clip
 * the blend (clean voids at the low end, no saturation at the high end),
 * `maxFill` caps how dense the dither can get, and `jitter` blends the
 * Bayer threshold with per-pixel random values for an organic look.
 */
export type DitherTileOptions = {
    cells: number;
    color: string;
    density: number;
    contrast: number;
    scale: number;
    octaves: number;
    detailScale: number;
    detailOctaves: number;
    detailStrength: number;
    clampLow: number;
    clampHigh: number;
    seed: number;
    maxFill: number;
    jitter: number;
};

/**
 * Renders a seamless dithered noise tile as a PNG data URL.
 *
 * Per pixel: the island and detail noise fields are blended into a density
 * value, soft-clamped, then thresholded against a Bayer matrix mixed with
 * per-pixel jitter to decide whether the pixel is inked. Because the noise
 * fields tile seamlessly, the resulting image can be repeated and scrolled
 * forever without visible seams.
 */
export class DitherTile {
    static readonly DEFAULT_CELLS = 512;

    private static readonly BAYER_4X4 = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ].map((row) => row.map((v) => (v + 0.5) / 16));

    private readonly islands: FractalBrownianNoise;
    private readonly detail: FractalBrownianNoise;

    constructor(private readonly options: DitherTileOptions) {
        this.islands = new FractalBrownianNoise(
            options.cells,
            options.scale,
            options.octaves,
            options.seed,
        );
        this.detail = new FractalBrownianNoise(
            options.cells,
            options.detailScale,
            options.detailOctaves,
            options.seed + 31337,
        );
    }

    toDataURL(): string {
        const {
            cells,
            color,
            density,
            contrast,
            detailStrength,
            clampLow,
            clampHigh,
            seed,
            maxFill,
            jitter,
        } = this.options;

        const canvas = document.createElement("canvas");
        canvas.width = cells;
        canvas.height = cells;

        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        const rgb = RgbColor.fromCss(ctx, color);
        const image = ctx.createImageData(cells, cells);
        const data = image.data;

        for (let y = 0; y < cells; y++) {
            for (let x = 0; x < cells; x++) {
                const island = this.islands.sample(x, y);
                const detail = this.detail.sample(x, y);
                const combined = MathUtils.clamp(
                    island + (detail - 0.5) * detailStrength,
                    0,
                    1,
                );
                const n = MathUtils.smoothstep(
                    clampLow,
                    Math.max(clampHigh, clampLow + 0.001),
                    combined,
                );
                const p = MathUtils.clamp(
                    (n - 0.5) * contrast + density,
                    0,
                    maxFill,
                );
                const bayer = DitherTile.BAYER_4X4[y % 4][x % 4];
                const threshold =
                    bayer * (1 - jitter)
                    + MathUtils.hash2(x, y, seed + 991) * jitter;

                if (threshold < p) {
                    const i = (y * cells + x) * 4;
                    data[i] = rgb.r;
                    data[i + 1] = rgb.g;
                    data[i + 2] = rgb.b;
                    data[i + 3] = Math.round(
                        255 * MathUtils.clamp(0.4 + 0.6 * n, 0, 1),
                    );
                }
            }
        }

        ctx.putImageData(image, 0, 0);
        return canvas.toDataURL("image/png");
    }
}
