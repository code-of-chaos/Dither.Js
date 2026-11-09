import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Component } from "react";
import { DitherTile } from "./DitherTile";
import "./DitherGridBackground.css";

type CSSVars = CSSProperties & {
    [key: `--${string}`]: string | number | undefined;
};

export interface DitherGridBackgroundProps
    extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
    backgroundColor?: string;

    gridColor?: string;
    gridSize?: number;
    gridOpacity?: number;

    noiseColor?: string;
    noiseOpacity?: number;
    noiseSize?: number;
    noiseTileCells?: number;
    noiseDensity?: number;
    noiseContrast?: number;
    noiseScale?: number;
    noiseOctaves?: number;
    noiseDetailScale?: number;
    noiseDetailOctaves?: number;
    noiseDetailStrength?: number;
    noiseClampLow?: number;
    noiseClampHigh?: number;
    noiseSeed?: number;
    noiseMaxFill?: number;
    noiseJitter?: number;
    noiseSpeed?: number;
    noiseAngle?: number;
    noiseTravel?: number;

    fadeStart?: number;
    fadeEnd?: number;

    animateNoise?: boolean;
    animateGlow?: boolean;

    children?: ReactNode;
}

interface DitherGridBackgroundState {
    noiseImage: string;
}

/** Props that affect the generated tile; all others only set CSS variables. */
const TILE_INPUTS: ReadonlyArray<keyof DitherGridBackgroundProps> = [
    "noiseTileCells",
    "noiseColor",
    "noiseDensity",
    "noiseContrast",
    "noiseScale",
    "noiseOctaves",
    "noiseDetailScale",
    "noiseDetailOctaves",
    "noiseDetailStrength",
    "noiseClampLow",
    "noiseClampHigh",
    "noiseSeed",
    "noiseMaxFill",
    "noiseJitter",
];

/**
 * Layered page background: a scrolling dither texture, a static grid and an
 * optional ambient glow. Every visual property is forwarded as a CSS custom
 * property, so it can be animated at runtime (React state, CSS transitions)
 * without regenerating the texture.
 *
 * The dither tile is generated once and cached in state; it is only rebuilt
 * when one of the tile inputs (TILE_INPUTS) changes.
 */
export class DitherGridBackground extends Component<
    DitherGridBackgroundProps,
    DitherGridBackgroundState
> {
    constructor(props: DitherGridBackgroundProps) {
        super(props);
        this.state = { noiseImage: this.createNoiseImage() };
    }

    override componentDidUpdate(prev: DitherGridBackgroundProps): void {
        if (TILE_INPUTS.some((key) => prev[key] !== this.props[key])) {
            this.setState({ noiseImage: this.createNoiseImage() });
        }
    }

    private createNoiseImage(): string {
        return new DitherTile({
            cells: this.props.noiseTileCells ?? DitherTile.DEFAULT_CELLS,
            color: this.props.noiseColor ?? "var(--color-scarlet-600)",
            density: this.props.noiseDensity ?? 0.55,
            contrast: this.props.noiseContrast ?? 1.8,
            scale: this.props.noiseScale ?? 32,
            octaves: this.props.noiseOctaves ?? 3,
            detailScale: this.props.noiseDetailScale ?? 5,
            detailOctaves: this.props.noiseDetailOctaves ?? 3,
            detailStrength: this.props.noiseDetailStrength ?? 0.2,
            clampLow: this.props.noiseClampLow ?? 0,
            clampHigh: this.props.noiseClampHigh ?? 0.9,
            seed: this.props.noiseSeed ?? 69,
            maxFill: this.props.noiseMaxFill ?? 0.6,
            jitter: this.props.noiseJitter ?? 0.3,
        }).toDataURL();
    }

    override render() {
        const {
            backgroundColor = "linear-gradient(to bottom, var(--color-wine-950) 0%, var(--color-ink-950) 65%)",

            gridColor = "var(--color-steel-500)",
            gridSize = 41,
            gridOpacity = 0.23,

            noiseColor = "var(--color-scarlet-600)",
            noiseOpacity = 0.5,
            noiseSize = 3,
            noiseTileCells = DitherTile.DEFAULT_CELLS,
            noiseDensity = 0.55,
            noiseContrast = 1.8,
            noiseScale = 32,
            noiseOctaves = 3,
            noiseDetailScale = 5,
            noiseDetailOctaves = 3,
            noiseDetailStrength = 0.2,
            noiseClampLow = 0,
            noiseClampHigh = 0.9,
            noiseSeed = 69,
            noiseMaxFill = 0.6,
            noiseJitter = 0.3,
            noiseSpeed = 180,
            noiseAngle = 100, // Yes this is slightly higher than 90
            noiseTravel = 1,

            fadeStart = 0,
            fadeEnd = 90,

            animateNoise = true,
            animateGlow = true,

            children,
            className = "",
            style,
            ...props
        } = this.props;

        const tileSize = noiseTileCells * noiseSize;
        const angle = (noiseAngle * Math.PI) / 180;
        const travelX = Math.round(Math.cos(angle) * noiseTravel) * tileSize;
        const travelY = Math.round(Math.sin(angle) * noiseTravel) * tileSize;
        const overscan =
            Math.max(Math.abs(travelX), Math.abs(travelY)) + tileSize;

        const variables: CSSVars = {
            "--background-color": backgroundColor,

            "--grid-color": gridColor,
            "--grid-size": `${gridSize}px`,
            "--grid-opacity": gridOpacity,

            "--noise-image": `url("${this.state.noiseImage}")`,
            "--noise-tile-size": `${tileSize}px`,
            "--noise-color": noiseColor,
            "--noise-opacity": noiseOpacity,
            "--noise-speed": `${noiseSpeed}s`,
            "--noise-x": `${travelX}px`,
            "--noise-y": `${travelY}px`,
            "--noise-overscan": `${overscan}px`,

            "--fade-start": `${fadeStart}%`,
            "--fade-end": `${fadeEnd}%`,

            ...style,
        };

        return (
            <div
                className={[
                    "dither-grid-background",
                    animateNoise && "dither-grid-background--animated",
                    animateGlow && "dither-grid-background--glow",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
                style={variables}
                {...props}
            >
                <div
                    className="dither-grid-background__noise"
                    aria-hidden="true"
                >
                    <div className="dither-grid-background__noise-texture" />
                </div>

                <div
                    className="dither-grid-background__grid"
                    aria-hidden="true"
                />

                <div className="dither-grid-background__content">
                    {children}
                </div>
            </div>
        );
    }
}
