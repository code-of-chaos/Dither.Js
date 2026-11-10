import { FractalBrownianNoise } from "./FractalBrownianNoise";
import { MathUtils } from "./MathUtils";
import { RgbColor } from "./RgbColor";

/** Minimal ImageData-like target written by `DitherTile.renderFrame`. */
export type DitherFrameTarget = {
    data: Uint8ClampedArray;
};

/**
 * Per-frame threshold knobs. These are read fresh on every `renderFrame`
 * call, so they can change without rebuilding the cached noise field.
 */
export type DitherFrameStyle = {
    density: number;
    contrast: number;
    clampLow: number;
    clampHigh: number;
    maxFill: number;
    jitter: number;
};

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
 * Renders seamless dithered noise as pixels or PNG data URLs.
 *
 * The density field is built from seamless Perlin/fBm noise (islands plus
 * fine detail) and cached as typed arrays - one per "evolve anchor". A frame
 * is rendered by sampling the field at a drifting offset (bilinear, wrap
 * safe), blending the anchors with continuous cyclic weights so the shapes
 * morph as they flow, then thresholding against a Bayer matrix mixed with
 * per-pixel jitter to decide whether each pixel is inked. Jitter stays
 * fixed per pixel, so the dots only reform where the flowing field crosses
 * a threshold - the motion reads as liquid, not flicker.
 *
 * Because the field tiles seamlessly and the drift wraps on whole tiles,
 * the frame set loops invisibly: rendering at phase 1 with the full-loop
 * drift is identical to phase 0 with no drift.
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

    private readonly anchors: (Float32Array | undefined)[] = [
        undefined,
        undefined,
        undefined,
    ];
    private blendBuffer?: Float32Array;

    constructor(private readonly options: DitherTileOptions) {}

    /** A single static tile - the pattern frozen at phase 0 with no drift. */
    toDataURL(): string {
        const { cells, color } = this.options;

        const canvas = document.createElement("canvas");
        canvas.width = cells;
        canvas.height = cells;

        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        const image = ctx.createImageData(cells, cells);
        this.renderFrame(
            0,
            0,
            0,
            RgbColor.fromCss(ctx, color),
            this.options,
            image,
        );
        ctx.putImageData(image, 0, 0);
        return canvas.toDataURL("image/png");
    }

    /**
     * Writes one dithered frame into `out` (RGBA, `cells * cells`). Pure
     * typed-array math - no canvas involved. `phase` runs over [0, 1) for
     * one full loop; `driftX`/`driftY` shift the field in pixels, wrapping
     * on whole tiles so any loop that ends on a whole-tile drift is
     * seamless. `style` is read fresh each call - only the noise field is
     * cached on the instance.
     */
    renderFrame(
        phase: number,
        driftX: number,
        driftY: number,
        rgb: RgbColor,
        style: DitherFrameStyle,
        out: DitherFrameTarget,
    ): void {
        const { cells, seed } = this.options;
        const { density, contrast, clampLow, clampHigh, maxFill, jitter } =
            style;

        const pos = MathUtils.mod(phase, 1) * DitherTile.EVOLVE_ANCHORS;
        const base = Math.floor(pos);
        const i0 = base % DitherTile.EVOLVE_ANCHORS;
        const frac = MathUtils.smoothstep(0, 1, pos - base);
        const field0 = this.anchor(i0);
        const field =
            frac > 0
                ? this.blend(
                      field0,
                      this.anchor((i0 + 1) % DitherTile.EVOLVE_ANCHORS),
                      frac,
                  )
                : field0;

        const stepX = Math.floor(driftX);
        const stepY = Math.floor(driftY);
        const driftFx = driftX - stepX;
        const driftFy = driftY - stepY;

        const data = out.data;
        for (let y = 0; y < cells; y++) {
            const y0 = MathUtils.mod(y + stepY, cells) * cells;
            const y1 = MathUtils.mod(y + stepY + 1, cells) * cells;

            for (let x = 0; x < cells; x++) {
                const x0 = MathUtils.mod(x + stepX, cells);
                const x1 = x0 + 1 === cells ? 0 : x0 + 1;

                const top = MathUtils.lerp(
                    field[y0 + x0],
                    field[y0 + x1],
                    driftFx,
                );
                const bottom = MathUtils.lerp(
                    field[y1 + x0],
                    field[y1 + x1],
                    driftFx,
                );
                const combined = MathUtils.lerp(top, bottom, driftFy);

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

                const o = (y * cells + x) * 4;
                if (threshold < p) {
                    data[o] = rgb.r;
                    data[o + 1] = rgb.g;
                    data[o + 2] = rgb.b;
                    data[o + 3] = Math.round(
                        255 * MathUtils.clamp(0.4 + 0.6 * n, 0, 1),
                    );
                } else {
                    data[o] = 0;
                    data[o + 1] = 0;
                    data[o + 2] = 0;
                    data[o + 3] = 0;
                }
            }
        }
    }

    /**
     * Density field of one evolve anchor, sampled once and cached: the
     * island and detail fields combined into a per-pixel [0, 1] value
     * before soft-clamping. Anchor 0 uses the option seeds directly, so a
     * static render matches the plain single-anchor tile exactly.
     */
    private anchor(index: number): Float32Array {
        const cached = this.anchors[index];
        if (cached) return cached;

        const {
            cells,
            scale,
            octaves,
            detailScale,
            detailOctaves,
            detailStrength,
            seed,
        } = this.options;
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

        this.anchors[index] = field;
        return field;
    }

    private blend(
        a: Float32Array,
        b: Float32Array,
        frac: number,
    ): Float32Array {
        if (!this.blendBuffer) {
            this.blendBuffer = new Float32Array(a.length);
        }
        const out = this.blendBuffer;
        for (let i = 0; i < a.length; i++) {
            out[i] = MathUtils.lerp(a[i], b[i], frac);
        }
        return out;
    }
}
