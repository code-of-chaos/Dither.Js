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
 * Renders seamless dithered noise tiles as PNG data URLs.
 *
 * Per pixel: the island and detail noise fields are blended into a density
 * value, soft-clamped, then thresholded against a Bayer matrix mixed with
 * per-pixel jitter to decide whether the pixel is inked. Because the noise
 * fields tile seamlessly, the resulting image can be repeated forever
 * without visible seams.
 *
 * `toDataURLFrames` animates the pattern ("evolve + boil"): independent
 * seamless density fields (anchors) are blended around a closed circle so
 * the shapes dissolve and reform, while the Bayer phase and the jitter hash
 * are re-rolled every frame so the dots themselves boil. The frame set
 * wraps invisibly - frame `count` would equal frame 0 - so cycling the
 * frames loops without a seam.
 */
export class DitherTile {
    static readonly DEFAULT_CELLS = 512;

    private static readonly BAYER_4X4 = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ].map((row) => row.map((v) => (v + 0.5) / 16));

    private static readonly EVOLVE_ANCHORS = 3;

    constructor(private readonly options: DitherTileOptions) {}

    /** A single static tile - the first frame of the animation. */
    toDataURL(): string {
        return this.toDataURLFrames(1)[0];
    }

    toDataURLFrames(count: number): string[] {
        const {
            cells,
            color,
            density,
            contrast,
            clampLow,
            clampHigh,
            seed,
            maxFill,
            jitter,
        } = this.options;
        const frameCount = Math.max(1, Math.round(count));
        const anchors = DitherTile.EVOLVE_ANCHORS;

        const canvas = document.createElement("canvas");
        canvas.width = cells;
        canvas.height = cells;

        const ctx = canvas.getContext("2d");
        if (!ctx) return Array.from({ length: frameCount }, () => "");

        const rgb = RgbColor.fromCss(ctx, color);
        const cache: (Float32Array | undefined)[] = [
            undefined,
            undefined,
            undefined,
        ];

        const frames: string[] = [];
        for (let j = 0; j < frameCount; j++) {
            const pos = (j * anchors) / frameCount;
            const base = Math.floor(pos);
            const i0 = base % anchors;
            const frac = MathUtils.smoothstep(0, 1, pos - base);
            const field0 = DitherTile.field(cache, i0, this.options);
            const field1 =
                frac > 0
                    ? DitherTile.field(cache, (i0 + 1) % anchors, this.options)
                    : field0;

            const image = ctx.createImageData(cells, cells);
            const data = image.data;
            const bx = j % 4;
            const by = Math.floor(j / 4) % 4;

            for (let y = 0; y < cells; y++) {
                for (let x = 0; x < cells; x++) {
                    const i = y * cells + x;
                    const combined =
                        frac > 0
                            ? MathUtils.lerp(field0[i], field1[i], frac)
                            : field0[i];
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
                    const bayer =
                        DitherTile.BAYER_4X4[(y + by) % 4][(x + bx) % 4];
                    const threshold =
                        bayer * (1 - jitter)
                        + MathUtils.hash2(x, y, seed + 991 + j * 7919) * jitter;

                    if (threshold < p) {
                        const o = i * 4;
                        data[o] = rgb.r;
                        data[o + 1] = rgb.g;
                        data[o + 2] = rgb.b;
                        data[o + 3] = Math.round(
                            255 * MathUtils.clamp(0.4 + 0.6 * n, 0, 1),
                        );
                    }
                }
            }

            ctx.putImageData(image, 0, 0);
            frames.push(canvas.toDataURL("image/png"));
        }

        return frames;
    }

    /**
     * Density field of one evolve anchor, sampled once and cached: the
     * island and detail fields combined into a per-pixel [0, 1] value
     * before soft-clamping. Anchor 0 uses the option seeds directly, so a
     * single-frame render matches the plain static tile exactly.
     */
    private static field(
        cache: (Float32Array | undefined)[],
        index: number,
        options: DitherTileOptions,
    ): Float32Array {
        const cached = cache[index];
        if (cached) return cached;

        const {
            cells,
            scale,
            octaves,
            detailScale,
            detailOctaves,
            detailStrength,
            seed,
        } = options;
        const offset = index * 101;
        const islands = new FractalBrownianNoise(
            cells,
            scale,
            octaves,
            seed + offset,
        );
        const detail = new FractalBrownianNoise(
            cells,
            detailScale,
            detailOctaves,
            seed + 31337 + offset,
        );

        const field = new Float32Array(cells * cells);
        for (let y = 0; y < cells; y++) {
            for (let x = 0; x < cells; x++) {
                field[y * cells + x] = MathUtils.clamp(
                    islands.sample(x, y)
                        + (detail.sample(x, y) - 0.5) * detailStrength,
                    0,
                    1,
                );
            }
        }

        cache[index] = field;
        return field;
    }
}
