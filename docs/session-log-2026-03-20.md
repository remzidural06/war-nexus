# War Nexus Session Log - 2026-03-20

## Ozet

Bu oturumda `War Nexus` ana us ekrani icin:

- terrain sahnesi projeye baglandi
- bina yerlesimleri uzun bir polish surecinden gecirildi
- HQ / sanayi / askeri dagilim yeniden duzenlendi
- bina secim etiketleri ve gereksiz highlight'lar kaldirildi
- TR / EN dil destegi temizlendi
- base ekrani sadece mock gorunum olmaktan cikartilip calisan bir oyun iskeletine cevrildi
- canli kaynak, collect, upgrade, train ve research akislarinin ilk surumu eklendi
- HQ `T3` asset hizalamasi `T1` ile daha uyumlu hale getirildi

## Bugun Yapilanlar

### 1. Terrain ve Gorunur Base Sahnesi

- Terrain PNG projeye baglandi ve base arka planina yerlestirildi.
- Ana HQ bina yerlesimi merkezi beton alana oturtuldu.
- HQ daha buyuk yapildi ve daha sonra kullanici geri bildirimine gore yukari / sola / asagi mikro ayarlar yapildi.
- `Power Plant`, `Barracks`, `Research Lab`, `Oil Refinery`, `Ammo Factory` birden fazla turda yeniden konumlandirildi.
- Sag tarafin daha sanayi, sol tarafin daha askeri okunmasi icin yerlesim yeniden dengelendi.

### 2. Bina Secim Davranislari

- Binalarin isim ve level etiketleri surekli gorunur olmaktan cikarildi.
- Sadece secim aninda bilgi gosteren sade bir akis kuruldu.
- Bina seciminde cikan siyah dikdortgen / alt etiket / gereksiz highlight kaldirildi.
- Secim bilgisi detay kartina tasindi.

### 3. Bina Asset ve PNG Temizlikleri

- Tum bina PNG’lerinde beyaz halo / beyaz cerceve sorunu icin birden fazla temizlik turu denendi.
- Birden fazla kez orijinal asset’ler masaustundeki kaynak klasorden geri alindi.
- HQ radar bozulmasi tespit edilip HQ asset’leri ayri restore edildi.
- `hq_t3.png` kaynak dosyadan tekrar tekrar geri alindi ve hash ile dogrulandi.
- Son durumda genel halo problemi kismen azaltildi ama tum asset setinde hala ileride tek tek duzeltilebilecek ince hatalar var.

### 4. Tier ve Render Hizalama

- Tier’lar degistikce binalarin ekrandaki footprint boyutunun degismemesi saglandi.
- Yani `T1 / T2 / T3` arasinda sahnedeki genel boyut sabitlendi.
- `HQ T3` asset’inin `T1` ile ayni arazide oturmuyormus gibi gorunmesinin sebebinin PNG canvas farki oldugu tespit edildi.
- `BuildingAssetVisual.tsx` icinde sadece `HQ T3` icin ozel hizalama eklendi.
- Son geri bildirimle `T3`, `T1` konumuna daha uyumlu hale getirildi.

### 5. Base Gameplay Iskeleti

- Ortak bir base state katmani eklendi:
  - `src/state/BaseGameContext.tsx`
- `TopBar` ve `BaseScreen` mock veriden ayrilip bu ortak state’e baglandi.
- Kaynaklar canli state’ten beslenmeye basladi.
- Uretim binalari zamanla doluyor hale getirildi.
- `Collect` aksiyonu gercekten kaynak ekliyor.
- `Upgrade` aksiyonu gercekten kaynak dusurup sure baslatiyor.
- Sure bitince bina level / tier ilerliyor.

### 6. Bina Bazli Aksiyonlar

- `Barracks`
  - `Train` aksiyonu eklendi
  - kaynak tuketiyor
  - sure calistiriyor
  - sure bitince birlik sayisini artiriyor
  - sonra collect benzeri cikti kullanimi yapiliyor
- `Research Lab`
  - `Research` aksiyonu eklendi
  - kaynak tuketiyor
  - sure calistiriyor
  - sure bitince research bonusunu artiriyor

### 7. Dil Destegi

- TR / EN anahtarlar temizlendi.
- Base ekraninda, top bar’da ve ittifak ekraninda gorunen metinler duzeltildi.
- Bozuk encoding karakterleri temizlendi.

## Degisen Ana Dosyalar

- [App.tsx](/c:/Users/User/WarStrike/mobiloyun/App.tsx)
- [BaseScreen.tsx](/c:/Users/User/WarStrike/mobiloyun/src/screens/BaseScreen.tsx)
- [TopBar.tsx](/c:/Users/User/WarStrike/mobiloyun/src/components/TopBar.tsx)
- [ActionButton.tsx](/c:/Users/User/WarStrike/mobiloyun/src/components/ActionButton.tsx)
- [mockBase.ts](/c:/Users/User/WarStrike/mobiloyun/src/data/mockBase.ts)
- [BaseGameContext.tsx](/c:/Users/User/WarStrike/mobiloyun/src/state/BaseGameContext.tsx)
- [BuildingAssetVisual.tsx](/c:/Users/User/WarStrike/mobiloyun/src/assets/base/components/BuildingAssetVisual.tsx)
- [en.json](/c:/Users/User/WarStrike/mobiloyun/locales/en.json)
- [tr.json](/c:/Users/User/WarStrike/mobiloyun/locales/tr.json)
- [hq_t3.png](/c:/Users/User/WarStrike/mobiloyun/src/assets/base/buildings/hq_t3.png)

## Su Anki Durum

- Base sahnesi kullanilabilir ve okunur durumda.
- HQ yerlesimi ve `T3` hizalamasi kabul edilebilir seviyeye geldi.
- Bina etkileşimleri artik sadece dekoratif degil; temel oyun mantigi calisiyor.
- Kaynak / upgrade / train / research sisteminin ilk oynanabilir iskeleti var.
- Asset beyaz kenar sorunu tamamen bitmis degil; ileri turda bina bina cerrahi temizlenebilir.

## Yarin Yapilacaklar

### Oncelik 1

- Base state’i kalici hale getir
- `AsyncStorage` veya benzeri kalici kayit sistemi ekle
- Oyundan cik-gir yapinca:
  - kaynaklar
  - bina level’lari
  - aktif sureler
  - train / research durumlari
  korunuyor mu kontrol et

### Oncelik 2

- `Barracks`, `Research Lab`, `HQ` icin daha net detay karti aksiyonlari ekle
- bina seciliyken:
  - maliyet
  - kalan sure
  - beklenen odul / bonus
  - durum metni
  daha acik gorunsun

### Oncelik 3

- Asset beyaz halo temizligini toplu degil tek tek yap
- once problemli olanlar:
  - HQ disindaki bina kenarlari
  - sanayi binalari
  - research lab kenarlari

### Oncelik 4

- Economy balans ilk tur
- kaynak artislari ve upgrade maliyetleri gozden gecir
- oyuncu ilk 5 dakikada:
  - cok hizli mi ilerliyor
  - cok yavas mi kaliyor
  bak

### Oncelik 5

- Harita / battle skeleton sonraki buyuk asama olarak planla
- base ekranindan map’e giden ilk oynanis dongusu hazirla

## Yarin Icin Kisa Hatirlatma

Yarin oturuma baslarken su cumleyi kullan:

`Dun biraktigimiz yerden devam edelim. docs/session-log-2026-03-20.md dosyasindaki yarin yapilacaklar listesinden Oncelik 1 ile basla.`

## Not

Ben kendiligimden yarin otomatik hatirlatma gonderemem. Ama bu dosya hazir; yarin bana sadece:

`session logdan devam et`

yazman yeterli olur.

## Ek Not - Sabit Bina Kapsami

- Bina roster'i artik sabit: `HQ`, `Oil Refinery`, `Barracks`, `Research Lab`, `Power Plant`, `Ammo Factory`, `Hospital`.
- Bundan sonraki planlama yeni bina eklemeye degil, mevcut 7 binanin polish / balans / mekanik derinligine odaklanacak.
- `Warehouse / Depo` veya baska ek yapilar yeni roadmap maddesi olarak ele alinmayacak.
- Tum sistem tasarimi mevcut 7 ana bina uzerinden ilerletilecek.

## Ek Not - Final Bina Rol Plani

- 7 binanin final rol dagilimi ve ilk tam oyun dongusu su dosyada sabitlendi:
  - [building-system-plan.md](/c:/Users/User/WarStrike/mobiloyun/docs/building-system-plan.md)

## 2026-03-21 Guncellemesi

### Bugun Netlesen Kararlar

- Proje sadece su 7 bina ile devam edecek:
  - `HQ`
  - `Oil Refinery`
  - `Barracks`
  - `Research Lab`
  - `Power Plant`
  - `Ammo Factory`
  - `Hospital`
- Bu 7 bina disinda yeni bina eklenmeyecek.
- `Research Lab` dogrudan arac ureten bina olmayacak.
- `Research Lab`, ileride `tank`, `ucak`, `helikopter`, `dron` gibi savas platformlarini acan veya guclendiren arastirmalarin merkezi olacak.

### Bugun Yapilan Teknik Isler

#### 1. Emulator ve Uygulama Akisi

- Emulator yeniden acildi.
- Uygulama `com.warnexus/.MainActivity` olarak tekrar tekrar kontrol edilip calistirildi.
- Bundle / hot reload kaynakli gorunen acilis problemleri temiz acilisla toparlandi.

#### 2. HQ Tabanli Ilerleme Sistemi

- `HQ`, diger binalar icin gercek ilerleme kapisi haline getirildi.
- HQ disindaki bina upgrade'leri icin `KH seviyesi` on kosulu eklendi.
- Aksiyon kilitleri de HQ seviyesine baglandi:
  - `Barracks Train` icin minimum `KH 2`
  - `Hospital Heal` icin minimum `KH 2`
  - `Research Lab Research` icin minimum `KH 3`
- Kilitliyse kullaniciya kisa durum metni gosteriliyor.

#### 3. Ekonomi Balans - 1. Tur

- Petrol, enerji ve muhimmat uretim oranlari artirildi.
- Uretim binalarinin depolama kapasitesi buyutuldu.
- Upgrade maliyet egimi daha kontrollu hale getirildi.
- `Barracks`, `Research Lab` ve `Hospital` ilk turda biraz daha erisilebilir yapildi.
- Sureler ve maliyetler erken oyunda tikama yapmayacak sekilde yumusatildi.

#### 4. Birlik / Arastirma / Iyilestirme Balansi - 2. Tur

- `Barracks` daha verimli birlik uretir hale getirildi.
- `Hospital` daha hizli ve daha guclu toparlama yapar hale getirildi.
- `Research Lab` bonusu sadece soyut bir arti olmaktan cikarildi.
- Arastirma bonusu artik:
  - kisladaki birlik verimini
  - hastanedeki iyilesme verimini
  dogrudan etkiliyor.

#### 5. Savas Balansi - 2. Tur

- Saldiri zaferinde gelen loot hedef riskine gore olceklenir hale getirildi.
- Saldiri kayiplari yumusatildi.
- Savunma baskinlarinda kayip ve kaynak cezalari daha dengeli hale getirildi.
- Yaraliya donusen birlik orani artik:
  - hedef riskine
  - zafer / yenilgi sonucuna
  - arastirma bonusuna
  gore daha akilli hesaplanıyor.

#### 6. Gorsel ve Sahne Durumu

- Bina detail karti sahneden kaldirildi.
- Secili bina altindaki kutu / taban vurgusu kaldirildi.
- Yapisal sahne overlay'lerinin buyuk kismi temizlendi.
- Son durumda sahne sade ve daha temiz.
- Arka plan terrain, asfalt pad'li desert sahne ile devam ediyor.
- Bina konumlari ve boyutlari pad yerlestirmesine gore mikro ayarlarla tek tek oturtuldu.

### Su Anki Teknik Durum

- `BaseGameContext.tsx` oyun mantiginin ana omurgasi olarak calisiyor.
- Kalici save/load akisi mevcut.
- 7 bina icin temel oynanis dongusu calisiyor:
  - kaynak uret
  - topla
  - yukselt
  - birlik egit
  - arastirma yap
  - saldiri / kesif yap
  - yarali toparla
- `Research Lab` su an teknoloji bonus merkezi olarak davranmaya basladi.
- `Hospital` su an yarali birliklerin geri kazanimi icin aktif rol oynuyor.
- `Barracks` saldiri ve savunma gucune dogrudan etki ediyor.

### Bundan Sonra Yeni Bina Yapilmayacak

- `Warehouse`, `Radar`, `Turret`, `Alliance Center` gibi once dusunulen ek yapilar roadmap'ten cikarildi.
- Ihtiyac cikarsa cozum yeni bina ekleyerek degil, mevcut 7 binanin fonksiyonlarini derinlestirerek uretilecek.

### Sıradaki Is

Bir sonraki net asama:

- `Research Lab` icin gercek bir `arastirma agaci` tasarlamak ve sisteme baglamak

Bu agac su mantikla ilerleyecek:

- `tank`
- `ucak`
- `helikopter`
- `dron`
- `hedefleme`
- `zirh`
- `muhimmat`
- `motor / operasyon`

Arastirma sonuclari yeni bina acmayacak; mevcut savas sistemini guclendirecek.

### Sıradaki Uygulama Plani

1. `Research Lab` icin ilk arastirma agaci taslagini yaz
2. Arastirmalari 3 gruba ayir:
   - kara
   - hava
   - destek / savunma
3. Her arastirmaya net oyun etkisi ver:
   - saldiri sansi
   - kayip azalmasi
   - loot verimi
   - savunma tutus gucu
   - iyilesme verimi
4. Bu agaci mevcut `BaseGameContext` icine yeni bina eklemeden bagla

### Sonraki Oturumda Baslangic Komutu

Sonraki oturumda su komutla devam et:

`session logdan devam et, research lab arastirma agacini baslatalim`

---

## Ek Oturum Notlari - 2026-03-21

### 1. Arastirma Laboratuvari Yeniden Tasarlandi

- `Research Lab` ekranı sadeleştirildi ve sadece araştırma odaklı hale getirildi.
- Sekmeli bir teknoloji yapısı kuruldu:
  - `Birimler`
  - `Kara`
  - `Hava`
  - `Deniz`
  - `Savunma`
- Hava / kara / deniz / savunma platformları doğrudan birbirine zincirlenmek yerine kendi temel şart araştırmalarına bağlandı.
- Oyuncu artık platform kartına basınca o birim için gereken araştırmaları ayrı görünümde görüyor.
- Aynı anda yalnızca tek araştırma yürüyebiliyor.
- Araştırma maliyetlerinden `enerji` tamamen çıkarıldı; sadece:
  - `petrol`
  - `mühimmat`
  - `nakit`
  kullanılıyor.

### 2. Hastane Kaldirildi, Yerine Banka Eklendi

- `Hospital` oyun akışından tamamen çıkarıldı.
- Eski hastane noktasına `Banka` yerleştirildi.
- Banka sistemi eklendi:
  - oyuncu nakit yatırabiliyor
  - `10 dakika` vadeli bekliyor
  - süre sonunda faizli geri alıyor
- Hastaneye ait aktif kod ve asset referansları temizlendi.

### 3. Gokdelenler Ekonomi Sistemi Eklendi

- Yeni bina olarak `Gökdelenler` eklendi.
- Oyuncu para karşılığında yeni gökdelen inşa edebiliyor.
- Gökdelen sayısı arttıkça `10 dakikalık kira` geliri yükseliyor.
- Gökdelenler için toplu inşa akışı kuruldu:
  - sayı girme
  - `- / +`
  - `maks`
  - sürgü ile miktar seçme
- Saldırı zaferlerinde ek `emlak ganimeti` nakit bonusu sisteme bağlandı.

### 4. Ana Us Sahnesi Tek Arka Plan + Hotspot Yapısına Cevrildi

- Ana ekrandaki ayrı bina sprite'ları kaldırıldı.
- Sahne artık tek arka plan görseli üstünde çalışan hotspot sistemiyle ilerliyor.
- Oyuncu görselin içindeki ilgili bölgeye basınca bina aktif oluyor.
- Farklı `base_scane` görselleriyle birden fazla kez güncelleme yapıldı.
- Terrain kaynağı güncel olarak:
  - `src/assets/base/terrain/base_scane.png`
  dosyasına bağlı.

### 5. Yerlesim Duzenleme Gelistirildi

- `Yerleşimi Düzenle / Kilitle / Sıfırla` akışı tekrar aktif edildi.
- Binalar sürüklenebilir hale getirildi ve konumları otomatik kaydoluyor.
- Hotspot kare boyutu önce tek oranla büyütülüp küçültülebilir hale getirildi.
- Daha sonra bu sistem iki eksene ayrıldı:
  - `Yatay`
  - `Dikey`
- Oyuncu artık seçili hotspot alanını yana ve yukarı/aşağı ayrı ayrı genişletebiliyor.

### 6. Kaynak ve Bina Sistemi Temizlendi

- `Enerji Santrali` uygulamadan çıkarıldı.
- `Enerji` ana kaynak akışından ve görünür üst bardan kaldırıldı.
- `Depo` uygulamadan çıkarıldı.
- Sağ üstteki `KH / Kademe` kısa bilgi alanı kaldırıldı.
- Sol alttaki küçük bina bilgi kartı daha minimal hale getirildi.

### 7. Dil ve Arayuz Temizlikleri

- Türkçe bozuk karakter sorunları temizlendi.
- Araştırma kartları ve sekme yazıları mobilde daha okunur hale getirildi.
- Gereksiz üst paneller, bağlantı ikonları ve tekrar eden bilgi kutuları kaldırıldı.

### 8. Kayit / Snapshot

- Proje klasörü git deposu olmadığı için commit alınamadı.
- Bunun yerine temiz bir yerel snapshot oluşturuldu:
  - [war-nexus_clean_snapshot_2026-03-21_22-45-58](/c:/Users/User/WarStrike/mobiloyun/snapshots/war-nexus_clean_snapshot_2026-03-21_22-45-58)

### Su Anki Durum

- Base sahnesi tek görselli hotspot sistemiyle çalışıyor.
- Araştırma laboratuvarı artık gerçek kategori ve platform araştırmaları içeriyor.
- Banka ve gökdelenler ekonomik akışa bağlandı.
- Hastane, enerji santrali ve depo oyundan çıkarıldı.
- Yerleşim düzenleme modu aktif ve hotspot alanları yatay/dikey ayrı ayarlanabiliyor.

### Sonraki Mantikli Adimlar

1. Yeni `base_scane` görseline göre tüm hotspotları tek tek hassas hizalamak
2. Banka faiz ekranını ve kira/tahsil sayaçlarını daha görsel hale getirmek
3. İstenirse projeyi git deposuna çevirip bundan sonra commit bazlı ilerlemek

---

## Ek Oturum Notlari - 2026-03-22

### 1. Ekonomi Bina Ailesi Yeniden Kuruldu

- `Evler`, `Gokdelenler`, `Petrol Rafinerisi` ortak ekonomi bina mantigina oturtuldu.
- Daha sonra `Muhimmat Fabrikasi` da bu aileye dahil edildi.
- Son durumda ekonomi binalari:
  - `Evler` -> `Nakit`
  - `Gokdelenler` -> `Nakit`
  - `Petrol Rafinerisi` -> `Petrol`
  - `Muhimmat Fabrikasi` -> `Muhimmat`
  uretiyor.

### 2. Otomatik Tahsil ve Vade Akisi Tamamlandi

- Ekonomi binalarinda manuel `Tahsil Et` akisi kaldirildi.
- Uretimler artik otomatik olarak ana hesaba isleniyor.
- `Banka` faizi de vade sonunda otomatik nakde donusuyor.
- Bu sayede ekonomi binalari tek tek tahsil edilen yapilar olmaktan cikti; zaman bazli otomatik gelir sistemine donustu.

### 3. Ekonomi Binalari Icin Ortak Upgrade Sistemi Eklendi

- Ekonomi binalari icin ustteki mavi `Yukselt` kutusu dinamik hale getirildi.
- Normal durumda:
  - `Yukselt`
  - `Gerekli: ...`
- Yukseltme sirasinda:
  - `Insaat Bitis Suresi`
  - `MM:SS`
- Maksimum seviyede:
  - `Maksimum Seviye`
  - `Seviye 50 tamamlandi`
- `Evler`, `Gokdelenler`, `Petrol Rafinerisi` ve `Muhimmat Fabrikasi` icin maksimum seviye `50` olarak sabitlendi.
- Bu binalarda her yeni seviye bir oncekinden daha uzun surede tamamlanacak sekilde sure egrisi baglandi.

### 4. Enerji Oyundan Tamamen Temizlendi

- `Enerji` kaynak tipi tamamen oyundan cikarildi.
- Eski save verilerinden gelen `power` alanlari hydrate sirasinda sanitize edilmeye baslandi.
- Upgrade / train / research maliyetlerinden enerji tamamen temizlendi.
- `Enerji Santrali / powerPlant` aktif asset ve oyun akisi tarafindan da sistemden cikartildi.
- Kalan `power` kelimeleri sadece `Guc Skoru` veya ittifak uye gucu anlaminda kullanilmaya devam ediyor.

### 5. Ekonomi Bina Ekranlari Sadelestirildi

- `Evler`, `Gokdelenler`, `Petrol Rafinerisi` ve son olarak `Muhimmat Fabrikasi` seciliyken:
  - `Savunma Hazirligi`
  - `Baslangic Hatti`
  - `Us Ozeti`
  - `Rapor Destesi`
  gizleniyor.
- Bu binalarda gereksiz ust metrik kartlari kaldirildi:
  - `Savas Ganimeti`
  - `Sonraki Insa`
- `Ilerleme Durumu` progress alani da ekonomi binalarindan kaldirildi.
- Tekrarlanan `Otomatik tahsil` sure metni de metrik kartlardan alindi; sadece ana sayac korundu.

### 6. Toplu Insa Akisi Iyilestirildi

- Ekonomi binalarinda `Toplu Insa` artik varsayilan olarak `0` ile basliyor.
- `+` ile arttirilabiliyor, slider `0 -> max` araliginda calisiyor.
- `0` seciliyken insa aksiyonu pasif kalacak sekilde duzenlendi.
- `Maks` butonu ve miktar girisi ekonomi binalari icin ortak akisa baglandi.

### 7. Ekonomi Binalari Icin Sayac Akisi Duzeltildi

- Kalan sure hesabi daha akici hale getirildi.
- Erken yuvarlama kaynakli `5'er 5'er` dusen sayac davranisi temizlendi.
- Ekonomi binalarinin kalan sureleri artik saniye bazli ve daha dogru hesaplanan bir mantikla ilerliyor.

### 8. Arayuz Metinleri ve Chip Temizligi

- Tesis detaylarindaki `Hazir` chip'i kaldirildi.
- `Kademe I / II / III` metinleri:
  - `Seviye 1`
  - `Seviye 2`
  - `Seviye 3`
  olarak guncellendi.
- Ekonomi binalarinda upgrade maliyeti ayni mavi kutunun icine alindi.

### 9. Muhimmat Fabrikasi Ekonomi Sistemine Alindi

- `Muhimmat Fabrikasi`, askeri rota panelinden ayrilip ekonomi bina mantigina alindi.
- Toplu insa, otomatik gelir, upgrade kutusu, max level 50 ve sade ekran duzeni bu bina icin de aktif hale geldi.
- Saldiri ganimetleri tarafina da `muhimmat fabrika ganimeti` katkisi baglandi.

### Su Anki Durum

- Ekonomi bina ailesi artik 4 yapidan olusuyor:
  - `Evler`
  - `Gokdelenler`
  - `Petrol Rafinerisi`
  - `Muhimmat Fabrikasi`
- Bu 4 bina ortak mantikla calisiyor:
  - otomatik gelir
  - toplu insa
  - max level 50
  - artan upgrade suresi
  - sade detay ekrani
- `Banka` ayri bir ekonomik arac olarak faiz / vade mantigiyla calismaya devam ediyor.

### Yarin Yapilacaklar

- Yeni bina olarak `Havaalani` eklenecek
- Yeni bina olarak `Gemi Tersanesi` eklenecek
- Bu iki bina icin:
  - sahnedeki hotspot konumlari
  - detay ekranlari
  - bina rolleri
  - ekonomi / askeri / uretim mantiklari
  netlestirilecek

### Sonraki Oturumda Baslangic Komutu

Sonraki oturumda su komutla devam et:

`session logdan devam edelim, havaalani ve gemi tersanesi binalarini kuralim`
