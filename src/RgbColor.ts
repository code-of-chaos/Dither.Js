/** Immutable RGB triple with CSS color parsing. */
export class RgbColor {
    constructor(
        readonly r: number,
        readonly g: number,
        readonly b: number,
    ) {}

    /**
     * Parses any CSS color (named, hex, rgb()/rgba()) by letting the canvas
     * resolve it: assigning to fillStyle normalizes the value to a canonical
     * string which is then read back. Falls back to white on invalid input.
     *
     * A single var(--token, fallback) reference is resolved against the
     * document root first, so theme variables can be used as color parameters.
     */
    static fromCss(ctx: CanvasRenderingContext2D, css: string): RgbColor {
        const resolved = RgbColor.resolveVariable(css);
        ctx.fillStyle = "#000000";
        ctx.fillStyle = resolved;
        const normalized = ctx.fillStyle;

        if (normalized.startsWith("#")) {
            const hex = normalized.slice(1);
            const full =
                hex.length === 3
                    ? hex
                          .split("")
                          .map((c) => c + c)
                          .join("")
                    : hex;
            return new RgbColor(
                parseInt(full.slice(0, 2), 16),
                parseInt(full.slice(2, 4), 16),
                parseInt(full.slice(4, 6), 16),
            );
        }

        const match = normalized.match(/rgba?\(([^)]+)\)/);
        if (match) {
            const [r, g, b] = match[1]
                .split(/[,/\s]+/)
                .filter(Boolean)
                .map(Number);
            return new RgbColor(r, g, b);
        }

        return new RgbColor(255, 255, 255);
    }

    private static resolveVariable(css: string): string {
        const match = css.match(
            /^\s*var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\s*\)\s*$/,
        );
        if (!match) return css;

        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(match[1])
            .trim();
        return value || match[2]?.trim() || css;
    }
}
