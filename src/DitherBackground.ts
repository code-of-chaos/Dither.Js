import "./DitherBackground.css";
import { DitherTile } from "./DitherTile";
import type {
    DitherBackgroundCssVars,
    DitherBackgroundOptions,
} from "./DitherBackgroundView";
import { DitherBackgroundView } from "./DitherBackgroundView";

/**
 * Framework-agnostic layered background: a scrolling Bayer-dithered noise
 * texture, a static grid and an optional ambient glow. Plain DOM — mount it
 * on any element from any framework (or none).
 *
 * `mount()` decorates the container: it prepends the hidden layer elements
 * and applies the base class plus the CSS custom properties. Anything else
 * in the container renders above the layers, so frameworks keep rendering
 * their children normally. Options map 1:1 to the CSS custom properties and
 * can be changed at any time via `update()`; the dither bitmap is only
 * regenerated when one of the tile inputs changes.
 *
 * The tile is generated on a canvas, so `mount()` requires a browser DOM.
 */
export class DitherBackground {
    static readonly ROOT_CLASS = "dither-grid-background";
    static readonly ANIMATED_CLASS = "dither-grid-background--animated";
    static readonly GLOW_CLASS = "dither-grid-background--glow";

    private view: DitherBackgroundView;
    private noiseImage = "";
    private root: HTMLElement | null = null;
    private layers: HTMLElement[] = [];

    constructor(options: DitherBackgroundOptions = {}) {
        this.view = new DitherBackgroundView(options);
    }

    /** Decorates `container` with the background layers. Idempotent per instance. */
    mount(container: HTMLElement): void {
        if (this.root) {
            throw new Error("DitherBackground is already mounted");
        }
        this.root = container;

        const texture = document.createElement("div");
        texture.className = "dither-grid-background__noise-texture";
        const noise = document.createElement("div");
        noise.className = "dither-grid-background__noise";
        noise.setAttribute("aria-hidden", "true");
        noise.append(texture);

        const grid = document.createElement("div");
        grid.className = "dither-grid-background__grid";
        grid.setAttribute("aria-hidden", "true");

        this.layers = [noise, grid];
        container.prepend(...this.layers);

        this.noiseImage = this.createNoiseImage();
        this.apply();
    }

    /** Merges new options; regenerates the tile only when tile inputs change. */
    update(partial: DitherBackgroundOptions): void {
        const next = this.view.merge(partial);
        const rebuildTile = this.view.rebuildsTile(next);
        this.view = next;
        if (rebuildTile) {
            this.noiseImage = this.createNoiseImage();
        }
        this.apply();
    }

    /** Removes the layers and reverts the container to its unmounted state. */
    destroy(): void {
        const root = this.root;
        if (!root) return;

        for (const layer of this.layers) layer.remove();
        this.layers = [];

        root.classList.remove(
            DitherBackground.ROOT_CLASS,
            DitherBackground.ANIMATED_CLASS,
            DitherBackground.GLOW_CLASS,
        );
        for (const name of Object.keys(this.view.cssVars(""))) {
            root.style.removeProperty(name);
        }

        this.root = null;
        this.noiseImage = "";
    }

    /** The decorated container element, or `null` before mount / after destroy. */
    get element(): HTMLElement | null {
        return this.root;
    }

    private apply(): void {
        const root = this.root;
        if (!root) return;

        root.classList.add(DitherBackground.ROOT_CLASS);
        root.classList.toggle(
            DitherBackground.ANIMATED_CLASS,
            this.view.options.animateNoise,
        );
        root.classList.toggle(
            DitherBackground.GLOW_CLASS,
            this.view.options.animateGlow,
        );

        const vars: DitherBackgroundCssVars = this.view.cssVars(
            this.noiseImage,
        );
        for (const [name, value] of Object.entries(vars)) {
            root.style.setProperty(name, value);
        }
    }

    private createNoiseImage(): string {
        return new DitherTile(this.view.tileOptions()).toDataURL();
    }
}
