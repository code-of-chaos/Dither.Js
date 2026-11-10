import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { DitherBackground } from "./DitherBackground";
import { DitherTile } from "./DitherTile";

const CELLS = 8;

describe("DitherBackground", () => {
    let renderFrame: MockInstance;
    let container: HTMLElement;

    beforeEach(() => {
        vi.useFakeTimers({
            toFake: [
                "setTimeout",
                "clearTimeout",
                "setInterval",
                "clearInterval",
                "Date",
                "requestAnimationFrame",
                "cancelAnimationFrame",
            ],
        });
        renderFrame = vi.spyOn(DitherTile.prototype, "renderFrame");
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

    function mount(
        options: ConstructorParameters<typeof DitherBackground>[0] = {},
    ): DitherBackground {
        const background = new DitherBackground({
            noiseTileCells: CELLS,
            animateNoise: false,
            ...options,
        });
        background.mount(container);
        return background;
    }

    it("prepends hidden noise and grid layers above existing content", () => {
        const child = document.createElement("p");
        container.append(child);

        mount();

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
        expect(
            container.querySelector(
                "canvas.dither-grid-background__noise-texture",
            ),
        ).not.toBeNull();
        expect(child.parentElement).toBe(container);
    });

    it("applies the base class and animation modifiers", () => {
        mount({ animateNoise: true, animateGlow: true });

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
        const background = mount({ animateGlow: false });

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
        mount({ gridSize: 64, noiseOpacity: 0.25 });

        expect(container.style.getPropertyValue("--grid-size")).toBe("64px");
        expect(container.style.getPropertyValue("--noise-opacity")).toBe(
            "0.25",
        );
    });

    it("rebuilds the noise field only for field inputs", () => {
        const background = mount();
        expect(new Set(renderFrame.mock.contexts).size).toBe(1);

        background.update({ gridSize: 50, noiseFps: 12 });
        expect(new Set(renderFrame.mock.contexts).size).toBe(1);

        background.update({ noiseSeed: 2 });
        expect(new Set(renderFrame.mock.contexts).size).toBe(2);

        background.update({ noiseSeed: 2, noiseColor: "red" });
        expect(new Set(renderFrame.mock.contexts).size).toBe(2);

        background.update({ noiseScale: 12 });
        expect(new Set(renderFrame.mock.contexts).size).toBe(3);
    });

    it("merges updates and ignores undefined values", () => {
        const background = mount({ noiseSize: 3 });

        background.update({ gridSize: 8, noiseSize: undefined });

        expect(container.style.getPropertyValue("--grid-size")).toBe("8px");
        expect(container.style.getPropertyValue("--noise-tile-size")).toBe(
            "24px",
        );
    });

    it("flows the field along the configured angle over the loop", () => {
        mount({
            animateNoise: true,
            noiseAngle: 0,
            noiseTravel: 1,
            noiseSpeed: 4,
            noiseFps: 25,
        });
        vi.advanceTimersByTime(1000);

        const calls = renderFrame.mock.calls;
        expect(calls.length).toBeGreaterThan(3);

        const first = calls[0][0] as number;
        const last = calls[calls.length - 1][0] as number;
        expect(last).toBeGreaterThan(first);

        for (const [phase, driftX, driftY] of calls) {
            expect(driftY).toBe(0);
            expect(driftX).toBeCloseTo(CELLS * (phase as number));
        }
    });

    it("caps the render rate at noiseFps", () => {
        const slow = mount({ animateNoise: true, noiseFps: 5 });
        vi.advanceTimersByTime(1000);
        const slowRenders = renderFrame.mock.calls.length;
        slow.destroy();

        renderFrame.mockClear();
        const fast = mount({ animateNoise: true, noiseFps: 30 });
        vi.advanceTimersByTime(1000);
        const fastRenders = renderFrame.mock.calls.length;
        fast.destroy();

        expect(slowRenders).toBeGreaterThanOrEqual(3);
        expect(slowRenders).toBeLessThanOrEqual(12);
        expect(fastRenders).toBeGreaterThan(slowRenders);
        expect(fastRenders).toBeLessThanOrEqual(45);
    });

    it("does not animate when the noise animation is disabled", () => {
        mount();
        vi.advanceTimersByTime(1000);
        expect(renderFrame).toHaveBeenCalledTimes(1);
    });

    it("freezes on the first frame under prefers-reduced-motion", () => {
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: true,
        } as MediaQueryList);

        mount({ animateNoise: true });
        vi.advanceTimersByTime(1000);
        expect(renderFrame).toHaveBeenCalledTimes(1);
    });

    it("starts and stops the render loop with animateNoise updates", () => {
        const background = mount();

        background.update({ animateNoise: true });
        vi.advanceTimersByTime(500);
        expect(renderFrame.mock.calls.length).toBeGreaterThan(1);

        const paused = renderFrame.mock.calls.length;
        background.update({ animateNoise: false });
        vi.advanceTimersByTime(1000);
        expect(renderFrame).toHaveBeenCalledTimes(paused + 1);
    });

    it("destroy removes layers, classes and CSS custom properties", () => {
        const background = mount();
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

    it("destroy stops the render loop", () => {
        const background = mount({ animateNoise: true });
        background.destroy();

        renderFrame.mockClear();
        vi.advanceTimersByTime(1000);
        expect(renderFrame).not.toHaveBeenCalled();
    });
});
