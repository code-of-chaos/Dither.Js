import "./DitherBackground.css";
import { DitherTile } from "./DitherTile";
import type {
    DitherBackgroundCssVars,
    DitherBackgroundOptions,
} from "./DitherBackgroundView";
import { DitherBackgroundView } from "./DitherBackgroundView";
import { RgbColor } from "./RgbColor";

/**
 * Framework-agnostic layered background: a slowly flowing Bayer-dithered
 * noise texture, a static grid and an optional ambient glow. Plain DOM -
 * mount it on any element from any framework (or none).
 *
 * `mount()` decorates the container: it prepends the hidden layer elements
 * and applies the base class plus the CSS custom properties. Anything else
 * in the container renders above the layers, so frameworks keep rendering
 * their children normally. Options map to CSS custom properties or drive
 * the render loop and can be changed at any time via `update()`; the noise
 * field is only rebuilt when one of `DitherBackgroundView.FIELD_INPUTS`
 * changes.
 *
 * The texture is not slid across the screen: a requestAnimationFrame loop
 * re-samples the noise field at a drifting offset (`noiseAngle`,
 * `noiseTravel`, `noiseSpeed`) and repaints a canvas, so the dither pattern
 * itself flows smoothly and the dots reform where the moving field crosses
 * their thresholds. The loop is capped at `noiseFps`; `animateNoise: false`
 * or `prefers-reduced-motion` freezes the first frame. Frames are computed
 * on typed arrays, so `mount()` requires a browser DOM (canvas only).
 */
export class DitherBackground {
    static readonly ROOT_CLASS = "dither-grid-background";
    static readonly ANIMATED_CLASS = "dither-grid-background--animated";
    static readonly GLOW_CLASS = "dither-grid-background--glow";

    private view: DitherBackgroundView;
    private tile?: DitherTile;
    private frame?: ImageData;
    private tileCanvas?: HTMLCanvasElement;
    private tileCtx?: CanvasRenderingContext2D;
    private display?: HTMLCanvasElement;
    private displayCtx?: CanvasRenderingContext2D;
    private rgb?: RgbColor;
    private rgbSource?: string;
    private raf: number | null = null;
    private elapsed = 0;
    private lastTime: number | null = null;
    private lastRender: number | null = null;
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

        const texture = document.createElement("canvas");
        texture.className = "dither-grid-background__noise-texture";
        const noise = document.createElement("div");
        noise.className = "dither-grid-background__noise";
        noise.setAttribute("aria-hidden", "true");
        noise.append(texture);

        const grid = document.createElement("div");
        grid.className = "dither-grid-background__grid";
        grid.setAttribute("aria-hidden", "true");

        this.display = texture;
        this.displayCtx = texture.getContext("2d") ?? undefined;
        this.layers = [noise, grid];
        container.prepend(...this.layers);

        this.rebuildField();
        this.apply();
        this.syncAnimation();
    }

    /** Merges new options; rebuilds the field only when field inputs change. */
    update(partial: DitherBackgroundOptions): void {
        const next = this.view.merge(partial);
        const rebuild = this.view.rebuildsField(next);
        this.view = next;

        if (this.root && rebuild) {
            this.rebuildField();
        }

        this.apply();
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
        this.display = undefined;
        this.displayCtx = undefined;
        this.tile = undefined;
        this.frame = undefined;
        this.tileCanvas = undefined;
        this.tileCtx = undefined;
        this.rgb = undefined;
        this.rgbSource = undefined;
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

    private rebuildField(): void {
        const cells = this.view.options.noiseTileCells;
        this.tile = new DitherTile(this.view.tileOptions());
        this.tileCanvas = document.createElement("canvas");
        this.tileCanvas.width = cells;
        this.tileCanvas.height = cells;
        this.tileCtx = this.tileCanvas.getContext("2d") ?? undefined;
        this.frame = this.tileCtx?.createImageData(cells, cells);
    }

    private syncAnimation(): void {
        this.render();
        this.stopAnimation();
        if (!this.root || !this.view.options.animateNoise) return;
        if (DitherBackground.prefersReducedMotion()) return;

        this.lastTime = null;
        this.raf = requestAnimationFrame(this.tick);
    }

    private tick = (time: number): void => {
        this.raf = requestAnimationFrame(this.tick);
        if (this.lastTime === null) {
            this.lastTime = time;
            return;
        }

        const delta = Math.min(time - this.lastTime, 250);
        this.lastTime = time;
        this.elapsed += delta;

        const interval = 1000 / Math.max(1, this.view.options.noiseFps);
        if (this.lastRender === null || time - this.lastRender >= interval) {
            this.lastRender = time;
            this.render();
        }
    };

    private stopAnimation(): void {
        if (this.raf !== null) cancelAnimationFrame(this.raf);
        this.raf = null;
        this.lastTime = null;
        this.lastRender = null;
    }

    private render(): void {
        const tile = this.tile;
        const frame = this.frame;
        const tileCtx = this.tileCtx;
        const tileCanvas = this.tileCanvas;
        const display = this.display;
        const displayCtx = this.displayCtx;
        if (
            !tile
            || !frame
            || !tileCtx
            || !tileCanvas
            || !display
            || !displayCtx
        ) {
            return;
        }

        this.syncSize(display);

        const o = this.view.options;
        const loopMs = o.noiseSpeed * 1000;
        const phase = loopMs > 0 ? (this.elapsed % loopMs) / loopMs : 0;
        const cells = o.noiseTileCells;
        const driftX = this.view.tileDriftX * cells * phase;
        const driftY = this.view.tileDriftY * cells * phase;

        if (this.rgb === undefined || this.rgbSource !== o.noiseColor) {
            this.rgb = RgbColor.fromCss(tileCtx, o.noiseColor);
            this.rgbSource = o.noiseColor;
        }
        tile.renderFrame(
            phase,
            driftX,
            driftY,
            this.rgb,
            this.view.tileOptions(),
            frame,
        );
        tileCtx.putImageData(frame, 0, 0);

        const size = Math.max(1, this.view.tileSize);
        displayCtx.imageSmoothingEnabled = false;
        displayCtx.clearRect(0, 0, display.width, display.height);
        for (let y = 0; y < display.height; y += size) {
            for (let x = 0; x < display.width; x += size) {
                displayCtx.drawImage(tileCanvas, x, y, size, size);
            }
        }
    }

    /** Keeps the display canvas backing store matched to its CSS box. */
    private syncSize(display: HTMLCanvasElement): void {
        const width = display.clientWidth;
        const height = display.clientHeight;
        if (display.width !== width || display.height !== height) {
            display.width = width;
            display.height = height;
        }
    }

    private static prefersReducedMotion(): boolean {
        return (
            typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }
}
