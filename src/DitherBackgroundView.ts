import type { DitherTileOptions } from "./DitherTile";
import { DitherTile } from "./DitherTile";

/**
 * Every visual knob of a dither background. All fields are optional and fall
 * back to `DitherBackgroundView.DEFAULTS`. Values are applied as CSS custom
 * properties, so they can be animated at runtime without rebuilding the
 * background; only `DitherBackgroundView.TILE_INPUTS` regenerate the dither
 * frames themselves.
 */
export type DitherBackgroundOptions = {
    backgroundColor?: string;

    gridColor?: string;
    gridSize?: number;
    gridOpacity?: number;

    noiseColor?: string;
    noiseOpacity?: number;
    noiseSize?: number;
    noiseTileCells?: number;
    noiseDensity?: number;
    noiseContrast?: number;
    noiseScale?: number;
    noiseOctaves?: number;
    noiseDetailScale?: number;
    noiseDetailOctaves?: number;
    noiseDetailStrength?: number;
    noiseClampLow?: number;
    noiseClampHigh?: number;
    noiseSeed?: number;
    noiseMaxFill?: number;
    noiseJitter?: number;
    noiseFrames?: number;
    noiseFps?: number;

    fadeStart?: number;
    fadeEnd?: number;

    animateNoise?: boolean;
    animateGlow?: boolean;
};

export type DitherBackgroundCssVars = Record<`--${string}`, string>;

/**
 * Resolves `DitherBackgroundOptions` against the defaults and computes the
 * derived values (tile geometry, CSS custom properties). Used internally by
 * `DitherBackground`; framework wrappers can use it standalone.
 */
export class DitherBackgroundView {
    static readonly DEFAULTS: Required<DitherBackgroundOptions> = {
        backgroundColor:
            "linear-gradient(to bottom, var(--color-wine-950) 0%, var(--color-ink-950) 65%)",

        gridColor: "var(--color-steel-500)",
        gridSize: 41,
        gridOpacity: 0.23,

        noiseColor: "var(--color-scarlet-600)",
        noiseOpacity: 0.5,
        noiseSize: 3,
        noiseTileCells: DitherTile.DEFAULT_CELLS,
        noiseDensity: 0.55,
        noiseContrast: 1.8,
        noiseScale: 32,
        noiseOctaves: 3,
        noiseDetailScale: 5,
        noiseDetailOctaves: 3,
        noiseDetailStrength: 0.2,
        noiseClampLow: 0,
        noiseClampHigh: 0.9,
        noiseSeed: 69,
        noiseMaxFill: 0.6,
        noiseJitter: 0.3,
        noiseFrames: 8,
        noiseFps: 8,

        fadeStart: 0,
        fadeEnd: 90,

        animateNoise: true,
        animateGlow: true,
    };

    /** Options that affect the generated frames; all others only set CSS variables. */
    static readonly TILE_INPUTS: ReadonlyArray<keyof DitherBackgroundOptions> =
        [
            "noiseTileCells",
            "noiseColor",
            "noiseDensity",
            "noiseContrast",
            "noiseScale",
            "noiseOctaves",
            "noiseDetailScale",
            "noiseDetailOctaves",
            "noiseDetailStrength",
            "noiseClampLow",
            "noiseClampHigh",
            "noiseSeed",
            "noiseMaxFill",
            "noiseJitter",
            "noiseFrames",
        ];

    readonly options: Required<DitherBackgroundOptions>;

    constructor(options: DitherBackgroundOptions = {}) {
        this.options = {
            ...DitherBackgroundView.DEFAULTS,
            ...DitherBackgroundView.defined(options),
        };
    }

    /** Returns a new view with `partial` merged in; `undefined` values are ignored. */
    merge(partial: DitherBackgroundOptions): DitherBackgroundView {
        return new DitherBackgroundView({
            ...this.options,
            ...DitherBackgroundView.defined(partial),
        });
    }

    /** True when the two views would produce different dither frames. */
    rebuildsTile(other: DitherBackgroundView): boolean {
        return DitherBackgroundView.TILE_INPUTS.some(
            (key) => this.options[key] !== other.options[key],
        );
    }

    tileOptions(): DitherTileOptions {
        const o = this.options;
        return {
            cells: o.noiseTileCells,
            color: o.noiseColor,
            density: o.noiseDensity,
            contrast: o.noiseContrast,
            scale: o.noiseScale,
            octaves: o.noiseOctaves,
            detailScale: o.noiseDetailScale,
            detailOctaves: o.noiseDetailOctaves,
            detailStrength: o.noiseDetailStrength,
            clampLow: o.noiseClampLow,
            clampHigh: o.noiseClampHigh,
            seed: o.noiseSeed,
            maxFill: o.noiseMaxFill,
            jitter: o.noiseJitter,
        };
    }

    get tileSize(): number {
        return this.options.noiseTileCells * this.options.noiseSize;
    }

    cssVars(): DitherBackgroundCssVars {
        const o = this.options;
        return {
            "--background-color": o.backgroundColor,

            "--grid-color": o.gridColor,
            "--grid-size": `${o.gridSize}px`,
            "--grid-opacity": String(o.gridOpacity),

            "--noise-tile-size": `${this.tileSize}px`,
            "--noise-color": o.noiseColor,
            "--noise-opacity": String(o.noiseOpacity),

            "--fade-start": `${o.fadeStart}%`,
            "--fade-end": `${o.fadeEnd}%`,
        };
    }

    private static defined(
        options: DitherBackgroundOptions,
    ): DitherBackgroundOptions {
        const entries = Object.entries(options).filter(
            ([, value]) => value !== undefined,
        );
        return Object.fromEntries(entries) as DitherBackgroundOptions;
    }
}
