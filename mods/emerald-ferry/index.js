// Emerald Ferry: a Subway Builder mod adding Sydney Emerald-class ferries.
//
// How it works (see README.md and docs/research/ for the background):
// - The ferry is registered as a train type with its own track type, so rail
//   can never weld onto ferry lanes.
// - The game refuses track between the sea floor and 5 m above the water.
//   That 5 m is the moddable constant ELEVATION_THRESHOLDS.ELEVATED, which the
//   ocean check reads live. "Ferry mode" lowers it (and RAMP) so the normal
//   build tools accept lanes and wharves at water level, and restores both
//   when it ends. It switches on by itself while "Ferry" is the chosen track
//   type or ferry blueprints are waiting to be built.
// - Because that constant is global, Ferry mode undoes rail placed between
//   -1 m and 5 m while it is on, and every ferry placement is checked for land.
// - Wharves must be built with "Parallel" tracks: the game only lets trains
//   turn back via a crossover, never by reversing on a single dead-end track.
(function () {
  'use strict';

  const MOD = 'Emerald Ferry';
  const FERRY_ID = 'ferry';

  // While Ferry mode is on, track at 0 m counts as "elevated": that skips the
  // game's ocean-floor check and prices lanes with the 2.5x over-water viaduct
  // multiplier instead of the 100x at-grade one. RAMP must move too, because the
  // game classes anything at or below RAMP (default 0) as at-grade.
  const FERRY_MODE_THRESHOLDS = { RAMP: -0.75, ELEVATED: -0.5 };

  // Rail elevations whose classification Ferry mode changes (AT_GRADE to ELEVATED).
  const LOW_RAIL_BAND = [-1, 5];

  // Ferry lanes must sit on the water.
  const MIN_FERRY_ELEVATION = -0.5;
  const MAX_FERRY_ELEVATION = 1;

  // A wharf or lane may touch the shore; anything more than this on land is refused.
  const LAND_TOLERANCE_M = 40;

  // Physical stats come from real Emerald-class data; see docs/research/emerald-class.md.
  // Costs are RELATIVE: real Sydney ferry-vs-rail ratios applied to the game's
  // own rail prices, so ferries feel like the rest of the game. See
  // docs/research/cost-scaling.md for the working.
  const STATS = {
    // Performance. 26 kn cruising (OTSI Pemulwuy report) = 13.4 m/s.
    maxSpeed: 13.4,
    maxSpeedLocalStation: 5,
    maxAcceleration: 0.25, // estimate: no published figure
    maxDeceleration: 0.3, // estimate: no published figure
    maxLateralAcceleration: 1.0,
    maxCantMm: 0,
    maxCantDeficiencyMm: 150,
    maxSlopePercentage: 10, // water is flat; only matters at ramps
    crossoverSpeed: 5,
    // Timetables show ~3 min between intermediate arrival and departure, and an
    // ~8 min turnaround at Manly. The dynamic dwell model adds boarding time on top.
    stopTimeSeconds: 90,
    turnaroundTimeSeconds: 240,

    // Geometry: boats turn far tighter than trains.
    minTurnRadius: 40,
    minStationTurnRadius: 100,
    parallelTrackSpacing: 15, // two berths either side of a wharf
    trackClearance: 2,

    // The vessel: one "car" is one ferry.
    minCars: 1,
    maxCars: 1,
    carsPerCarSet: 1,
    capacityPerCar: 400, // survey capacity (OTSI)
    seatsPerCar: 375, // unsourced (Wikipedia); flagged in research notes
    doorsPerCarPerSide: 1, // single gangway
    carLength: 35, // 34.9 m (OTSI)
    trainWidth: 10.4, // 10.39 m beam (OTSI)
    minStationLength: 40,
    maxStationLength: 80,
    tphLimit: 7, // F1 design case: 8.5-minute headway

    // Costs. Running cost: IPART cost per place per year puts ferries at 3.0x
    // Sydney Metro and 0.70x Sydney Trains; applied to the game's heavy metro
    // and commuter rail that gives $282 and $258 per vessel-hour, averaged.
    trainOperationalCostPerHour: 270,
    carOperationalCostPerHour: 0,
    // Vessel: Gen 1 Emerald ~$8.3m in 2015 (~$11m today), scaled by the game's
    // metro car price vs the real Sydney Metro car (~0.68).
    carCost: 7_400_000,
    // Lanes are open water; this mostly covers navigation aids.
    baseTrackCost: 20,
    trackMaintenanceCostPerMeter: 1, // estimate: no published figure
    // Wharf: ~$8.5m real (Ferry Wharf Upgrade Program). The game prices surface
    // stations at about half of real (its ~$19m at-grade commuter station vs the
    // $40m Tuggerah upgrade), so the target is ~$4.3m. In Ferry mode a wharf is
    // priced as elevated over water (0.8 x 2.5 = 2.0x), hence the base.
    baseStationCost: 2_150_000,
    stationMaintenanceCostPerYear: 100_000, // estimate: no published figure
  };

  const FERRY_TYPE = {
    id: FERRY_ID,
    name: 'Ferry',
    description: 'Sydney Emerald-class ferry: 400 passengers, about 26 knots. Build lanes and wharves at 0 m with Ferry mode on.',
    stats: STATS,
    compatibleTrackTypes: [FERRY_ID],
    appearance: {
      color: '#009E4D', // TfNSW ferry mode colour
      bodyColor: { light: '#0B6E3F', dark: '#1F8F57' },
      roofStyle: 'boxy',
    },
    // Ferry lanes are open water, so no construction-type surcharges.
    elevationMultipliers: {
      DEEP_BORE: 1, STANDARD_TUNNEL: 1, CUT_AND_COVER: 1, TRENCHED: 1,
      AT_GRADE: 1, RAMP: 1, ELEVATED: 1,
    },
    portalCost: 0,
    rampCost: 0,
    maxOverpassSpan: 0,
  };

  let api = null;
  let ferryMode = false;
  let savedThresholds = null;
  let undoing = false;
  let manualFerryMode = false;
  let pollTimer = null;
  const POLL_MS = 400;
  const unsubscribers = [];

  function notify(message, kind) {
    api.ui.showNotification(message, kind || 'info', MOD);
  }

  function currentThresholds() {
    const t = api.utils.getConstants().CONSTRUCTION_COSTS.ELEVATION_THRESHOLDS;
    return { RAMP: t.RAMP, ELEVATED: t.ELEVATED };
  }

  function setThresholds(values) {
    api.modifyConstants({ CONSTRUCTION_COSTS: { ELEVATION_THRESHOLDS: values } });
  }

  function setFerryMode(on) {
    if (on === ferryMode) return;
    ferryMode = on;
    if (on) {
      savedThresholds = currentThresholds();
      setThresholds(FERRY_MODE_THRESHOLDS);
      notify('Ferry building on: wharves and lanes can sit on the water at 0 m. Build wharves with Parallel tracks.');
    } else {
      setThresholds(savedThresholds || { RAMP: 0, ELEVATED: 5 });
      savedThresholds = null;
    }
  }

  // The build panel shows the chosen track type as a button next to the
  // "Track Type" label. Returns that type's id, or null when the panel is shut.
  function selectedBuildTrackType() {
    const label = [...document.querySelectorAll('span')].find(
      (el) => el.childElementCount === 0 && el.textContent.trim() === 'Track Type');
    if (!label) return null;
    const idByName = new Map(Object.values(api.trains.getTrainTypes()).map((t) => [t.name, t.id]));
    let row = label;
    for (let i = 0; i < 6 && row; i++) {
      row = row.parentElement;
      const button = row && [...row.querySelectorAll('button')].find((b) => idByName.has(b.innerText.trim()));
      if (button) return idByName.get(button.innerText.trim());
    }
    return null;
  }

  // The game prices construction when blueprints are built, so the ferry rules
  // must stay on until ferry blueprints are built or cleared, or wharves would
  // be charged the 100x at-grade-over-water rate.
  function hasFerryBlueprints() {
    return api.gameState.getTracks().some((t) => t.buildType === 'blueprint' && t.trackType === FERRY_ID);
  }

  function updateFerryMode() {
    if (!api) return;
    setFerryMode(manualFerryMode || selectedBuildTrackType() === FERRY_ID || hasFerryBlueprints());
  }

  // The ocean-depth label layer only exists for cities with sea-floor data.
  // Without it the game has no idea where water is, so the land check is skipped.
  function cityHasDepthData() {
    const map = api.utils.getMap();
    return !!(map && map.getLayer && map.getLayer('ocean-depth-labels'));
  }

  // The hook fires before the game records the placement on its undo stack,
  // so the undo has to wait a tick or it would undo the previous placement.
  function undoPlacement(message) {
    notify(message, 'warning');
    setTimeout(() => {
      undoing = true;
      try {
        api.build.undoBlueprint();
      } finally {
        undoing = false;
      }
    }, 50);
  }

  function lengthMeters(coords) {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const [lon1, lat1] = coords[i - 1];
      const [lon2, lat2] = coords[i];
      const rad = Math.PI / 180;
      const dLat = (lat2 - lat1) * rad;
      const dLon = (lon2 - lon1) * rad;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
      total += 2 * 6371000 * Math.asin(Math.sqrt(a));
    }
    return total;
  }

  function checkPlacement(placed) {
    if (undoing || !placed || placed.length === 0) return;

    // The hook payload may predate derived fields, so read the stored tracks.
    const byId = new Map(api.gameState.getTracks().map((t) => [t.id, t]));
    const tracks = placed.map((t) => byId.get(t.id) || t);
    const ferry = tracks.filter((t) => t.trackType === FERRY_ID);
    const other = tracks.filter((t) => t.trackType !== FERRY_ID);

    // While the ferry rules are on, rail between -1 m and 5 m would be priced
    // and checked as if it were elevated. Tunnels and real viaducts are unaffected.
    const lowRail = other.find((t) =>
      [t.startElevation, t.endElevation].some((e) => e > LOW_RAIL_BAND[0] && e < LOW_RAIL_BAND[1]));
    if (ferryMode && lowRail) {
      undoPlacement('Build or clear your ferry blueprints first, then draw surface rail. Tunnels and bridges 5 m+ are fine now.');
      return;
    }
    if (ferry.length === 0) return;

    const offWater = ferry.find((t) =>
      t.startElevation < MIN_FERRY_ELEVATION || t.startElevation > MAX_FERRY_ELEVATION ||
      t.endElevation < MIN_FERRY_ELEVATION || t.endElevation > MAX_FERRY_ELEVATION);
    if (offWater) {
      undoPlacement('Ferry lanes sit on the water. Set Elevation to 0 m and try again.');
      return;
    }

    if (cityHasDepthData()) {
      let landMeters = 0;
      for (const t of ferry) {
        const pct = typeof t.waterIntersectionPercentage === 'number' ? t.waterIntersectionPercentage : 100;
        landMeters += lengthMeters(t.coords || []) * (1 - pct / 100);
      }
      if (landMeters > LAND_TOLERANCE_M) {
        undoPlacement(`Ferries can't cross land. About ${Math.round(landMeters)} m of that is on land. Keep the lane on the water.`);
        return;
      }
    }

    const stationTracks = ferry.filter((t) => t.type === 'station');
    if (stationTracks.length > 0 && stationTracks.length < 4) {
      notify('Tip: build wharves with "Parallel" tracks. Ferries turn around using the crossover between the two berths; on a single track they can\'t turn back.', 'warning');
    }
  }

  function init(sb) {
    api = sb;
    api.trains.registerTrainType(FERRY_TYPE);

    // Ferry mode follows the build panel on its own; the button shows its state
    // and can force it on if the panel can't be read (e.g. another language).
    api.ui.addToolbarButton({
      id: 'emerald-ferry-mode',
      icon: 'Ship',
      tooltip: 'Ferry building (turns on automatically when "Ferry" is the track type)',
      onClick: () => {
        manualFerryMode = !manualFerryMode;
        updateFerryMode();
      },
      isActive: () => ferryMode,
    });

    pollTimer = setInterval(updateFerryMode, POLL_MS);

    unsubscribers.push(api.hooks.onBlueprintPlaced((tracks) => {
      try {
        checkPlacement(tracks);
      } catch (err) {
        console.error(`[${MOD}] placement check failed`, err);
      }
    }));

    // Never leave the relaxed water rule behind when a game ends or loads.
    const reset = () => {
      manualFerryMode = false;
      setFerryMode(false);
    };
    unsubscribers.push(api.hooks.onGameEnd(reset));
    unsubscribers.push(api.hooks.onGameLoaded(reset));

    console.log(`[${MOD}] loaded`);
  }

  function waitForApi() {
    if (window.SubwayBuilderAPI) init(window.SubwayBuilderAPI);
    else setTimeout(waitForApi, 250);
  }

  // Exposed so a dev session can hot-load this file repeatedly without
  // stacking hooks from earlier copies.
  function dispose() {
    clearInterval(pollTimer);
    manualFerryMode = false;
    setFerryMode(false);
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  }
  if (window.__emeraldFerry && window.__emeraldFerry.dispose) window.__emeraldFerry.dispose();
  window.__emeraldFerry = { setFerryMode, isFerryMode: () => ferryMode, dispose, STATS };
  waitForApi();
})();
