# War Nexus I18n Usage

Use the shared localization service from `src/i18n`.

## Available exports

```ts
import {
  defaultLocale,
  getLocale,
  hasTranslation,
  i18n,
  setLocale,
  supportedLocales,
  t,
} from '../src/i18n';
```

## Common usage

```ts
setLocale('tr');

const title = t('navigation.base');
const battleResult = t('battle.victory');
```

## Interpolation example

Translation values can include placeholders such as `{player}` or `{count}`.

```ts
const label = t('reports.attackSummary', {
  player: 'Ghost-21',
  count: 4,
});
```

## Integration guidance

- Keep locale state near app bootstrap or player settings.
- Persist the selected locale in device storage once the app shell exists.
- Drive all UI labels through `t(...)`.
- If a key is missing, the service falls back to English and then to the key itself.

## Recommended next step

When the frontend shell is created, add:

1. A language selector in settings
2. Persisted locale loading on startup
3. A UI binding layer for component re-renders when locale changes
