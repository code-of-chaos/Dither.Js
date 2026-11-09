import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DitherBackground } from "./DitherBackground";
import { DitherTile } from "./DitherTile";

describe("DitherBackground", () => {
    const toDataURL = vi.spyOn(DitherTile.prototype, "toDataURL");
    let container: HTMLElement;

    beforeEach(() => {
        toDataURL.mockReset();
        toDataURL.mockReturnValue("data:image/png;base64,AAAA");
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

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

    it("generates the tile once and rebuilds it only for tile inputs", () => {
        const background = new DitherBackground();
        background.mount(container);
        expect(toDataURL).toHaveBeenCalledTimes(1);

        background.update({ gridSize: 50, noiseSpeed: 60 });
        expect(toDataURL).toHaveBeenCalledTimes(1);

        background.update({ noiseSeed: 2 });
        expect(toDataURL).toHaveBeenCalledTimes(2);

        background.update({ noiseSeed: 2, noiseColor: "red" });
        expect(toDataURL).toHaveBeenCalledTimes(3);
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
});
