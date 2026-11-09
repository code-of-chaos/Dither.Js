import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { DitherTile } from "./DitherTile";
import { DitherGridBackground } from "./react";

describe("DitherGridBackground", () => {
    let toDataURL: MockInstance;

    beforeEach(() => {
        toDataURL = vi
            .spyOn(DitherTile.prototype, "toDataURL")
            .mockReturnValue("data:image/png;base64,AAAA");
    });

    afterEach(() => {
        toDataURL.mockRestore();
    });

    it("renders its children", () => {
        render(
            <DitherGridBackground>
                <p>Hero content</p>
            </DitherGridBackground>,
        );
        expect(screen.getByText("Hero content")).toBeTruthy();
    });

    it("applies the base class, modifiers and extra classNames", () => {
        const { container } = render(
            <DitherGridBackground className="custom" />,
        );
        const root = container.querySelector(".dither-grid-background");
        expect(root).not.toBeNull();
        expect(root?.classList.contains("custom")).toBe(true);
        expect(
            root?.classList.contains("dither-grid-background--animated"),
        ).toBe(true);
        expect(root?.classList.contains("dither-grid-background--glow")).toBe(
            true,
        );
    });

    it("omits modifier classes when animations are disabled", () => {
        const { container } = render(
            <DitherGridBackground animateNoise={false} animateGlow={false} />,
        );
        const root = container.querySelector(".dither-grid-background");
        expect(
            root?.classList.contains("dither-grid-background--animated"),
        ).toBe(false);
        expect(root?.classList.contains("dither-grid-background--glow")).toBe(
            false,
        );
    });

    it("hides the decorative layers from assistive technology", () => {
        const { container } = render(<DitherGridBackground />);
        const layers = container.querySelectorAll(
            ".dither-grid-background__noise, .dither-grid-background__grid",
        );
        expect(layers).toHaveLength(2);
        layers.forEach((layer) => {
            expect(layer.getAttribute("aria-hidden")).toBe("true");
        });
    });

    it("forwards visual parameters as CSS custom properties", () => {
        const { container } = render(
            <DitherGridBackground gridSize={64} noiseOpacity={0.25} />,
        );
        const root = container.querySelector<HTMLElement>(
            ".dither-grid-background",
        );
        expect(root?.style.getPropertyValue("--grid-size")).toBe("64px");
        expect(root?.style.getPropertyValue("--noise-opacity")).toBe("0.25");
    });

    it("generates the tile once and rebuilds it only for tile inputs", () => {
        const { rerender } = render(<DitherGridBackground />);
        expect(toDataURL).toHaveBeenCalledTimes(1);

        rerender(<DitherGridBackground gridSize={50} noiseSpeed={60} />);
        expect(toDataURL).toHaveBeenCalledTimes(1);

        rerender(<DitherGridBackground gridSize={50} noiseSeed={2} />);
        expect(toDataURL).toHaveBeenCalledTimes(2);
    });
});
