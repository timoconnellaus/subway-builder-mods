# Emerald Ferry

Adds Sydney's Emerald-class ferries to [Subway Builder](https://www.subwaybuilder.com): a Ferry vessel and lane type, water-level wharves, and a Ferry mode for building on the harbour. Tested on Subway Builder 1.7.2.

## Install

Copy this folder into the game's mods folder, then enable **Emerald Ferry** in Settings → Mods:

- macOS: `~/Library/Application Support/metro-maker4/mods/emerald-ferry/`
- Windows: `%APPDATA%\metro-maker4\mods\emerald-ferry\`

## Play

1. In Toolbox → Construct, pick **Ferry** as the track type and leave Elevation at **0 m**. Ferry building switches on by itself: the ship button in the top-right toolbar lights up.
2. Build wharves with the station tool using **Parallel** tracks. Ferries turn around using the crossover between the two berths; on a single track they can't.
3. Draw ferry lanes between wharves. Lanes that cross land are refused.
4. Build the blueprints. Ferry building switches off once "Ferry" is no longer the track type and no ferry blueprints are waiting.
5. Create a route with train type **Ferry**, add the wharves, and buy ferries as usual.

The ship button can force ferry building on if it doesn't switch on by itself (for example, with the game in another language).

## What it changes

| Area | Effect |
|---|---|
| New | A "Ferry" vehicle and lane type, and the ship button |
| Only while ferry building is on | The `RAMP` and `ELEVATION_THRESHOLDS.ELEVATED` building heights are lowered so track can sit on the water, and rail between -1 m and 5 m is refused (tunnels and 5 m+ bridges are fine). Both heights are restored when it switches off, and on every game load. |
| Not touched | Other train types, their costs, fares, saved games |

## Numbers

| Item | In game | Based on |
|---|---|---|
| Passengers | 400 | Emerald class survey capacity |
| Top speed | 13.4 m/s (26 kn) | Cruising speed |
| Running cost | $270/hour | Real ferry vs Sydney Metro/Trains cost ratios, applied to the game's trains |
| Vessel | $7.4M | Real ~$11M, scaled like the game's metro cars |
| Two-berth wharf | ~$4.3M | Real ~$8.5M, scaled like the game's surface stations |

Sources and working:

- [Real-world data](docs/research/emerald-class.md)
- [How costs are scaled](docs/research/cost-scaling.md)
