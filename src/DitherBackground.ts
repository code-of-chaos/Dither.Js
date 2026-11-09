import "./DitherBackground.css";
import { DitherTile } from "./DitherTile";
import type {
    DitherBackgroundCssVars,
    DitherBackgroundOptions,
} from "./DitherBackgroundView";
import { DitherBackgroundView } from "./DitherBackgroundView";

/**
 * Framework-agnostic layered background: an animated Bayer-dithered noise
 * texture, a static grid and an optional ambient glow. Plain DOM - mount it
 * on any element from any framework (or none).
 *
 * `mount()` decorates the container: it prepends the hidden layer elements
 * and applies the base class plus the CSS custom properties. Anything else
 * in the container renders above the layers, so frameworks keep rendering
 * their children normally. Options map 1:1 to the CSS custom properties and
 * can be changed at any time via `update()`; the dither frames are only
 * regenerated when one of the tile inputs changes.
 *
 * The texture is not slid across the screen: while `animateNoise` is on (and
 * the user has not requested reduced motion) a low-frequency ticker cycles
 * pre-rendered frames, so the dither pattern itself boils and evolves in
 * place. Frames are built on a canvas, so `mount()` requires a browser DOM.
 */
export class DitherBackground {
    static readonly ROOT_CLASS = "dither-grid-background";
    static readonly ANIMATED_CLASS = "dither-grid-background--animated";
    static readonly GLOW_CLASS = "dither-grid-background--glow";

    private view: DitherBackgroundView;
    private frames: string[] = [];
    private frameIndex = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private root: HTMLElement | null = null;
    private texture: HTMLElement | null = null;
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

        this.texture = texture;
        this.layers = [noise, grid];
        container.prepend(...this.layers);

        this.frames = this.createNoiseFrames();
        this.frameIndex = 0;
        this.apply();
        this.applyFrame();
        this.syncAnimation();
    }

    /** Merges new options; regenerates the frames only when tile inputs change. */
    update(partial: DitherBackgroundOptions): void {
        const next = this.view.merge(partial);
        const rebuild = this.view.rebuildsTile(next);
        this.view = next;

        if (this.root && rebuild) {
            this.frames = this.createNoiseFrames();
            this.frameIndex = 0;
        }

        this.apply();
        this.applyFrame();
        this.syncAnimation();
    }

    /** Removes the layers and reverts the container to its unmounted state. */
    destroy(): void {
        const root = this.root;
        if (!root) return;

        this.stopAnimation();
        for (const layer of this.layers) layer.remove();
        this.layers = [];

        root.classList.remove(
            DitherBackground.ROOT_CLASS,
            DitherBackground.ANIMATED_CLASS,
            DitherBackground.GLOW_CLASS,
        );
        for (const name of Object.keys(this.view.cssVars())) {
            root.style.removeProperty(name);
        }

        this.root = null;
        this.texture = null;
        this.frames = [];
        this.frameIndex = 0;
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

        const vars: DitherBackgroundCssVars = this.view.cssVars();
        for (const [name, value] of Object.entries(vars)) {
            root.style.setProperty(name, value);
        }
    }

    /** Publishes the current frame on the texture node only. */
    private applyFrame(): void {
        const texture = this.texture;
        if (!texture || this.frames.length === 0) return;
        texture.style.setProperty(
            "--noise-image",
            `url("${this.frames[this.frameIndex]}")`,
        );
    }

    private syncAnimation(): void {
        this.stopAnimation();
        if (!this.root || !this.view.options.animateNoise) return;
        if (DitherBackground.prefersReducedMotion()) return;

        const interval = 1000 / Math.max(1, this.view.options.noiseFps);
        this.timer = setInterval(() => {
            if (this.frames.length === 0) return;
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            this.applyFrame();
        }, interval);
    }

    private stopAnimation(): void {
        if (this.timer === null) return;
        clearInterval(this.timer);
        this.timer = null;
    }

    private createNoiseFrames(): string[] {
        return new DitherTile(this.view.tileOptions()).toDataURLFrames(
            this.view.options.noiseFrames,
        );
    }

    private static prefersReducedMotion(): boolean {
        return (
            typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }
}
