import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DitherTileOptions } from "./DitherTile";
import { DitherTile } from "./DitherTile";

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

/**
 * Minimal canvas double: `toDataURL` serializes the alpha channel of the
 * last written image, so equal pixels produce equal URLs and the frame
 * semantics can be asserted without a real 2D context.
 */
function fakeCanvas(): HTMLCanvasElement {
    let fillStyle = "";
    let last: { data: Uint8ClampedArray } | null = null;

    const ctx = {
        get fillStyle() {
            return fillStyle;
        },
        set fillStyle(value: string) {
            fillStyle = value;
        },
        createImageData: (width: number, height: number) => ({
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: (image: { data: Uint8ClampedArray }) => {
            last = image;
        },
    };

    return {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toDataURL: () => {
            if (!last) return "data:,";
            const alphas: number[] = [];
            for (let i = 3; i < last.data.length; i += 4)
                alphas.push(last.data[i]);
            return `data:image/png;base64,${alphas.join(".")}`;
        },
    } as unknown as HTMLCanvasElement;
}

describe("DitherTile.toDataURLFrames", () => {
    const realCreateElement = document.createElement.bind(document);

    beforeEach(() => {
        vi.spyOn(document, "createElement").mockImplementation(((
            tag: string,
        ) =>
            tag === "canvas"
                ? fakeCanvas()
                : realCreateElement(
                      tag,
                  )) as unknown as typeof document.createElement);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns the requested number of frames", () => {
        expect(new DitherTile(OPTIONS).toDataURLFrames(4)).toHaveLength(4);
    });

    it("clamps the frame count to at least one", () => {
        expect(new DitherTile(OPTIONS).toDataURLFrames(0)).toHaveLength(1);
    });

    it("makes every frame different so the pattern boils and evolves", () => {
        const frames = new DitherTile(OPTIONS).toDataURLFrames(8);
        for (let i = 1; i < frames.length; i++) {
            expect(frames[i]).not.toBe(frames[i - 1]);
        }
        expect(frames[0]).not.toBe(frames[frames.length - 1]);
    });

    it("is deterministic for the same options", () => {
        expect(new DitherTile(OPTIONS).toDataURLFrames(4)).toEqual(
            new DitherTile(OPTIONS).toDataURLFrames(4),
        );
    });

    it("keeps the static tile identical to the first frame", () => {
        const tile = new DitherTile(OPTIONS);
        expect(tile.toDataURL()).toBe(tile.toDataURLFrames(1)[0]);
    });

    it("does not depend on the loop length for the first frame", () => {
        const tile = new DitherTile(OPTIONS);
        expect(tile.toDataURLFrames(8)[0]).toBe(tile.toDataURLFrames(3)[0]);
    });
});
