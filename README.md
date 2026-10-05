# Subway Builder mods

Mods for [Subway Builder](https://www.subwaybuilder.com), built on its official modding API.

| Mod | What it does |
|---|---|
| [Emerald Ferry](mods/emerald-ferry/) | Sydney Emerald-class ferries, water-level wharves and a Ferry mode for building on the harbour |

## Layout

```
mods/<mod-id>/      one folder per mod: manifest.json, index.js, README.md, docs/
dev/                shared tools for testing mods in a running game
```

Each mod folder is self-contained. To install one, copy its folder into the game's mods folder (`~/Library/Application Support/metro-maker4/mods/` on macOS) and enable it in Settings → Mods.

## Adding a mod

1. Create `mods/<mod-id>/` with a `manifest.json` (`id`, `name`, `version`, `author`, `main`) and the entry script it names.
2. Mods are plain JavaScript run by the game with `new Function()`, so no imports: keep each mod to one self-contained script, or bundle it into one.
3. Add a README covering install, how to play it, and what it changes in the game.
4. Add a row to the table above.

## Testing

See [dev/README.md](dev/README.md) for driving a running game from the command line, including on another Mac over SSH.
