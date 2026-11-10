import { describe, expect, it } from "vitest";
import type { DitherTileOptions } from "./DitherTile";
import { DitherTile } from "./DitherTile";
import { RgbColor } from "./RgbColor";

const OPTIONS: DitherTileOptions = {
    cells: 32,
    color: "#ff0000",
    density: 0.55,
    contrast: 1.8,
    scale: 8,
    octaves: 2,
    detailScale: 4,
    detailOctaves: 2,
    detailStrength: 0.2,
    clampLow: 0,
    clampHigh: 0.9,
    seed: 7,
    maxFill: 0.6,
    jitter: 0.3,
};

const RGB = new RgbColor(255, 0, 0);

function render(
    tile: DitherTile,
    phase: number,
    driftX: number,
    driftY: number,
): Uint8ClampedArray {
    const out = {
        data: new Uint8ClampedArray(OPTIONS.cells * OPTIONS.cells * 4),
    };
    tile.renderFrame(phase, driftX, driftY, RGB, OPTIONS, out);
    return out.data;
}

describe("DitherTile.renderFrame", () => {
    it("is deterministic for the same inputs", () => {
        const tile = new DitherTile(OPTIONS);
        expect(render(tile, 0.25, 3, -7)).toEqual(render(tile, 0.25, 3, -7));
    });

    it("closes the loop: full phase with whole-tile drift equals the first frame", () => {
        const tile = new DitherTile(OPTIONS);
        const first = render(tile, 0, 0, 0);
        const wrapped = render(tile, 1, OPTIONS.cells * 2, OPTIONS.cells * -3);
        expect(wrapped).toEqual(first);
    });

    it("wraps drift on whole tiles", () => {
        const tile = new DitherTile(OPTIONS);
        const base = render(tile, 0.5, 0, 0);
        const shifted = render(
            tile,
            0.5,
            OPTIONS.cells * 3,
            OPTIONS.cells * -2,
        );
        expect(shifted).toEqual(base);
    });

    it("moves the pattern when the field drifts", () => {
        const tile = new DitherTile(OPTIONS);
        const still = render(tile, 0, 0, 0);
        const drifted = render(tile, 0, 5, 0);
        const driftedDown = render(tile, 0, 0, 5);
        expect(drifted).not.toEqual(still);
        expect(driftedDown).not.toEqual(still);
        expect(driftedDown).not.toEqual(drifted);
    });

    it("morphs continuously across the phase", () => {
        const tile = new DitherTile(OPTIONS);
        const start = render(tile, 0, 0, 0);
        const middle = render(tile, 0.5, 0, 0);
        const quarter = render(tile, 0.25, 0, 0);
        expect(middle).not.toEqual(start);
        expect(quarter).not.toEqual(start);
        expect(quarter).not.toEqual(middle);
    });

    it("updates the threshold style without touching the field", () => {
        const tile = new DitherTile(OPTIONS);
        const strict = render(tile, 0, 0, 0);
        const out = {
            data: new Uint8ClampedArray(OPTIONS.cells * OPTIONS.cells * 4),
        };
        tile.renderFrame(0, 0, 0, RGB, { ...OPTIONS, maxFill: 0.05 }, out);
        expect(out.data).not.toEqual(strict);
    });
});

describe("DitherTile.toDataURL", () => {
    it("matches the phase-0 frame rendered manually", () => {
        const tile = new DitherTile(OPTIONS);
        const expected = `data:image/png;base64,${Array.from(
            render(tile, 0, 0, 0),
        ).join(".")}`;
        expect(tile.toDataURL()).toBe(expected);
    });
});
