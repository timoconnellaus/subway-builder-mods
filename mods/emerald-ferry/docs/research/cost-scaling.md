# How ferry costs are scaled

Decision (2026-10-05): ferry economics are **relative**, so ferries feel like the rest of the game. Real Sydney ferry-vs-rail ratios are applied to the game's own rail prices. Source figures are in [emerald-class.md](emerald-class.md).

## Running cost: $270 per vessel-hour

The game's built-in trains, per passenger place per hour (8-car trains):

- Heavy metro: (250 + 25 × 8) / (240 × 8) = $0.234
- Commuter rail: (500 + 35 × 8) / (106 × 8) = $0.920

Their ratio, 3.92, is close to the real Sydney Trains / Sydney Metro ratio of 4.28 (IPART cost per place per year), so the game's rail prices are internally consistent with reality and are a fair baseline.

| Scaled from | Working | Ferry, $/vessel-hour |
|---|---|---|
| Heavy metro | 0.234 × (10,375 / 3,451) × 400 places | 282 |
| Commuter rail | 0.920 × (10,375 / 14,773) × 400 places | 258 |
| **Used** | mean | **270** |

## Vessel: $7.4m

Gen 1 Emerald ≈ $8.3m (2015) ≈ ⚠ $11m today. The game's metro car ($2.7m) is about 0.68 of a real Sydney Metro car (⚠ ~$4m), so 11 × 0.68 ≈ $7.4m.

## Wharf: ~$4.3m in game

Real wharf upgrade ≈ $8.5m. The game's surface commuter station ($55m base × 0.35 at-grade ≈ $19m) is about half the real $40m Tuggerah upgrade, so the target is ≈ $4.3m.

In Ferry mode a wharf is priced as elevated over water: 0.8 (elevated) × 2.5 (over water) = 2.0×. Base cost is therefore $2.15m. Measured in game at the earlier $1.7m base: a two-berth wharf cost exactly $3.4m, confirming the 2.0× factor.

## Estimates with no published data

- Acceleration 0.25 m/s², deceleration 0.3 m/s²
- Lane maintenance $1/m/yr; wharf maintenance $100k/yr
- Lane build cost $20/m (navigation aids only)
