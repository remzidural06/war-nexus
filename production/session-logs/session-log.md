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

