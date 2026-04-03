# Directory Structure — War Nexus

```text
mobiloyun/
├── CLAUDE.md                        # Master configuration
├── .claude/                         # Agent definitions, skills, hooks, rules, docs
│   ├── agents/                      # 48 özelleşmiş agent tanımları
│   ├── skills/                      # 37 slash command
│   ├── hooks/                       # Otomatik validasyon hook'ları
│   ├── rules/                       # Kod standartları (path-scoped)
│   ├── docs/                        # Proje dokümantasyonu
│   └── settings.json                # Hook + izin ayarları
├── src/
│   ├── screens/                     # 4 tab ekranı
│   │   ├── BaseScreen.tsx           # Ana üs sahnesi (en büyük dosya ~4500 satır)
│   │   ├── MapScreen.tsx            # Harita / saldırı
│   │   ├── AllianceScreen.tsx       # İttifak
│   │   └── SettingsScreen.tsx       # Ayarlar
│   ├── state/
│   │   └── BaseGameContext.tsx      # Tüm oyun mantığı (~3500 satır)
│   ├── components/                  # Paylaşılan UI bileşenleri
│   │   ├── ActionButton.tsx
│   │   ├── InfoChip.tsx
│   │   ├── MetricCard.tsx
│   │   └── Panel.tsx
│   ├── assets/
│   │   └── base/
│   │       ├── buildings/           # T1/T2/T3 bina PNG asset'leri
│   │       ├── terrain/             # base_scane.png (1600x2200)
│   │       └── components.tsx       # BuildingAssetVisual
│   ├── data/
│   │   └── mockBase.ts              # Mock veriler (targets, alliance, missions)
│   ├── i18n/                        # Çeviri sistemi
│   └── theme/
│       └── colors.ts
├── locales/
│   ├── tr.json                      # Türkçe metinler
│   └── en.json                      # İngilizce metinler
├── snapshots/                       # Manuel yedekler (git yok)
└── production/                      # Sprint / milestone takibi
    ├── session-state/               # Ephemeral session state (active.md)
    └── session-logs/                # Session audit trail
```

## Kritik Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/state/BaseGameContext.tsx` | Oyun motoru — tüm state, hesaplamalar, timer'lar |
| `src/screens/BaseScreen.tsx` | Ana üs UI — bina hotspot'ları, panel mantığı |
| `src/data/mockBase.ts` | Static mock veri — targets, alliance, missions |
| `locales/tr.json` | Tüm Türkçe UI metinleri |
| `.claude/docs/technical-preferences.md` | ADR kayıtları ve kod standartları |
