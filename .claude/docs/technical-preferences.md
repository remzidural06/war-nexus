# Technical Preferences — War Nexus

## Engine & Language

- **Engine**: React Native 0.84
- **Language**: TypeScript (strict mode)
- **Rendering**: React Native StyleSheet (2.5D top-down, hotspot sistemi)
- **Physics**: N/A (turn-based / timer-based)
- **Platform**: iOS + Android, dikey mobil ekran

## Naming Conventions

- **Components**: PascalCase (`BaseScreen`, `ActionButton`)
- **Functions**: camelCase (`canUpgradeBuilding`, `startTrainingUnit`)
- **Types/Interfaces**: PascalCase (`BuildingState`, `ResourceKey`)
- **Constants**: UPPER_SNAKE_CASE (`STORAGE_KEY`, `SAVE_BATCH_DELAY_MS`)
- **Files**: PascalCase for components, camelCase for utilities
- **i18n keys**: dot.notation (`base.title`, `common.upgrade`)
- **Building IDs**: camelCase string literals (`barracks`, `researchLab`)

## Performance Budgets

- **Target Framerate**: 60fps (mobile)
- **Bundle Size**: minimize — no heavy dependencies
- **AsyncStorage**: batch save delay 4 saniye (SAVE_BATCH_DELAY_MS)
- **Re-render**: useMemo/useCallback agresif kullanımı — context value memo'lu

## Testing

- **Framework**: Jest
- **Test Location**: `src/__tests__/`
- **Required Tests**: Ekonomi formülleri, kaynak hesaplamaları, birim maliyetleri
- **Minimum Coverage**: kritik hesaplama fonksiyonları

## Forbidden Patterns

- `enerji` / `energy` kaynağı — tamamen kaldırıldı, ekleme
- Hospital, Power Plant, Radar, Turret binaları — kaldırıldı, ekleme
- `getUnlockedUnits` context closure'ı — stale closure riski; `baseSceneBuildings` doğrudan oku
- `trainingCount` (legacy) — yeni sistemde `trainedUnits[unitId]` kullan
- God component — BaseScreen büyük ama mantıksal bölümlere ayrılmış, daha büyütme

## Allowed Libraries / Addons

- `@react-native-async-storage/async-storage` — state persistence
- `react-native` core — UI
- `jest` — tests
- Başka dependency eklemeden önce onay al

## Architecture Decisions Log

- **ADR-001**: Sabit 7+2 bina sistemi (Airport/Shipyard dahil) — scope creep önleme
- **ADR-002**: Platform araştırması → birim üretim hattı (airport pattern tüm askeri binalara)
- **ADR-003**: trainedUnits[unitId] count sistemi (trainingCount legacy yerine)
- **ADR-004**: allianceContribution persist — bağış ve yardım isteme sistemi
- **ADR-005**: MapScreen committedUnits stepper — saldırı öncesi birim seçimi
- **ADR-006**: deductTrainedUnitsFromBuildings — kayıp birlikler tüm binalardan orantılı düşülür
