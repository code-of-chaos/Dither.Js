import type { HTMLAttributes, ReactNode } from "react";
import { Component, createRef } from "react";
import { DitherBackground } from "./DitherBackground";
import type { DitherBackgroundOptions } from "./DitherBackgroundView";
import { DitherBackgroundView } from "./DitherBackgroundView";

export interface DitherGridBackgroundProps
    extends Omit<HTMLAttributes<HTMLDivElement>, "color">,
        DitherBackgroundOptions {
    children?: ReactNode;
}

const OPTION_KEYS: ReadonlyArray<keyof DitherBackgroundOptions> = [
    "backgroundColor",
    "gridColor",
    "gridSize",
    "gridOpacity",
    "noiseColor",
    "noiseOpacity",
    "noiseSize",
    "noiseTileCells",
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
    "noiseSpeed",
    "noiseAngle",
    "noiseTravel",
    "noiseFps",
    "fadeStart",
    "fadeEnd",
    "animateNoise",
    "animateGlow",
];

/**
 * React wrapper around the framework-agnostic `DitherBackground`. Renders a
 * decorated div with the layered background and its children on top; every
 * visual prop maps 1:1 to `DitherBackgroundOptions` and is forwarded as CSS
 * custom properties, so it can be animated at runtime without regenerating
 * the texture. The tile is built on mount (client-side), so this component is
 * client-only - in Next.js the `"use client"` entry makes it App Router safe.
 */
export class DitherGridBackground extends Component<DitherGridBackgroundProps> {
    private readonly ref = createRef<HTMLDivElement>();
    private background?: DitherBackground;

    override componentDidMount(): void {
        const container = this.ref.current;
        if (!container) return;
        this.background = new DitherBackground(this.options(this.props));
        this.background.mount(container);
    }

    override componentDidUpdate(prev: DitherGridBackgroundProps): void {
        if (prev !== this.props) {
            this.background?.update(
                new DitherBackgroundView(this.options(this.props)).options,
            );
        }
    }

    override componentWillUnmount(): void {
        this.background?.destroy();
        this.background = undefined;
    }

    private options(props: DitherGridBackgroundProps): DitherBackgroundOptions {
        const options: Record<string, unknown> = {};
        for (const key of OPTION_KEYS) {
            options[key] = props[key];
        }
        return options as DitherBackgroundOptions;
    }

    override render() {
        const {
            children,
            className = "",
            animateNoise,
            animateGlow,
            ...rest
        } = this.props;

        const domProps: Record<string, unknown> = { ...rest };
        for (const key of OPTION_KEYS) delete domProps[key];

        return (
            <div
                ref={this.ref}
                className={[
                    "dither-grid-background",
                    animateNoise !== false
                        && "dither-grid-background--animated",
                    animateGlow !== false && "dither-grid-background--glow",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
                {...(domProps as HTMLAttributes<HTMLDivElement>)}
            >
                <div className="dither-grid-background__content">
                    {children}
                </div>
            </div>
        );
    }
}
