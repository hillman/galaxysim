# Milky Way Landscape Simulator

A procedural, physically based renderer for Milky Way night skies over sea or land, running entirely in the browser with WebGL2. The sky is computed from star catalogues, a measured dust map, nebula catalogues and planet orbits, then developed through a simulated atmosphere and camera. Terrain and branching trees are generated mathematically; no photographic scenery, tree sprites or image-model output is used.

## Run it

Open `index.html` in a recent desktop browser (Chrome, Edge, Firefox or Safari with WebGL2 and float render targets). No build step and no server are needed.

If your browser blocks anything when opened from a file, serve the folder instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

The page loads two Google Fonts over the network; everything else (code, star data, dust map) ships in this folder.

The live version is deployed to GitHub Pages from `main` by `.github/workflows/pages.yml`.

## Layout

The scripts are plain (non-module) scripts loaded in order by `index.html`, so the page still works straight from `file://`. They share top-level names, so load order matters only for code that runs immediately; everything kicks off from `js/main.js`.

| Path | Contents |
| --- | --- |
| `index.html` | Page markup and script order |
| `css/style.css` | All styling |
| `js/params.js` | Controls, presets, saved settings, formatters |
| `js/gl.js` | WebGL2 context, shader compilation, textures and framebuffers |
| `js/shaders/` | GLSL sources: `common`, `sky`, `passes` (sky/environment), `stars`, `composite` (sea, land, camera) |
| `js/astronomy.js` | Sidereal time, observer frame, aiming at the galactic centre |
| `js/colour.js` | Black-body colours and white balance |
| `js/stars.js` | Synthetic star field plus catalogue stars and clusters |
| `js/planets.js` | Planet positions and magnitudes |
| `js/galaxy-map.js` | Isophote fill, catalogue dust and the SFD dust texture |
| `js/trees.js` | Seeded branching geometry, tree species and antialiased branch rendering |
| `js/render.js` | Uniforms, tiled preview and export rendering, scheduling |
| `js/ui.js` | Control panel, readout, resizing |
| `js/main.js` | Start-up |
| `js/data/` | Embedded catalogues: stars and clusters, nebulae, Milky Way isophotes, dust map PNG |

The dust map stays a base64 data URI rather than a `.png` file because the page reads its pixels back, which browsers block for images loaded from `file://`.

## Using it

- Startup always opens **Processed · lone tree**, with progress through catalogue loading, shader compilation and the first render. Pick another preset or adjust the sliders; **Settings JSON → Restore last scene** recovers the previous saved scene.
- **Random scene** independently samples sky orientation, latitude, lens, aspect ratio, land or coast, terrain, trees and colour. It solves a night-time date, keeps the core in frame and constrains foreground scale and exposure; it does not select or tweak a preset. Its complete settings are saved and can be copied as JSON.
- **Render image** produces a full-quality PNG up to 8192 px, rendered in tiles.
- **Settings JSON** copies or applies a complete scene, so any image can be reproduced exactly.
- The **How this works** section at the bottom of the page documents the method in detail.

## Land and processed skies

- **Processed · lone tree**: a portrait with a cyan star-cloud palette, warm horizon, dry grassland and a branching bare tree.
- **Processed · mountain rift**: a wide diagonal band with peach/lavender cloud edges, layered mountain silhouettes and a deeper irregular rift.
- **Processed · blue coast**, **Oak meadow** and **Pine ridge panorama** explore the same renderer with a calm coast, a leafy foreground and a wide forested landscape.
- **Landscape → Land** switches any preset to dry terrain. Adjust mountain height, tree height/distance/position, species (bare tree, leafy oak or pine) and the landscape seed. Set foreground tree height to zero for an unobstructed landscape. Tree cover controls distant ridge vegetation independently.
- **Fine dust structure**, **Rift edge colour** and **Cloud palette** are independent controls, also available over the sea. The original presets keep all three at zero and retain their original coastal rendering. Old settings JSON loads with these defaults.

The added sky detail uses domain-warped, pixel-filtered density noise to modulate measured dust extinction, including finer elongated clouds across the core. In processed skies the core's broad extinction follows a filtered measured column; fine filaments add a small optical depth separately, avoiding the artificial bright curls produced by multiplying noise into a dense column. Edge colour depends on dust column and star-cloud brightness; the cloud palette affects galaxy light without tinting the background sky or resolved stars. These are photographic processing choices, not additional measured colour data.

Trees are built from seeded, curved, tapered branch segments in 3D, with smaller lateral shoots and species-specific foliage geometry. Branches are projected through the same camera as the sky and rasterized as antialiased triangles, including in tiled exports. No tree image or silhouette texture is loaded. Land uses layered procedural ridgelines and filtered ground detail; sky black-point subtraction is kept off the foreground so faint grass and trunks remain visible. GPU textures are still used for measured sky data and intermediate render buffers, as in the original renderer.

## Data sources

The page embeds data derived from:

- **Milky Way isophotes** by Jose R. Vieira, via [d3-celestial](https://github.com/ofrohn/d3-celestial) by Olaf Frohn (BSD-3-Clause).
- **Stars to magnitude 8** from the Hipparcos and Tycho catalogues (ESA), via d3-celestial.
- **Dust**: Schlegel, Finkbeiner & Davis (1998), ApJ 500, 525, via [sfddata](https://github.com/kbarbary/sfddata), resampled to galactic coordinates.
- **Dark nebulae, HII regions, reflection nebulae and clusters** (Lynds, Barnard, Sharpless, NGC/IC, Messier) from the [Stellarium DSO catalogue](https://github.com/Stellarium/stellarium/tree/master/nebulae/default).
- **Planet orbits**: E. M. Standish, Keplerian Elements for Approximate Positions of the Major Planets (JPL).

Check each source's licence before redistributing; Stellarium's repository is GPL-licensed.
