import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
    cleanup();
});

/*
 * happy-dom has no canvas raster pipeline, so every canvas gets a minimal
 * 2D context: enough for the dither pipeline to create/put ImageData and
 * for `toDataURL` to serialize the last written frame (used to compare
 * static tiles against rendered frames).
 */
type Raster = { width: number; height: number; data: Uint8ClampedArray };

const rasters = new WeakMap<object, Raster>();
const contexts = new WeakMap<object, CanvasRenderingContext2D>();

function fakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    let fillStyle = "";
    return {
        get fillStyle() {
            return fillStyle;
        },
        set fillStyle(value: string) {
            fillStyle = value;
        },
        imageSmoothingEnabled: false,
        createImageData: (width: number, height: number) => ({
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: (image: Raster) => {
            rasters.set(canvas, image);
        },
        drawImage: () => undefined,
        clearRect: () => undefined,
    } as unknown as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
) {
    if (type !== "2d") return null;
    let ctx = contexts.get(this);
    if (!ctx) {
        ctx = fakeContext(this);
        contexts.set(this, ctx);
    }
    return ctx;
} as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement) {
    const raster = rasters.get(this);
    if (!raster) return "data:,";
    return `data:image/png;base64,${Array.from(raster.data).join(".")}`;
} as typeof HTMLCanvasElement.prototype.toDataURL;
