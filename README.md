# Dither.Js

Animated bitmap-dithered gradient backgrounds for React, with a tileable
Perlin/fBm noise engine for generating your own dither tiles.

The texture is a real Bayer-dithered noise bitmap (Perlin islands + fine
detail), generated once on a canvas and scrolled with a GPU-friendly CSS
transform. Everything visual - colors, grid, fade, speed, direction - is a
prop, driven through CSS custom properties so it can be animated at runtime.

## Install

```sh
npm install dither.js
```

## Usage

```tsx
import { DitherGridBackground } from "dither.js";
import "dither.js/style.css";

export function Page() {
    return (
        <DitherGridBackground className="min-h-screen w-full">
            <h1>Hello world</h1>
        </DitherGridBackground>
    );
}
```

Every visual property is optional (defaults in parentheses):

| Prop                                                            | Purpose                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `backgroundColor`                                               | Base fill, any CSS color or gradient                                        |
| `gridColor`, `gridSize`, `gridOpacity`                          | Structural grid lines (steel, 41px, 0.23)                                   |
| `noiseColor`, `noiseOpacity`                                    | Dither tile color and layer opacity (scarlet, 0.5)                          |
| `noiseSize`                                                     | Displayed size of each dither pixel in px (3)                               |
| `noiseDensity`, `noiseContrast`, `noiseMaxFill`, `noiseJitter`  | Dither character: fill amount, hardness, density cap, Bayer/random mix      |
| `noiseScale`, `noiseOctaves`                                    | Island field (clump size, fBm depth)                                        |
| `noiseDetailScale`, `noiseDetailOctaves`, `noiseDetailStrength` | Fine detail field layered on the islands                                    |
| `noiseClampLow`, `noiseClampHigh`                               | Soft-clamp the noise: clean voids low, no saturation high                   |
| `noiseTileCells`, `noiseSeed`                                   | Tile resolution and reproducible randomness                                 |
| `noiseSpeed`, `noiseAngle`, `noiseTravel`                       | Scroll animation: seconds per loop, direction in degrees, distance in tiles |
| `fadeStart`, `fadeEnd`                                          | Vertical fade of the dither layer (35%, 82%)                                |
| `animateNoise`, `animateGlow`                                   | Enable the scroll / ambient glow (both on)                                  |

Colors accept `var(--token, fallback)` references; they are resolved against
the document root, so theme variables work as parameters.

## Lower-level pieces

- `DitherTile` - generates a seamless Bayer-dithered PNG data URL from the
  noise fields; use it for static overlays and textures.
- `PerlinNoise` / `FractalBrownianNoise` - tileable gradient noise.
- `MathUtils` / `RgbColor` - helpers used by the engine.

## Development

```sh
npm install
npm run dev       # playground at demo/
npm test          # vitest
npm run lint      # biome
npm run build     # dist/ (ESM + types + style.css)
```

## Releasing

Releases use npm staged publishing with a stage-only token: CI stages the
version but can never publish directly (a leaked token cannot release a
version on its own).

1. Bump `version` in `package.json` (semver).
2. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The release workflow verifies the tag matches the package version, runs
   `npm stage publish --provenance` (needs an `NPM_TOKEN` repository secret
   holding a stage-only token) and creates a GitHub release.
4. A maintainer reviews and approves the staged version - with 2FA, either:
   - CLI: `npm stage list` to find the stage id, then
     `npm stage approve <stage-id>`
   - or the "Staged Packages" tab on npmjs.com and click Approve

   The version becomes installable only after approval. Discard a bad stage
   with `npm stage reject <stage-id>`.

Notes:

- `npm stage publish` does not prompt for 2FA - proof of presence is deferred
  to the approval step. Requires npm CLI 11.15+ (Node 22.14+).
- The first release creates the package (shown as a `0.0.0-stage` placeholder)
  until the staged version is approved.
- Direct `npm publish` with the stage-only token fails with `E_STAGE_REQUIRED`.

## Notes

- The tile is generated in the browser (canvas), so the component is
  client-side only.
- `prefers-reduced-motion` disables the animations.
- React 18+; class component, no runtime dependencies besides React.

## License

GPL-3.0-only (see `LICENSE`).
