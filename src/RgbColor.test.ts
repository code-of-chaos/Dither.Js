import { describe, expect, it } from "vitest";
import { RgbColor } from "./RgbColor";

function fakeContext(): CanvasRenderingContext2D {
    let fillStyle = "";
    return {
        get fillStyle() {
            return fillStyle;
        },
        set fillStyle(value: string) {
            fillStyle = value;
        },
    } as unknown as CanvasRenderingContext2D;
}

describe("RgbColor.fromCss", () => {
    it("parses hex colors", () => {
        expect(RgbColor.fromCss(fakeContext(), "#a32338")).toEqual(
            new RgbColor(163, 35, 56),
        );
    });

    it("parses short hex colors", () => {
        expect(RgbColor.fromCss(fakeContext(), "#fff")).toEqual(
            new RgbColor(255, 255, 255),
        );
    });

    it("resolves var() references against the document root", () => {
        document.documentElement.style.setProperty("--test-color", "#00ff00");
        expect(RgbColor.fromCss(fakeContext(), "var(--test-color)")).toEqual(
            new RgbColor(0, 255, 0),
        );
    });

    it("uses the var() fallback when the variable is not defined", () => {
        expect(
            RgbColor.fromCss(fakeContext(), "var(--missing, #123456)"),
        ).toEqual(new RgbColor(18, 52, 86));
    });
});
