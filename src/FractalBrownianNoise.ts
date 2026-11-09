import { MathUtils } from "./MathUtils";
import { PerlinNoise } from "./PerlinNoise";

class Octave {
    constructor(
        readonly noise: PerlinNoise,
        readonly frequency: number,
        readonly amplitude: number,
    ) {}
}

/**
 * Fractal Brownian motion: stacks PerlinNoise octaves with halved amplitude
 * and doubled frequency per octave. Coordinates are expressed in tile cells,
 * keeping every octave (and therefore the whole field) seamlessly tileable.
 * Output is normalized to [0, 1].
 */
export class FractalBrownianNoise {
    private readonly octaves: Octave[] = [];
    private readonly totalAmplitude: number;

    constructor(cells: number, scale: number, octaves: number, seed: number) {
        let amplitude = 1;
        let total = 0;

        for (let o = 0; o < octaves; o++) {
            const period = Math.max(1, Math.round(cells / (scale * 2 ** o)));
            this.octaves.push(
                new Octave(
                    new PerlinNoise(period, seed + o * 1013),
                    period / cells,
                    amplitude,
                ),
            );
            total += amplitude;
            amplitude *= 0.5;
        }

        this.totalAmplitude = total;
    }

    sample(x: number, y: number): number {
        let sum = 0;

        for (const octave of this.octaves) {
            sum +=
                octave.amplitude
                * octave.noise.sample(
                    x * octave.frequency,
                    y * octave.frequency,
                );
        }

        return MathUtils.clamp((sum / this.totalAmplitude) * 0.6 + 0.5, 0, 1);
    }
}
