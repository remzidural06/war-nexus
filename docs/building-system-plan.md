# War Nexus Building System Plan

## Kapsam

Bu proje sadece 7 ana bina ile ilerleyecek:

1. `HQ`
2. `Oil Refinery`
3. `Barracks`
4. `Research Lab`
5. `Power Plant`
6. `Ammo Factory`
7. `Hospital`

Not:

- Bu liste dışında yeni bina eklenmeyecek.
- Tüm ekonomi, savaş ve ilerleme akışları bu 7 bina üzerinden çözülecek.

## Final Roller

### 1. HQ

Görev:

- üs seviyesini temsil eder
- genel ilerleme kapısıdır
- diğer bina seviyeleri ve sistem kilitlerini kontrol eder

Oyun etkisi:

- oyuncunun genel güç seviyesini yükseltir
- bazı bina yükseltmeleri için ön koşul olur
- savunma gücüne temel katkı verir

### 2. Oil Refinery

Görev:

- `petrol` üretir

Oyun etkisi:

- yükseltmelerin ana ham maddesini sağlar
- üretim/savaş ekonomisinin yakıt tabanını oluşturur

### 3. Power Plant

Görev:

- `enerji` üretir

Oyun etkisi:

- araştırma, iyileştirme ve gelişmiş üretim süreçlerini besler
- teknoloji ve üs operasyonlarının enerji omurgasıdır

### 4. Ammo Factory

Görev:

- `mühimmat` üretir

Oyun etkisi:

- birlik eğitimi ve saldırı hazırlığı için temel kaynaktır
- askeri üretim döngüsünü destekler

### 5. Barracks

Görev:

- birlik üretir

Oyun etkisi:

- saldırı için gönderilecek aktif kuvveti oluşturur
- savunma puanına katkı verir

### 6. Research Lab

Görev:

- kalıcı bonus üretir

Oyun etkisi:

- üretim verimini artırır
- saldırı başarısını güçlendirir
- savunma ve iyileştirme verimliliğini destekler

### 7. Hospital

Görev:

- yaralı birlikleri toparlar

Oyun etkisi:

- savaş kayıplarının tamamının silinmesini engeller
- iyileştirme akışıyla birlik rezervinin geri kazanılmasını sağlar

## Binalar Arası İlişki

Temel akış:

- `Oil Refinery` petrol üretir
- `Power Plant` enerji üretir
- `Ammo Factory` mühimmat üretir
- bu kaynaklar `Barracks`, `Research Lab`, `Hospital` ve `HQ` tarafından tüketilir

İlerleme akışı:

- `HQ` yükseldikçe genel üs seviyesi ilerler
- `Research Lab` bonusları tüm sistemi daha verimli hale getirir
- `Barracks` saldırı kapasitesini büyütür
- `Hospital` kayıpların etkisini azaltır

## İlk Tam Oyun Döngüsü

1. Petrol, enerji ve mühimmat üret
2. Karargâhı ve üretim binalarını yükselt
3. Kışlada birlik eğit
4. Haritada keşif yap
5. Saldırı başlat
6. Zaferde loot al, yenilgide kayıp yaşa
7. Yaralıları hastanede toparla
8. Araştırma ile sistemi güçlendir
9. Döngüyü daha verimli şekilde tekrar et

## Balans Öncelikleri

İlk balans turunda bakılacaklar:

- petrol üretimi çok mu yavaş
- mühimmat eğitime yetiyor mu
- enerji darboğaz yaratıyor mu
- hastane çok mu güçlü veya çok mu zayıf
- araştırma bonusları hissediliyor mu
- HQ yükseltmeleri oyuncuyu doğru tempoda ileri taşıyor mu

## Sonraki Uygulama Sırası

1. `HQ` kilit açma ve ön koşul sistemini netleştir
2. üretim binalarının ekonomik dengesini oturt
3. `Barracks` üretim ve birlik tüketim akışını sıkılaştır
4. `Research Lab` bonus türlerini netleştir
5. `Hospital` iyileştirme kapasitesi ve süre dengesini kur
6. bu 7 bina üzerinden tam oynanış döngüsünü test et

## Ürün Kuralı

- yeni bina eklenmeyecek
- çözüm mevcut bina seti içinde üretilecek
- ihtiyaç çıkarsa yeni bina değil, mevcut bina fonksiyonu derinleştirilecek
