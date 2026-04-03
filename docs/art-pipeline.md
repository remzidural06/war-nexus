# War Nexus Art Pipeline

This document defines how base-building art should be produced and integrated for `War Nexus`.

## Goal

Move the current coded prototype toward a believable military base presentation without breaking the gameplay layout.

The current scene is a structural prototype.
The next quality step is asset-driven art.

## Visual Direction

- Theme: modern forward operating base
- Mood: premium, grounded, tactical
- Camera: 2.5D top-down with slight cinematic tilt
- World tones: warm sand / coastal / industrial earth
- UI tones: cool tactical overlays

## Asset Principles

- Every major building uses `3` visual tiers
- Tier progression:
  - `Tier 1`: improvised / early build
  - `Tier 2`: established facility
  - `Tier 3`: elite operational complex
- Buildings must remain readable on a phone screen
- Silhouette readability is more important than tiny detail

## Required Building Sets

V1 production order:

1. `HQ`
2. `Oil Refinery`
3. `Barracks`
4. `Research Lab`
5. `Power Plant`
6. `Ammo Factory`

## File Naming

Use the naming convention below:

- `hq_t1.png`
- `hq_t2.png`
- `hq_t3.png`
- `oil_refinery_t1.png`
- `oil_refinery_t2.png`
- `oil_refinery_t3.png`

Matching metadata lives in:

- `/src/assets/base/baseAssetRegistry.ts`

## Suggested Folder Layout

Store final assets under:

- `/src/assets/base/buildings/`
- `/src/assets/base/terrain/`
- `/src/assets/base/props/`

Suggested contents:

- `buildings/`: tiered building sprites
- `terrain/`: runway, road overlays, command plaza, coast edge
- `props/`: towers, crates, tents, vehicles, fuel tanks, smoke overlays

## Tier Art Notes

### HQ

- `Tier 1`: compact command bunker
- `Tier 2`: wider command wings, improved apron
- `Tier 3`: prestige command hub, stronger tower, richer roof detail

### Oil Refinery

- `Tier 1`: single stack and tank
- `Tier 2`: dual tanks and visible flare
- `Tier 3`: full industrial cluster, pipe density, smoke support

### Barracks

- `Tier 1`: small troop camp
- `Tier 2`: multi-tent barracks block
- `Tier 3`: formal garrison compound

## Technical Integration

The coded scene should not be deleted immediately.

Instead:

1. Keep the current layout and hotspot system.
2. Swap per-building visuals from code-rendered shapes to PNG assets.
3. Keep fallback shapes until each building asset set is ready.
4. Use the registry to decide which tier sprite to render.

## Implementation Plan

### Phase 1

- Registry is source of truth
- Current coded visuals remain as fallback
- Add asset hooks per building id and tier

### Phase 2

- Replace `HQ`, `Oil Refinery`, `Barracks` with real assets
- Keep other buildings on fallback visuals

### Phase 3

- Replace all major facilities
- Add terrain overlays and prop sprites
- Add subtle atmospheric layers

## Quality Bar

An asset is ready when:

- it reads clearly at phone scale
- its building type is recognizable without text
- its tier feels stronger than the previous one
- it fits the current base scene perspective

## Notes

- Do not over-detail tiny windows or micro text
- Prioritize silhouette, roof geometry, service yards, tanks, antennae, tents, and pads
- Avoid browser-game clutter
- Aim for believable military mood, not cartoon exaggeration

