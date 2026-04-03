# War Nexus I18n Architecture

This project will ship with Turkish and English support from day one.

## Supported languages

- `tr`: Turkish
- `en`: English

## File structure

```text
locales/
  tr.json
  en.json
```

## Rules

- Never hardcode UI text directly inside components.
- Every visible label, button, title, system message, and report string must come from translation keys.
- When a new feature is added, Turkish and English entries must be added in the same change.
- Shared keys should stay grouped by feature: `navigation`, `base`, `map`, `battle`, `alliance`.
- Backend-driven messages should also map to translation keys when possible.

## Recommended runtime shape

```ts
type SupportedLocale = 'tr' | 'en';
```

```ts
type TranslationDictionary = typeof import('../locales/en.json');
```

## Example usage

```ts
t('navigation.base');
t('battle.victory');
t('buildings.hq.name');
```

## Naming conventions

- Use stable English-like keys.
- Keep labels in leaf values, not in key names.
- Prefer `battle.attackAgain` over duplicated generic phrases when context matters.

## Content standards

- Turkish copy should feel natural, concise, and game-ready.
- English copy should be short, readable, and globally understandable.
- Avoid slang unless it is intentionally part of the brand voice.

## Initial scope included

- Core navigation
- Authentication and home copy
- Base flow
- Buildings
- Units
- Research
- Map and battle reports
- Alliance
- Missions
- Notifications
- Error states

## Next localization layers

- Tutorial lines
- Push notification templates
- Combat result variations
- Event and season copy
- Store and battle pass content
