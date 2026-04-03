# War Nexus Terrain Brief

## Amaç

Bu brief, `War Nexus` ana üs ekranı için üretilecek terrain/zemin görselini tanımlar.
Amaç, bina asset'lerinin üstüne yerleşeceği, mobilde okunaklı ve premium görünen bir üs sahnesi üretmektir.

Bu görsel tek başına da bir askeri üs hissi vermeli, ancak bina sprite'ları yerleştiğinde karmaşıklaşmamalıdır.

## Ekran ve Kamera

- platform: dikey mobil ekran
- kamera: `2.5D high-angle`
- perspektif: tam izometrik değil
- his: üstten komuta bakışı
- tüm terrain detayları mevcut bina asset'leriyle aynı perspektife uyumlu olmalı

## Görsel Yön

- modern askeri üs
- gerçekçi ama stilize
- premium mobil strateji hissi
- net kütle ayrımı
- bina yerleşimini destekleyen temiz kompozisyon

Referans his:

- güçlü komuta merkezi
- yaşayan üs yerleşkesi
- sağ tarafta daha sanayi ağırlığı
- sol tarafta daha askeri/kamp ağırlığı
- merkezde HQ odaklı komuta bölgesi

## İstemediğimiz Görünüm

- düz pastel blok hissi
- çizgi film görünümü
- aşırı kirli ve okunaksız detay
- browser oyunu karmaşası
- bina yerleşim alanlarını belirsizleştiren fazla obje

## Teknik Ölçü

- çalışma kanvası: `1600 x 2200 px`
- çıktı formatı: `PNG`
- renk profili: `sRGB`
- ilk teslim dosyası: `base_scene.png`
- yazı/logo/UI elemanı gömülmemeli

## Güvenli Alan

Mobil UI nedeniyle kritik görsel alan orta bölgede toplanmalı.

- üst güvenli boşluk: `220 px`
- alt güvenli boşluk: `260 px`
- sol güvenli boşluk: `120 px`
- sağ güvenli boşluk: `120 px`

Ana bina yerleşim alanları yaklaşık olarak kanvasın orta `%65` kısmında yoğunlaşmalı.

## Kompozisyon

Terrain şu 7 ana bölge hissini taşımalı:

1. `Top zone`
- hafif daha açık tonlu üst plato
- boşluk hissi
- runway/access hattı için alan

2. `Runway / access strip`
- sol üstten merkeze doğru inen bir erişim hattı
- pist veya askeri servis yolu gibi okunmalı
- HQ odak noktasını bastırmamalı

3. `Command zone`
- merkeze yakın ana komuta alanı
- HQ burada yerleşecek
- zeminde sert zemin/plaza/apron hissi olmalı

4. `Industrial zone`
- sağ orta ve sağ alt ağırlıklı
- rafineri ve mühimmat tesisi burada yerleşecek
- daha ağır, daha kirli, daha endüstriyel tonlar kullanılmalı

5. `Military zone`
- sol alt ve alt orta
- barracks burada yerleşecek
- kamp/eğitim/araç hareketi hissi olabilir

6. `Tech / power zone`
- üst sağ veya orta sağ
- research lab ve power plant için daha temiz teknik zemin

7. `Lower foreground`
- alt bölgede hafif sıcak tonlu ön plan
- çok koyu olmamalı
- alt tab bar ile çakışmamalı

## Bina Yerleşim Pad'leri

Terrain içinde bina yerleşim alanları hafif okunmalı, ancak oyun tahtası slotu gibi görünmemeli.

Önerilen yaklaşık pad alanları:

- `HQ pad`: `420 x 300 px`
- `Oil Refinery pad`: `360 x 250 px`
- `Ammo Factory pad`: `340 x 240 px`
- `Research Lab pad`: `300 x 220 px`
- `Power Plant pad`: `300 x 220 px`
- `Barracks pad`: `300 x 220 px`

Bu pad'ler:

- çok sert dikdörtgen olmamalı
- beton, sıkışmış toprak, apron veya sert zemin hissi taşımalı
- bina yokken de doğal görünmeli

## Önerilen Yerleşim

- `HQ`: merkez-altın biraz üstü
- `Research Lab`: sağ üst
- `Power Plant`: sol üst-orta
- `Oil Refinery`: sağ orta
- `Ammo Factory`: sağ alt-orta
- `Barracks`: sol alt-orta

Bu düzen sayesinde:

- merkezde HQ odak oluşur
- sağ taraf sanayi bölgesi gibi okunur
- sol taraf daha askeri/kamp gibi görünür

## Renk Dili

- ana zemin: sıcak kum / kuru toprak / taş
- command zone: gri-bej sert zemin
- industrial zone: daha koyu kahve-gri
- military zone: toprak + kamp dokusu
- tech zone: daha temiz gri, çok hafif cyan yansıma kabul edilir

Kaçınılmalı:

- çok parlak sarı
- pastel oyuncak görünümü
- aşırı sert ve yapay gradient

## Detay Seviyesi

Olmalı:

- yollar
- lastik izleri
- beton plakalar
- hafif yükseklik farkları
- küçük konteyner alanı izleri
- boru hattı veya servis hattı ipuçları
- güvenlik çiti/giriş hattı hissi
- hafif servis ekipmanı alanları

Olmamalı:

- okunmayacak kadar küçük mikro detay
- bina pad'lerini karıştıran fazla obje
- HUD ile yarışan kontrastlı dekor

## Katman Önerisi

Mümkünse tasarım şu katman mantığıyla hazırlanmalı:

- `base_scene_bg.png`
- `base_scene_mid.png`
- `base_scene_fg.png`

Açıklama:

- `bg`: genel arazi, üst plato, büyük ton alanları
- `mid`: yollar, pad'ler, command/industry/military ayrımı
- `fg`: hafif ön plan tozu, kenar detayları, atmosfer katmanı

İlk sürüm için tek dosya da kabul edilir:

- `base_scene.png`

## Kabul Kriteri

Terrain başarılı sayılırsa:

- bina yerleştirilmeden de üs hissi veriyorsa
- HQ bölgesi doğal odak oluşturuyorsa
- sağ sanayi / sol askeri ayrımı okunuyorsa
- bina asset'leri üstüne gelince kaybolmuyorsa
- mobilde küçülünce çamurlaşmıyorsa
