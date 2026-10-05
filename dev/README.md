# Testing mods in a running game

These scripts drive a running Subway Builder over the Chrome DevTools Protocol. The game can be on this machine or on another Mac reached over SSH.

## Start the game with a debugging port

On the Mac that runs the game:

```bash
open -a "Subway Builder" --args --remote-debugging-port=9222
```

From another Mac, run the same command over SSH, then forward local port 9229 to it:

```bash
ssh user@game-mac.local 'open -a "Subway Builder" --args --remote-debugging-port=9222'
ssh -f -N -o ExitOnForwardFailure=yes -L 9229:127.0.0.1:9222 user@game-mac.local
```

The scripts talk to `127.0.0.1:9229`. When the game runs locally, forward 9229 to 9222 the same way with `ssh ... localhost`, or edit the port in the scripts.

Quit the game normally when done; that closes the debugging port. While it's open, anything running on that Mac can control the game.

## Scripts

| Script | Use |
|---|---|
| `node dev/cdp.mjs '<js expression>'` | Evaluate in the game page (promises awaited) and print the result as JSON |
| `node dev/shot.mjs out.jpg` | Screenshot the game window |
| `node dev/click.mjs x y [left\|right]` | Click at CSS pixels (screenshot pixels ÷ 2 on a Retina screen). It hovers first, because map markers ignore clicks without a hover |
| `node dev/key.mjs text "0"` / `node dev/key.mjs key Escape` | Type text or press a key |

Hot-load a mod without installing it:

```bash
node dev/cdp.mjs "$(cat mods/emerald-ferry/index.js); 'loaded'"
```

A mod that exposes a `dispose()` (as Emerald Ferry does) can be loaded repeatedly without stacking hooks.

## Modding API gotchas

- `build.undoBlueprint()` only undoes hand-drawn placements. Track placed with `build.placeBlueprintTracks` must be removed with `eraseBlueprints()`.
- `placeBlueprintTracks` needs a track group per track, or `buildBlueprints` throws on `trackIds`.
- `placeBlueprintTracks` always creates plain track (`type: null`), so it can't make stations.
- `onBlueprintPlaced` fires before the placement reaches the undo stack: defer any `undoBlueprint()` call.
- `SubwayBuilderAPI.ui` is frozen, so its functions can't be stubbed in tests.
- The build panel reads the track-type list when it opens; reopen it after registering a type.
- Vehicles can't reverse on a single dead-end station track; routes need a crossover to turn back.
