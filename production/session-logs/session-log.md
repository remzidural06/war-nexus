## Archived Session State: 20260323_220124
# War Nexus — Session State (2026-03-23)

## Bu Session'da Tamamlananlar

### A — Araştırma Merkezi Yeniden Yapılandırıldı
- Tüm araştırmalar Araştırma Merkezi'ne taşındı (askeri binalardan kaldırıldı)
- 4 alt sekme: Kara | Hava | Deniz | Savunma
- Araştırma sayısı 14'ten 28'e çıkarıldı (her dal 7: T1×2→T2×2→T3×2→T4×1 kapstone)
- T4 kapstone araştırmaları +%15 bonus veriyor
- `ResearchTier` tipi 1-4 olarak güncellendi

### B — Birim Bazlı Savaş Sistemi (Combat Engine)
- `src/data/combatMatrix.ts` — Çapraz tablo kuralları (tek kaynak)
- `src/utils/combatEngine.ts` — resolveUnitCombat() fonksiyonu
- Her saldıran birim ↔ savunan birim çapraz tablodan kontrol edilir
- Hasar hedefler arasında eşit paylaştırılır (katlanma hatası düzeltildi)
- 9 dal: infantry, armor, artillery, uav, helicopter, fixedWing, bomber, naval, airDefense
- Tüm 15 hedefe tematik `defenseUnits` dizisi eklendi
- Eski `defenseRating` fallback olarak korunuyor

### C — Birlik (Formation) Sistemi Geliştirildi
- Birden fazla birlik seçilebilir (çoklu seçim)
- Birlik oluşturulunca birimler envanterden düşülür
- Birlik silinince birimler envantere geri döner
- Savaş kazanılsa bile birimler birlikte kalır (envantere dönmez)
- Kaybeden tüm birliklerini kaybeder
- `marchUnits` ile birim kompozisyonu sefer'e geçirilir
- `adjustTrainedUnits` context fonksiyonu eklendi

### D — Koordinat Sistemi Güncellendi
- 3 kutu × 2 hane = X.Y.Z formatı (örn: 1.1.4, 3.7.4)
- Kutular arası nokta ayırıcı
- SALDIR butonu aynı satırda, koordinat doğruysa yeşil
- Manuel sevk kaldırıldı
- Tüm hedef koordinatları yeni formata güncellendi

### E — Saldırı Bildirimi + Savunma Sistemi
- CPU karşı saldırısı (%40 ihtimal, 10-25 dk süre)
- `IncomingAttackBanner` — tam genişlik bildirim bandı
- Birlik durumu gösterimi: "Birlik Hazır" / "Birlik Hazır Değil!"
- `resolveIncomingAttack` — birim bazlı savaş (resolveUnitCombat kullanır)
- Birlik yoksa otomatik kayıp + ağır kaynak cezası
- Kaybeden 4 saat koruma kalkanı alır (`shieldUntil`)

### F — Savaş Raporları
- `BattleResultModal` — tam ekran detaylı rapor (zafer/yenilgi)
- Düşman birlikleri, senin birliklerin, hasar detayları, güç karşılaştırması
- Kaynak değişimi + XP değişimi gösteriliyor
- Komuta Merkezi'nden hedefler kaldırıldı, yerine savaş raporları listesi
- Raporlara tıklanınca detay modal'ı açılır
- Hem saldırı hem savunma raporları

### G — XP Sistemi
- `⭐ XP` üst kaynak çubuğunda gösteriliyor
- Saldırı zaferi: düşman gücünün %20'si kadar XP
- Saldırı yenilgisi: kendi XP'nin %20'si kayıp
- Savunma zaferi: düşman gücünün %20'si kadar XP
- Savunma yenilgisi: kendi XP'nin %20'si kayıp
- Bina yükseltme: yeni seviye × 10 XP
- Araştırma: tier × 15 XP (T1→15, T2→30, T3→45, T4→60)
- Görev: toplam kaynak ödülünün %10'u XP
- XP persist ediliyor, savaş raporlarında gösteriliyor
- Yükseltme/araştırma/görev kartlarında kazanılacak XP gösteriliyor

### H — Görev Sistemi (50 Görev)
- 27'den 50'ye çıkarıldı, 5 aşama (order 1-50)
- İlk 10 görev açık, her tamamlanan görev +1 yeni açar
- Görev merge sistemi: eski save ile yeni görevler uyumlu
- `order` alanı eklendi (Mission tipine)
- Dinamik XP ödülleri (kaynak toplamının %10'u)

### I — Birim Görselleri
- 74 birim görseli lokal asset olarak indirildi (`src/assets/base/units/`)
- `UnitImage` bileşeni paylaşılabilir hale getirildi (`src/components/UnitImage.tsx`)
- Önce lokal asset dener (`unitId` prop), yoksa wsrv.nl proxy fallback
- Savaş raporları, çapraz tablo, birimler tablosu — hepsi gerçek resim
- Toplam asset boyutu: ~3.5MB

### J — HelpScreen (Yardım Ekranı)
- Yeni tab: ❓ Yardım (alt barda Görevler yanında)
- 4 sekme: Binalar Tablosu, Komuta Merkezi Seviyeleri, Çapraz Tablo, Birimler Tablosu
- Çapraz Tablo interaktif: birim seç → etkileşim listesi (saldırır/karşılıklı/alır/yok)
- Komuta Merkezi seviyeleri: Lv5→orta, Lv10→zor, Lv15→elit, Lv20→son

### K — Diğer Düzeltmeler
- Bradley resmi düzeltildi (404 URL → çalışan Special:FilePath)
- Stinger resmi düzeltildi
- Kızılelma resmi güncellendi
- 9+ birim resmi bulunamayan/bozuk → düzeltildi
- Kışla/Tank Fab. "Lv.4'de açılacaklar" başlığı düzeltildi

## Yeni Dosyalar
- `src/data/combatMatrix.ts` — Savaş etkileşim matrisi
- `src/utils/combatEngine.ts` — Birim bazlı savaş motoru
- `src/components/UnitImage.tsx` — Paylaşılan birim görseli bileşeni
- `src/components/IncomingAttackBanner.tsx` — Saldırı bildirimi
- `src/components/BattleResultModal.tsx` — Savaş raporu modal
- `src/screens/HelpScreen.tsx` — Yardım ekranı
- `src/assets/base/units/index.ts` — Lokal birim görselleri require map
- `src/assets/base/units/*.jpg` — 74 birim görseli

## Değiştirilen Dosyalar
- `App.tsx` — HelpScreen, IncomingAttackBanner, BattleResultModal entegrasyonu
- `src/state/types.ts` — DefenseUnit, MarchUnit, IncomingAttack, UnitBattleResult, xpChange, order
- `src/state/DesertGameContext.tsx` — Combat engine entegrasyonu, XP, shield, birlik count
- `src/screens/BaseScreen.tsx` — Araştırma sekmeleri, birlik sistemi, savaş raporları
- `src/screens/HelpScreen.tsx` — Çapraz tablo shared import
- `src/screens/SettingsScreen.tsx` — 50 görev, aşamalı açılma
- `src/data/research.ts` — 28 araştırma (4×7)
- `src/data/mapTargets.ts` — defenseUnits, yeni koordinat formatı, HQ level gereksinimleri
- `src/data/units.ts` — Birim resim URL düzeltmeleri
- `src/data/missions.ts` — 50 görev, order alanı
- `src/components/BottomTabs.tsx` — Yardım sekmesi
- `src/components/ResourceBar.tsx` — XP gösterimi
- `src/components/TopBar.tsx` (dolaylı)

## Mevcut Teknik Borçlar
- Test kodu kaldırıldı ama birim ekleme kodu yok (yeni başlangıçta birim yok)
- `BaseScreen.tsx` kullanılmayan import'lar var (DIFFICULTY_COLORS_HQ, hqWinChance vb.)
- Birlik state'i hala BaseScreen'de lokal — context'e taşınabilir
- `shieldUntil` persist edilmiyor (uygulama yeniden başlarsa kaybolur)
- Savaş raporlarında `UnitImage` banner prop kullanılmıyor

## Sıradaki Aday Adımlar
1. Birlik state'ini context'e taşı (persist + cross-screen erişim)
2. Harita ekranında hedeflere saldırı UI
3. Multiplayer altyapısı
4. Radar İstasyonu → savunma birim üretim binası kararı
5. shieldUntil persist
---

## Archived Session State: 20260326
# War Nexus — Session State (2026-03-26)

## Bu Session'da Tamamlananlar

### A — Altın Ekonomi Sistemi
- 50 görevden 5 milestone'a altın ödülü (toplam 50 altın)
- Görev kartlarında 🪙 ikonu
- Başlangıç altını: 150

### B — Hızlandırma Sistemi
- Bina yükseltme: seviye bazlı sabit maliyet (Lv.1=5 → Lv.20=350)
- Eğitim/Araştırma: süre bazlı kademeli (3dk=5 → 24sa=400)
- CountdownTimer'a "🪙 X Hızlandır" butonu
- speedUpWithGold alan adı fix + tamamlama mantığı fix

### C — Admin Paneli (AdminScreen.tsx)
- ADMIN_UID: fDXCXZYZr1PapwTjAlsM3RZoKRn1 (eLpatroN)
- TopBar'da ⚙️ ikonu
- Oyuncu arama, bina seviye değiştirme, birim ekleme, toplu birim ekleme
- Tüm oyuncuların gücünü güncelleme butonu

### D — Sıralama Anlık Güncelleme
- serverTimestamp() → Date.now() fix (KRİTİK — sıralama güncellenmiyordu)
- 15sn → 5sn yenileme
- Savaş sonrası her iki tarafın playerPower'ı Firestore'a yazılıyor
- Oyunda olmayan oyuncunun gücü de savaş sonrası güncelleniyor

### E — Savaş Motoru v3
- Kazanan: 0 kayıp (tüm savaş tiplerinde)
- Savunan: saldıranın birim sayısı kadar kayıp (her zaman)
- Saldıran kaybederse: savunanın birim sayısı kadar kayıp
- 3 ayrı kayıp uygulama noktası düzeltildi (resolveIncomingAttack, CPU savaş, PvP savaş)

### F — Emülatör + Auth Fix
- AVD disk 6GB → 12GB
- "undefined is not a function" — temiz install ile çözüldü

## Yeni Dosyalar
- `src/screens/AdminScreen.tsx` — Admin paneli

## Değiştirilen Dosyalar
- `src/state/DesertGameContext.tsx` — altın, hızlandırma, savaş kuralları, sıralama sync
- `src/utils/combatEngine.ts` — savaş motoru v3
- `src/services/cloudSave.ts` — serverTimestamp fix, migratePlayerPower
- `src/data/missions.ts` — altın ödülleri
- `src/screens/BaseScreen.tsx` — hızlandırma butonu
- `src/screens/SettingsScreen.tsx` — görev altın ikonu
- `src/screens/LeaderboardScreen.tsx` — 5sn yenileme
- `src/components/CountdownTimer.tsx` — hızlandırma butonu
- `src/components/TopBar.tsx` — admin butonu
- `App.tsx` — admin tab

## Deploy
- Android: emülatöre yüklü (güncel)
- Web: GitHub Pages (güncel)

## Sıradaki
1. Gerçek ittifak sistemi
2. Chat + Push Notification
3. Ses/müzik
4. UI polish
5. In-app purchase
---

## Archived Session State: 20260401_011614
# War Nexus — Session State (2026-04-01)

## Durum: BETA %90+ tamamlandı

## Son Oturum Özeti (31 Mart - 1 Nisan)

### Yapılanlar
1. Bot saldırı düzeltmeleri (targetName, banner, birim kayıp, kaynak transfer)
2. Bot birim ID düzeltmesi (12 yanlış ID, 130 bot güncellendi)
3. Genel sohbet sistemi (GlobalChatModal, küfür filtresi, bot sohbet, akıllı cevap)
4. Admin paneli sıfırdan (6 tab: Oyuncular/İttifak/Botlar/Savaş/Sunucu/Sohbet)
5. İttifak rütbe sistemi (7 rütbe, dropdown atama)
6. Gelişmiş bağış sistemi (kasa, talepler, sıralama, yükseltme, boost)
7. İttifak ayarları yeniden (detay düzenleme, kickle, devret, sil)
8. Server combat engine (functions/combatEngine.js, branch-aware)
9. Savaş sonuç raporu (warResult, MVP, üye katkıları)
10. Bot otomasyon (gelişim hızı artırıldı, ittifak savaşı 72h, sohbet 15dk)
11. Birim eğitim stepper (-100/-10/-/input/+/+10/+100)
12. Savaş dengeleme (kaybeden 0 puan, 3dk sefer, 2h ittifak cooldown)

### Proje İstatistikleri
- Toplam kod: ~21,400 satır
- Ekranlar: 11 | Bileşenler: 11 | Cloud Functions: 27
- 130 bot, 15 bot ittifak, 450+ bot mesaj havuzu

### Sıradaki Öncelikler
1. Google Play IAP (altın satışı)
2. Push Notification (saldırı/savaş bildirimi)
3. APK v0.2.0 release build
4. Tutorial/Onboarding
5. Profil sayfası zenginleştirme

### Deploy Durumu
- Android: emülatöre yüklü (güncel)
- Web: GitHub Pages (güncel)
- Cloud Functions: 27 fonksiyon aktif
- Firestore Rules: güncel (globalChat, donationRequests dahil)

### Aktif Kullanıcılar
- eLpatroN (admin), Chapo, malamadre, EnginPaşa, bulldog + 130 bot
---

## Archived Session State: 20260403_20260404
# War Nexus — Session State (2026-04-03 / 04)

## Durum: Altyapı Güçlendirme — Versiyon Kontrolü + Test + Modülerlik

### Özet
3 kritik altyapı eksikliği giderildi: Git kurulumu, test kapsamı genişletme, ve BaseScreen modülerleştirme. Toplam 9 commit, 14 yeni dosya, 142 test.

---

### A — Versiyon Kontrolü (Git)
- .gitignore güncellendi: dist/, metro log'ları, tmp_*, *.apk, *.aab, android bundle eklendi
- İlk commit oluşturuldu: 495 dosya, 69,353 satır (`4631e48`)
- Branch stratejisi kuruldu: `main` (kararlı) + `develop` (aktif geliştirme)
- master → main rename edildi
- Toplam 9 commit (develop branch)

### B — Test Kapsamı (21 → 142 test, 6.8x artış)

| Test Dosyası | Test Sayısı | Kapsam |
|-------------|------------|--------|
| economyMath.test.ts | 27 | Maliyet, süre, savaş, kayıp, üretim, kapasite |
| gameHelpers.test.ts | 25 | Birim kapasitesi, altın maliyeti, kaynak değişimi |
| combatEngine.test.ts | 22 | Branch-aware savaş, araştırma bonusu |
| formatters.test.ts | 17 | Sayı/süre/ilerleme formatlama |
| units.test.ts | 15 | Birim veri bütünlüğü |
| combatMatrix.test.ts | 13 | Savaş matrisi doğrulama |
| research.test.ts | 12 | Araştırma ağacı, önkoşullar |
| buildings.test.ts | 11 | Bina veri bütünlüğü |

### C — BaseScreen Modülerleştirme (1,970 → 468 satır, %76 azalma)

**Çıkarılan modüller:**
1. `BaseScreen.styles.ts` (607 satır) — Tüm StyleSheet tanımları
2. `BaseScreen.constants.ts` (95 satır) — Canvas boyutları, hotspot pozisyonları, HQ helpers
3. `DraggableHotspot.tsx` (139 satır) — Sürüklenebilir bina bileşeni
4. `useBaseEditorState.ts` (103 satır) — Editör modu state yönetimi
5. `OverviewTab.tsx` (196 satır) — Bina genel bakış + yükseltme UI
6. `UnitsTab.tsx` (170 satır) — Birim eğitimi + kapasite yönetimi
7. `ResearchTab.tsx` (120 satır) — Araştırma ağacı navigasyonu
8. `HarekatTab.tsx` (136 satır) — Sefer/ordu durumu + birlik listesi
9. `BirlikModal.tsx` (163 satır) — Birlik oluşturma modalı

**Evrim:**
```
1,970 → 1,285 → 1,148 → 1,072 → 848 → 721 → 468 satır
```

### D — DesertGameContext Kısmi Ayrıştırma
- `gameHelpers.ts` (95 satır) — Saf hesaplama fonksiyonları context'ten çıkarıldı
  - getUnitCapForLevel, calcGoldCostForTime, calcUpgradeGoldCostForLevel
  - calcTrainingCost, calcGoldExchangeAmount, canAffordResources, makeInitialResources
- DesertGameContext: 2,673 → 2,631 satır (%2 azalma)

### E — TypeScript Hata Düzeltmeleri
- HarekatTab: BUILDING_BRANCHES `label` → `i18n` destructuring düzeltildi
- BaseScreen.constants.ts: `window`/`document`/`navigator` → `globalThis` (RN uyumluluğu)
- BaseScreen.tsx: eksik `getBuildingLabel` fonksiyonu geri eklendi

### F — Doğrulama
- Jest: 8/8 suite, 142/142 test PASS
- TypeScript: bizim dosyalarda 0 hata (mevcut 74 hata daha önceden var)
- Vite web build: başarılı (3.27s)
- Import zincirleri: 50+ import doğrulandı (tüm yeni dosyalar)

## Commit Geçmişi
```
b79690b fix: resolve TypeScript errors in extracted modules
3c423e7 refactor: extract HarekatTab and BirlikModal from BaseScreen
3f8bc65 refactor: extract UnitsTab from BaseScreen
580ba87 refactor: extract OverviewTab and ResearchTab from BaseScreen
f1bbb5a refactor: extract useBaseEditorState hook from BaseScreen
3841ef8 refactor: extract DraggableHotspot component and gameHelpers module
318512e refactor: extract BaseScreen styles and constants to separate files
9b9e70e test: expand test coverage from 21 to 117 tests
4631e48 chore: initial commit — War Nexus alpha v0.1.0
```

## Yeni Dosyalar (14 adet)
- src/screens/BaseScreen.styles.ts
- src/screens/BaseScreen.constants.ts
- src/components/DraggableHotspot.tsx
- src/components/panels/OverviewTab.tsx
- src/components/panels/UnitsTab.tsx
- src/components/panels/ResearchTab.tsx
- src/components/panels/HarekatTab.tsx
- src/components/panels/BirlikModal.tsx
- src/hooks/useBaseEditorState.ts
- src/state/gameHelpers.ts
- src/__tests__/combatEngine.test.ts
- src/__tests__/formatters.test.ts
- src/__tests__/combatMatrix.test.ts
- src/__tests__/units.test.ts
- src/__tests__/buildings.test.ts
- src/__tests__/research.test.ts
- src/__tests__/gameHelpers.test.ts

## Değiştirilen Dosyalar
- .gitignore (dist/, log, tmp, apk, android bundle eklendi)
- src/screens/BaseScreen.tsx (1,970 → 468 satır)
- src/state/DesertGameContext.tsx (2,673 → 2,631 satır)
- src/__tests__/economyMath.test.ts (+6 test eklendi)

## Kalan Teknik Borçlar
- DesertGameContext hala 2,631 satır (PvP/Combat hook çıkarılabilir)
- AllianceScreen 2,380 satır (BaseScreen gibi parçalanmalı)
- App.test.tsx kırık (BaseGameContext → DesertGameContext mock yolu)
- 74 TypeScript hatası eski dosyalarda (bizim değişikliklerden değil)
- CI/CD yok

## Sıradaki Öncelikler
1. AllianceScreen parçalama
2. DesertGameContext PvP hook çıkarma
3. App.test.tsx düzeltme
4. CI/CD kurulumu
5. develop → main merge
---

## Archived Session State: 20260408_123255
<!-- STATUS -->
Epic: Battle Systems + Auth + Ticket System
Feature: Full session complete — pushed to GitHub
Task: iOS kurulumu bekliyor (Mac'te devam edilecek)
<!-- /STATUS -->

# War Nexus — Session State (2026-04-06)

## Durum: Oturum Tamamlandı — GitHub Güncel

## Aktif Branch: develop (commit 9e87cd5 — pushed ✓)

## Tamamlanan İşler — Commit 1 (e86e539)

### Persistent Wins/Losses
- [x] PersistedGameState'e wins/losses alanları
- [x] addBattleReport her çağrıda sayaç artırıyor
- [x] Tüm savaş türleri (PvE, PvP, İttifak)
- [x] Geriye uyumlu migration

### playerPower Formülü
- [x] Birim katkısı kaldırıldı (powerCalc, DesertGameContext, cloudSave, pvpHelpers)
- [x] Cloud Functions + botData güncellendi
- [x] Formül: binaPower + araştırmaPower + warPower(cap'li)

### Sefer Maliyeti
- [x] calcMarchCost() tier bazlı (T1:5/3/2 → T4:50/35/20)
- [x] PvE + PvP + İttifak savaşı maliyet kontrolü + kesinti
- [x] MapScreen, LeaderboardScreen, AllianceWarPanel maliyet gösterimi
- [x] Sefer iptali kaynak iadesi (marchCost March nesnesinde)

### Sefer Süreleri
- [x] calcTravelSeconds birim sayısına göre 3-5 dk
- [x] Tüm saldırı türleri + Cloud Functions güncellendi

### UI
- [x] Kazanma şansı sadece harita kartlarında (özet panellerden kaldırıldı)

## Tamamlanan İşler — Commit 2 (9e87cd5)

### Auth Ekranı
- [x] Beni Hatırla (AsyncStorage)
- [x] Şifremi Unuttum (Firebase sendPasswordResetEmail)
- [x] Lokalizasyon TR + EN

### Ticket Sistemi
- [x] Firestore tickets koleksiyonu + rules + indexes
- [x] Profil: Destek & Geri Bildirim (Hata/Şikayet/Öneri/İstek/Diğer)
- [x] Oyuncu: ticket gönder, geçmişi gör, yanıt yaz, sil
- [x] Admin: ticket listele, cevapla, kapat, sil
- [x] Push notification on admin reply
- [x] Okunmamış badge (N yeni)
- [x] Admin panelde oyuncu yanıtı gösterimi

### Admin Panel
- [x] UID hardcode (fDXCXZYZr1PapwTjAlsM3RZoKRn1)
- [x] App.tsx + web/index.tsx: ⚙️ çark ikonu TopBar'da
- [x] Alt alta menü layout + ← Geri navigasyonu
- [x] Sağ üst ✕ kapatma butonu
- [x] Düzenle butonu BaseScreen'den kaldırıldı

### İttifak Savaşı
- [x] 24 saat cooldown (lastWarEndedAt + declareWar kontrolü)

### Altyapı
- [x] State koruma: localStorage bina seviyesi < Firestore → Firestore kullan
- [x] Web: tüm runtime require() → static import (Google sign-in düzeltildi)
- [x] Üs ikonu 🏛️
- [x] Firestore rules + indexes deploy edildi

## Değişen Dosyalar (19 dosya)
- App.tsx, src/web/index.tsx (admin panel, imports)
- src/state/types.ts, DesertGameContext.tsx, useCombat.ts, combatResolvers.ts
- src/state/powerCalc.ts, pvpHelpers.ts
- src/services/authService.ts, cloudSave.ts, firebase.ts, allianceService.ts
- src/screens/ProfileScreen.tsx, BaseScreen.tsx, AdminScreen.tsx, AuthScreen.tsx
- src/screens/MapScreen.tsx, LeaderboardScreen.tsx, AllianceScreen.tsx
- src/components/BottomTabs.tsx, panels/AllianceWarPanel.tsx
- src/data/units.ts
- functions/index.js, functions/botData.js
- locales/tr.json, en.json
- firestore.rules, firestore.indexes.json, index.html

## Sonraki Adımlar
1. iOS kurulumu (Mac'te git pull origin develop → npm install → pod install)
2. Cloud Functions deploy (firebase deploy --only functions)
3. IAP (DUNS bekleniyor)
---

## Session End: 20260408_123255
### Uncommitted Changes
production/session-state/active.md
---

## Session End: 20260408_123403
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260408_123659
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260408_123758
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260408_123914
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260408_124654
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260409_124906
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260409_130309
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260409_130616
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260409_131839
### Uncommitted Changes
production/session-logs/session-log.md
production/session-state/active.md
---

## Session End: 20260409_132938
### Uncommitted Changes
android/app/src/main/res/raw/keep.xml
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_133341
### Uncommitted Changes
android/app/src/main/res/raw/keep.xml
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_151308
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_151840
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_151916
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_151939
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_152109
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_152353
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_152622
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_152824
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260409_211355
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_222816
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_222907
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_222930
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223048
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223120
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223315
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223345
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223627
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223826
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223910
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223932
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_223959
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224057
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224130
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224138
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224314
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224458
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224658
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_224824
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_230449
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_230527
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_230600
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_230637
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_231405
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_231750
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_231854
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_232448
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_233020
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_233203
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_233256
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_233628
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_234730
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_234847
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235023
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235056
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235152
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235221
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235309
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235342
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235423
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235516
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235552
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235629
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235741
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260410_235949
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000226
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000257
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000321
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000444
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000543
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000736
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000854
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_000913
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_001000
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_001558
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_004337
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105057
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105320
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105450
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105542
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105613
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105734
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105801
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_105952
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110036
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110135
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110221
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110319
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110518
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110649
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110741
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110821
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110856
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_110929
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_111214
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_111252
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_111423
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_111647
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_113326
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_113417
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_113958
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114047
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114109
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114145
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114213
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114304
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114400
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114443
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114524
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_114616
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_115038
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_115307
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_115902
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_115945
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_120032
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_120121
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_120243
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_120433
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_120515
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121003
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121043
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121110
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121150
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121229
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121255
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_121333
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_122502
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_123203
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_123825
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_123855
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_123952
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124025
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124108
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124203
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124329
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124358
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124448
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124538
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124658
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124836
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_124943
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_125155
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_130210
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_131009
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_133057
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_134534
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_141143
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_141512
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_141716
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_142328
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_143843
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/authService.ts
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_143900
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/authService.ts
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_144236
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/authService.ts
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_152440
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_154235
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/LeaderboardScreen.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/services/pvpService.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_160310
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/LeaderboardScreen.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/services/pushNotifications.ts
src/services/pvpService.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_162217
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/LeaderboardScreen.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/services/pushNotifications.ts
src/services/pvpService.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_162322
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/LeaderboardScreen.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/services/pushNotifications.ts
src/services/pvpService.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_163937
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/LeaderboardScreen.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/services/pushNotifications.ts
src/services/pvpService.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
src/state/useCombat.ts
---

## Session End: 20260411_164548
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/components/panels/AllianceWarPanel.tsx
src/screens/LeaderboardScreen.tsx
src/screens/ShopScreen.tsx
src/services/allianceService.ts
src/services/authService.ts
src/services/cloudSave.ts
src/services/pushNotifications.ts
src/services/pvpService.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
src/state/useCombat.ts
---

## Session End: 20260411_165219
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_165758
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_171343
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_171519
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_173131
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_173701
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_173737
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/cloudSave.ts
src/state/DesertGameContext.tsx
src/state/useAllianceState.ts
---

## Session End: 20260411_180238
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_180910
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_181059
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_182005
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_182955
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_183835
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_183937
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_190556
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_191242
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
---

## Session End: 20260411_191404
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_191519
### Uncommitted Changes
.vscode/settings.json
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_191624
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_194027
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/state/DesertGameContext.tsx
---

## Session End: 20260411_201244
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_204713
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_204949
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_205628
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_205717
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_205823
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_205847
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_205916
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_210034
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_210154
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_211950
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260411_222836
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260412_005531
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260412_010306
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/cloudSave.ts
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

## Session End: 20260415_221240
### Uncommitted Changes
.vscode/settings.json
App.tsx
android/app/build.gradle
android/app/google-services.json
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/com/warnexus/MainApplication.kt
android/app/src/main/res/raw/keep.xml
android/gradle.properties
firestore.indexes.json
functions/index.js
index.js
locales/en.json
locales/tr.json
package-lock.json
package.json
production/session-logs/agent-audit.log
production/session-logs/session-log.md
production/session-state/active.md
src/screens/ShopScreen.tsx
src/services/pushNotifications.ts
src/state/DesertGameContext.tsx
---

