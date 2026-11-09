import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { DitherBackground } from "./DitherBackground";
import { DitherTile } from "./DitherTile";

describe("DitherBackground", () => {
    let toDataURLFrames: MockInstance;
    let container: HTMLElement;

    beforeEach(() => {
        vi.useFakeTimers();
        toDataURLFrames = vi
            .spyOn(DitherTile.prototype, "toDataURLFrames")
            .mockImplementation((count: number) =>
                Array.from(
                    { length: Math.max(1, Math.round(count)) },
                    (_, i) => `frame-${i}`,
                ),
            );
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: false,
        } as MediaQueryList);
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function textureOf(background: DitherBackground): HTMLElement {
        const texture = background.element?.querySelector<HTMLElement>(
            ".dither-grid-background__noise-texture",
        );
        if (!texture) throw new Error("noise texture not found");
        return texture;
    }

    it("prepends hidden noise and grid layers above existing content", () => {
        const child = document.createElement("p");
        container.append(child);

        new DitherBackground().mount(container);

        const layers = container.querySelectorAll(
            ".dither-grid-background__noise, .dither-grid-background__grid",
        );
        expect(layers).toHaveLength(2);
        layers.forEach((layer) => {
            expect(layer.getAttribute("aria-hidden")).toBe("true");
        });
        expect(container.firstElementChild?.className).toBe(
            "dither-grid-background__noise",
        );
        expect(child.parentElement).toBe(container);
    });

    it("applies the base class and animation modifiers", () => {
        new DitherBackground().mount(container);

        expect(container.classList.contains("dither-grid-background")).toBe(
            true,
        );
        expect(
            container.classList.contains("dither-grid-background--animated"),
        ).toBe(true);
        expect(
            container.classList.contains("dither-grid-background--glow"),
        ).toBe(true);
    });

    it("toggles modifier classes when animations are disabled or enabled", () => {
        const background = new DitherBackground({
            animateNoise: false,
            animateGlow: false,
        });
        background.mount(container);

        expect(
            container.classList.contains("dither-grid-background--animated"),
        ).toBe(false);
        expect(
            container.classList.contains("dither-grid-background--glow"),
        ).toBe(false);

        background.update({ animateGlow: true });

        expect(
            container.classList.contains("dither-grid-background--glow"),
        ).toBe(true);
        expect(
            container.classList.contains("dither-grid-background--animated"),
        ).toBe(false);
    });

    it("forwards visual parameters as CSS custom properties", () => {
        new DitherBackground({ gridSize: 64, noiseOpacity: 0.25 }).mount(
            container,
        );

        expect(container.style.getPropertyValue("--grid-size")).toBe("64px");
        expect(container.style.getPropertyValue("--noise-opacity")).toBe(
            "0.25",
        );
    });

    it("generates the frames once and rebuilds them only for tile inputs", () => {
        const background = new DitherBackground();
        background.mount(container);
        expect(toDataURLFrames).toHaveBeenCalledTimes(1);

        background.update({ gridSize: 50, noiseFps: 12 });
        expect(toDataURLFrames).toHaveBeenCalledTimes(1);

        background.update({ noiseSeed: 2 });
        expect(toDataURLFrames).toHaveBeenCalledTimes(2);

        background.update({ noiseSeed: 2, noiseColor: "red" });
        expect(toDataURLFrames).toHaveBeenCalledTimes(3);

        background.update({ noiseFrames: 4 });
        expect(toDataURLFrames).toHaveBeenCalledTimes(4);
    });

    it("merges updates and ignores undefined values", () => {
        const background = new DitherBackground();
        background.mount(container);

        background.update({ gridSize: 8, noiseSize: undefined });

        expect(container.style.getPropertyValue("--grid-size")).toBe("8px");
        expect(container.style.getPropertyValue("--noise-tile-size")).toBe(
            "1536px",
        );
    });

    it("cycles frames at the configured rate and wraps seamlessly", () => {
        const background = new DitherBackground({
            noiseFrames: 3,
            noiseFps: 10,
        });
        background.mount(container);
        const texture = textureOf(background);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-0",
        );

        vi.advanceTimersByTime(100);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-1",
        );

        vi.advanceTimersByTime(100);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-2",
        );

        vi.advanceTimersByTime(100);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-0",
        );
    });

    it("does not animate when the noise animation is disabled", () => {
        const background = new DitherBackground({
            animateNoise: false,
            noiseFps: 10,
        });
        background.mount(container);
        const texture = textureOf(background);

        vi.advanceTimersByTime(500);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-0",
        );
    });

    it("freezes on the first frame under prefers-reduced-motion", () => {
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: true,
        } as MediaQueryList);

        const background = new DitherBackground({ noiseFps: 10 });
        background.mount(container);
        const texture = textureOf(background);

        vi.advanceTimersByTime(500);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-0",
        );
    });

    it("starts and stops the ticker with animateNoise updates", () => {
        const background = new DitherBackground({
            animateNoise: false,
            noiseFps: 10,
        });
        background.mount(container);
        const texture = textureOf(background);

        background.update({ animateNoise: true });
        vi.advanceTimersByTime(100);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-1",
        );

        background.update({ animateNoise: false });
        vi.advanceTimersByTime(500);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-1",
        );
    });

    it("destroy removes layers, classes and CSS custom properties", () => {
        const background = new DitherBackground();
        background.mount(container);
        background.destroy();

        expect(
            container.querySelector(".dither-grid-background__noise"),
        ).toBeNull();
        expect(
            container.querySelector(".dither-grid-background__grid"),
        ).toBeNull();
        expect(container.classList.contains("dither-grid-background")).toBe(
            false,
        );
        expect(container.style.getPropertyValue("--grid-size")).toBe("");
        expect(background.element).toBeNull();
    });

    it("destroy stops the frame ticker", () => {
        const background = new DitherBackground({ noiseFps: 10 });
        background.mount(container);
        const texture = textureOf(background);

        background.destroy();
        vi.advanceTimersByTime(1000);
        expect(texture.style.getPropertyValue("--noise-image")).toContain(
            "frame-0",
        );
    });
});
