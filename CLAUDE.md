# War Nexus — Claude Code Game Studios

Mobile strategy oyunu. React Native 0.84 + TypeScript, iOS & Android.
48 özelleşmiş agent, 37 slash command ile yönetilen yapı.

## Technology Stack

- **Platform**: React Native 0.84, React 19
- **Language**: TypeScript (strict)
- **State**: React Context + AsyncStorage (war-nexus/base-game/v1)
- **i18n**: TR / EN (locales/tr.json, locales/en.json)
- **Tests**: Jest
- **No git** — snapshot bazlı yedek (snapshots/ klasörü)

## Project Structure

@.claude/docs/directory-structure.md

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**Kullanıcı onayı gereklidir — otonom çalışma yok.**
Her görev: **Soru → Seçenekler → Karar → Taslak → Onay**

- Dosya yazmadan önce sor: "Bu dosyaya yazayım mı?"
- Çok dosyalı değişiklikler için tam changeset onayı gerekir
- Commit için explicit kullanıcı talebi şart

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md

## Game Systems Overview

### Binalar (7 — sabit kapsam)
HQ · Oil Refinery · Ammo Factory · Barracks · Research Lab · Bank · Skyscrapers+Houses
Airport · Shipyard (askeri üretim)

### Kaynaklar
petrol · mühimmat · nakit (enerji tamamen kaldırıldı)

### Araştırma Ağacı
Sekmeler: Birimler / Kara / Hava / Deniz / Savunma
Platform araştırması tamamlanınca ilgili binada üretim hattı açılır

### Birim Üretim
Barracks → Kara | Airport → Hava | Shipyard → Deniz | HQ → Savunma
trainedUnits[unitId] = count — savaşta kullanılır, kayıplar düşülür

### İttifak
donateToAlliance · requestAllianceHelp · allianceContribution persist ediliyor
