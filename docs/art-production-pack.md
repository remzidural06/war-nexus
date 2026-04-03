# War Nexus Art Production Pack

This file is the practical production brief for the first real art pass of the base screen.

## Product Goal

Create a premium-looking mobile military base scene that feels:

- believable
- dense
- readable
- rewarding to upgrade

The visual target is not a browser clone.
It is a mobile-first command base with strong silhouettes, visible progress, and a more polished presentation.

## Camera And Composition

- Orientation: portrait
- Camera: high 2.5D tactical angle
- Focus point: HQ must be the visual anchor
- Base should read in 3 zones:
  - command core
  - military camp
  - industrial zone

## Visual Targets

The scene should communicate these ideas at a glance:

- a real operating base
- multiple active facilities
- organized infrastructure
- growth and prestige
- military seriousness

## Required Deliverables

### Buildings

Each building needs `3` tiers:

- `hq_t1.png`
- `hq_t2.png`
- `hq_t3.png`
- `power_plant_t1.png`
- `power_plant_t2.png`
- `power_plant_t3.png`
- `research_lab_t1.png`
- `research_lab_t2.png`
- `research_lab_t3.png`
- `oil_refinery_t1.png`
- `oil_refinery_t2.png`
- `oil_refinery_t3.png`
- `ammo_factory_t1.png`
- `ammo_factory_t2.png`
- `ammo_factory_t3.png`
- `barracks_t1.png`
- `barracks_t2.png`
- `barracks_t3.png`

### Terrain

- `base_scene.png`
- `runway_overlay.png`
- `command_plaza.png`
- `industry_ground.png`
- `military_ground.png`
- `coast_edge.png`

### Props

- guard tower
- truck convoy
- cargo crates
- tents
- fuel tanks
- smoke overlay
- radar mast
- light poles

## Building Art Notes

### HQ

- Must feel like the most expensive object in the scene
- Needs a strong center mass, command roof, entry gate, and helipad logic
- Tier 3 should feel prestigious, not merely larger

### Oil Refinery

- Must read instantly as heavy industry
- Storage tanks and vertical stacks are mandatory
- Pipes and loading logic should be visible

### Barracks

- Must read as troop housing and training zone
- Include tents or camp structures in lower tiers
- Higher tiers should feel more formal and permanent

### Research Lab

- Needs cleaner geometry than other buildings
- Cyan technology accents are acceptable
- Avoid sci-fi excess

### Power Plant

- Must feel functional, not decorative
- Convey energy transfer with pylons, conduits, transformers, or reservoirs

### Ammo Factory

- Must feel dangerous and industrial
- Reinforced doors, racks, bunker elements, or loading bays help

## Upgrade Readability

Every tier jump must visibly change:

- silhouette
- footprint
- complexity
- prestige

If two tiers look like minor recolors, the asset is not ready.

## Mobile Readability Rules

- No tiny text baked into art
- No micro-detail that disappears at phone scale
- Main shape should be readable at a glance
- Contrast against terrain must remain strong

## Palette Direction

- warm terrain
- muted concrete and sand
- darker industrial browns and steel
- controlled cyan only for technical structures and selected states

Avoid:

- toy-like saturation
- cartoony outlines
- flat pastel look

## Asset Dimensions

Recommended starting export size:

- building sprites: around `1024x768` transparent PNG
- terrain base: around `1440x2200` or similar portrait composition source

Runtime can scale down, but source art should start larger than device display.

## Integration Rules

- All assets map through `/src/assets/base/buildingImageSources.ts`
- Registry metadata remains in `/src/assets/base/baseAssetRegistry.ts`
- Scene layout remains controlled by `/src/data/mockBase.ts`
- Final rendering happens in `/src/screens/BaseScreen.tsx`

## Acceptance Checklist

An asset is ready when:

- building type is obvious without labels
- tier progression is visually meaningful
- asset feels grounded and not toy-like
- it holds up inside the live base scene
- it still reads well on a phone-sized viewport

