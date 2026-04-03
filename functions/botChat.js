/**
 * Bot Chat — Genel sohbette doğal görünen bot mesajları.
 * Soru-cevap akışı, ittifak arama, birim/bina yorumları.
 * ~450+ mesaj havuzu.
 */

// ── Soru mesajları (cevap bekleyen) ──────────────────────────
const QUESTIONS_TR = [
  // Birim soruları
  "hangi birimi önce üretmeli bilen var mı",
  "tank mı kasayım yoksa hava mı",
  "savunma birimi mantıklı mı üretmek",
  "en güçlü kara birimi hangisi",
  "bomber üretmeye değer mi",
  "f-22 mi kaan mı daha iyi",
  "deniz birimi gerekli mi bu oyunda",
  "denizaltı üretmeli miyim",
  "t-14 armata iyi mi bilen",
  "leopard mı abrams mı",
  "hava savunma şart mı",
  "ilk ne üretmeliyim acil taktik verin",
  "helikopter mi iha mı daha iyi",
  "piyade üretmek mantıklı mı sonradan",
  "en iyi deniz birimi hangisi",
  "stinger mı patriot mu üretmeliyim",
  "uçak gemisi üretmeye değer mi",
  "akıncı mı tb3 mü",
  "kaç birim üretmeli minimum",
  "artilleri mantıklı mı himars var",
  "keskin nişancı iyi mi",
  "özel kuvvetler en güçlüsü mü",
  "s-500 mü thaad mı savunmada",
  "su-57 nasıl bilen var mı",
  "gripen mi typhoon mu",
  "merkava iyi tank mı",
  "k2 panther kullanan var mı",
  "kobra mı kirpi mi ilk başta",
  "bradley iyi mi puma mı",
  "b-21 raider üretmeye değer mi son birim",
  // Bina soruları
  "hq kaçta havalimanı açılıyo",
  "kışla mı fabrika mı yükseltmeliyim ilk",
  "bina yükseltme sırası nasıl olmalı",
  "hq 15ten sonra ne değişiyo",
  "tersane kaçta açılıyo",
  "araştırma lab kaça yükseltmeli",
  "banka ne işe yarıyo tam",
  "gökdelen yükseltmek mantıklı mı",
  "petrol rafinerisi mi cevher madeni mi önce",
  "hq 20 olan var mı ne kadar sürdü",
  "bina yükseltme çok pahalı oldu ne yapmalı",
  "mühimmat fabrikası gerekli mi",
  "hangi binayı son yükseltmeli",
  // Kaynak soruları
  "petrol bitmek bilmiyo ya ne yapmalı",
  "altın en hızlı nasıl kasılır",
  "cevher ne işe yarıyo tam anlamadım",
  "kaynak nasıl korunur saldırıda",
  "nakit mi petrol mü daha önemli",
  "altın nereye harcamalı önce",
  "kaynaklar çok çabuk bitiyo önerisi olan",
  "görevlerden ne kadar altın geliyo",
  "mağazadan ne almalı önce",
  "vip paket alan var mı değer mi",
  "kaynak kapasitesi nasıl artıyo",
  "hızlandırma altınla mı yapılıyo",
  // Savaş soruları
  "savaşta kaynak kaybı çok olmuyomu",
  "pvp de birlik nasıl seçiyoz en iyisini",
  "saldırıda kaç birlik götürmeli",
  "kalkan almak mantıklı mı",
  "ittifak savaşı nasıl kazanılır taktik var mı",
  "güç puanı nasıl artıyo hızlı",
  "nasıl hızlı güçlenilir tips",
  "kaybedince ne kadar kaynak gidiyo",
  "saldırı mı savunma mı önce kasmalı",
  "pvp cooldown kaç saat",
  "intikam saldırısı var mı",
  "sıralamada nasıl yükselilir",
  "savaş gücü formülü nasıl",
  "kaybedince birimler gidiyo mu",
  "birlik oluşturmak niye önemli",
  "savunmada hangi birimler katılıyo",
  "hava savunma saldırıda da gidiyo mu",
  // Araştırma soruları
  "araştırma ne kadar önemli",
  "hangi araştırma dalı önce",
  "t4 araştırma ne veriyo",
  "kara araştırması mı hava mı",
  "araştırma sırası ne olmalı",
  "deniz araştırması gerekli mi",
  "savunma araştırması şart mı",
  // Genel
  "yeni başladım ne yapmalıyım",
  "oyunda en önemli şey ne",
  "bu oyunu kaç kişi oynuyo",
  "günde kaç saat oynamalı",
  "en hızlı büyüme stratejisi ne",
  "f2p olarak güçlü olunabilir mi",
  "en büyük hata ne yapılmamalı",
  "ne zaman pvp ye başlamalı",
];

const QUESTIONS_EN = [
  "which unit should I build first",
  "is air defense worth it",
  "whats the best tank in the game",
  "how do you win alliance wars",
  "any tips for beginners",
  "f-35 or f-22 which one",
  "how to get gold fast",
  "is navy important or skip",
  "best strategy for pvp attacks",
  "what level unlocks airport",
  "should i build bombers",
  "best air defense unit",
  "how to protect resources",
  "whats the power formula",
  "how many units should i have",
  "infantry or armor first",
  "is research important early game",
  "what does ore do exactly",
  "best building upgrade order",
  "when should i start pvp",
  "how does shield work",
  "t-14 armata vs m1 abrams",
  "is submarine worth building",
  "aircraft carrier or destroyer",
  "best f2p strategy",
  "how to join a good alliance",
  "kaan vs f-22 which better",
  "how to increase power fast",
  "what happens when you lose a battle",
  "do defense units attack in pvp",
];

// ── Cevap mesajları (soruya yanıt) ──────────────────────────
const ANSWERS_TR = [
  // Birim cevapları
  "kara birimi bas ilk önce mantıklı",
  "hava savunma şart bence kesin üret",
  "tank kas ağır vuruyolar",
  "f-22 bence en iyisi",
  "altay da fena değil aslında",
  "bomber end game ama çok güçlü",
  "deniz birimi end game işi acele etme",
  "ben hava kastım efsane oluyo",
  "piyade bas ilk başta ucuz ve etkili",
  "helikopter çok iyi erken oyunda",
  "akıncı üret kesinlikle değer",
  "patriot al sonra thaad geç",
  "abrams en dengeli tank bence",
  "leo 2a7 savunması çok iyi",
  "t-14 en güçlü tank ama geç açılıyo",
  "tb2 bas ilk iha olarak mantıklı",
  "özel kuvvetler pahalı ama çok güçlü",
  "stinger ucuz ama işe yarıyo başta",
  "uçak gemisi end game çok güçlü",
  "denizaltı gizli silah gibi bişey",
  "himars artilleri en iyisi",
  "bradley çok iyi ifv",
  "b-2 spirit bomber efsane hasar yapıyo",
  "s-500 en iyi hava savunma bence",
  "kaan f-22 kadar iyi neredeyse",
  "her daldan biraz üret dengeli ol",
  "savunma birimi savunmada çok işe yarıyo",
  "hava birimi üret saldırıda avantajlı",
  "çeşitlilik önemli tek tip kasma",
  "ilk 50 birimden sonra rahatla",
  // Bina cevapları
  "hq yükselt ilk her zaman",
  "kışla kas birim çeşitliliği önemli",
  "bina sırası hq > kışla > fabrika > havalimanı",
  "petrol rafinerisi kasınca rahatla",
  "tersane hq 8de açılıyo",
  "havalimanı hq 5te açılıyo",
  "araştırma labı yükselt araştırma hızlansın",
  "banka kasınca altın üretimi başlıyo",
  "gökdelen nakit üretimi için iyi",
  "hq 20 çok uzun sürüyo ama değer",
  "mühimmat fabrikası cevher üretiyo lazım",
  // Kaynak cevapları
  "görevleri yap altın geliyo ordan",
  "mağazadan kaynak paketi al başta",
  "kalkan al saldırıdan sonra 4 saat koruyo",
  "vip paket değer ilk başta",
  "altını hızlandırma için sakla",
  "petrol en çok lazım olan kaynak",
  "cevher birim üretimi için gerekli",
  "kaynak binalarını yükselt pasif gelir artsın",
  "nakit her şeyde lazım ilk onu kas",
  "görevler en iyi altın kaynağı",
  "savaş kazanınca kaynak alıyosun zaten",
  "hızlandırma yerine bekle altını boşa harcama",
  "kaynakları harcamadan savaşa girme saldırılırsın",
  // Savaş cevapları
  "güç puanı bina + birim + araştırmadan geliyo",
  "savaşta çok birlik götür kayıp az olsun",
  "ittifak bul beraber daha kolay",
  "pvp cooldown 4 saat normal savaşta",
  "ittifak savaşında cooldown 5dk",
  "saldırıda savunma birimi gitmiyo sadece savunmada",
  "kaybedince birlikler gidiyo dikkat et",
  "birlik oluştur sonra saldır daha güvenli",
  "güçsüze saldırma sistem izin vermiyo zaten",
  "sıralamada savaş kazanarak yükseliyosun",
  "intikam butonu var saldırana geri saldır",
  "savunma kastıysan rahat ol saldıramazlar kolay",
  "warpower savaşta kazanılıyo kaybedilince düşüyo",
  "kalkan varken saldıramazlar sana",
  "birden fazla birlik oluştur farklı kombinasyon dene",
  // Araştırma cevapları
  "araştırmayı sakın atlama çok önemli",
  "kara araştırması ilk mantıklı",
  "t4 araştırma bonus veriyo çok iyi",
  "hava araştırması da önemli ikinci sırada",
  "araştırma gücünü de artırıyo unutma",
  "deniz araştırması en sona kalabilir",
  "savunma araştırması hava savunma açıyo",
  // Genel cevaplar
  "sabırlı ol bu oyunda acele etme",
  "günde 2-3 kere gir yeter",
  "ittifak bul çok önemli yalnız zor",
  "para harcamadan da güçlü olursun sabırla",
  "ilk hafta sadece üs kas savaşma",
  "hq 10a kadar saldırma güçlen önce",
  "her gün görev yap altın birikiyo",
];

const ANSWERS_EN = [
  "build infantry first its the safest",
  "air defense is a must trust me",
  "tanks are op in this game",
  "research is super important dont skip",
  "hq first always",
  "navy is endgame dont rush it",
  "f-22 is the best no doubt",
  "get the starter vip pack its worth",
  "mix your units dont go single type",
  "bombers deal insane damage late game",
  "patriot is great for air defense",
  "save gold for speedups",
  "join an alliance asap",
  "dont attack until hq 10",
  "upgrade oil refinery early",
  "infantry is cheap and effective early",
  "helicopters are great mid game",
  "shields protect for 4 hours",
  "power comes from buildings units and research",
  "focus on land research first",
  "submarines are sneaky but effective",
  "aircraft carrier is the strongest naval",
  "balance offense and defense",
  "do daily missions for gold",
  "dont waste gold on resources buy shields",
];

// ── Kısa tepki (cevaba karşılık) ────────────────────────────
const SHORT_REPLIES_TR = [
  "sağol", "eyvallah", "anladım", "teşekkürler", "mantıklı",
  "deneyeceğim", "tamamdır", "saol bro", "helal olsun", "iyi bilgi",
  "aynen öyle", "haklısın", "güzel taktik", "sağol kanka",
  "not aldım", "deniyorum hemen", "eyw", "tm saol",
  "adam ya", "bi deneyeyim bakalım", "süper bilgi",
  "anladım saol", "bunu bilmiyodum", "vay be",
  "harbi mi", "iyi dedin", "doğru söylüyosun",
  "hemen yapıyorum", "mantıklı geldi", "teşekkür ederim",
  "çok yardımcı oldun", "bak bunu deneyeceğim",
  "aaa öyle miymiş", "iyi taktik lan", "helal",
  "saolasın", "anlaşıldı", "tmm yapcam",
  "eyv reis", "doğrudur", "bi bakayım",
  "güzel öneri", "saol abi", "teşekkürler bilgi için",
  "hee mantıklı", "oo iyi iyi", "denedim oldu sağol",
  "bende öyle yapıyodum zaten", "aynen bende",
  "evet kesinlikle", "katılıyorum", "bence de öyle",
  "doğru dedin", "bunu uygulayacağım", "süpersin",
  "saol bilgi için", "not ettim", "işime yaradı",
  "tam da bunu merak ediyodum", "güzel açıklama",
];

const SHORT_REPLIES_EN = [
  "thanks", "got it", "makes sense", "thx bro", "will try",
  "good tip", "nice", "ty", "appreciate it", "cool",
  "oh i see", "didnt know that", "smart",
  "good to know", "thx for the info", "noted",
  "yeah true", "right", "agreed", "ill try that",
  "helpful thanks", "ok will do", "interesting",
  "oh really", "that makes sense yeah",
];

// ── Yorum / sohbet (soru olmayan) ────────────────────────────
const COMMENTS_TR = [
  // Başarı / ilerleme
  "sonunda hq 15 oldum",
  "100 birim oldum sonunda",
  "f-22 ürettim efsane birşey",
  "kışla 18 oldu sonunda",
  "ilk denizaltımı ürettim",
  "leo 2a7 bir başka ya",
  "thaad ürettim hava savunma full",
  "abrams beast ya",
  "hq 20 oldum sonunda bitirdim",
  "500 birim geçtim",
  "ilk bomber ürettim",
  "t4 araştırma bitti efsane",
  "bütün binalar 15+ oldu",
  "güç 100k geçti",
  "ilk kaan ürettim türk gururu",
  "altay ürettim çok güçlü",
  "deniz kuvvetleri kurdum sonunda",
  "araştırma ağacı yarısı bitti",
  "güç 200k oldu artık",
  "50 görevin hepsini bitirdim",
  // Savaş deneyimi
  "3 savaş yaptım 3ünü de aldım",
  "savunmam çöktü az önce",
  "biri bana saldırdı ama yendim",
  "kim saldırdı bana ya",
  "bomber ile hasar müthiş",
  "günde 3 savaş yapıyorum artık",
  "az önce saldırdım 3-0 aldım",
  "savunma full yaptım gelsinler",
  "pvp çok zevkli ya",
  "saldırdım ama kaybettim üzgünüm",
  "intikam aldım o saldırandan",
  "kalkan bitti saldırıyolar",
  "5 savaş 4 galibiyet bugün",
  "çok güçlü birine denk geldim",
  "savaş raporu efsaneydi",
  "karşıdaki hiç birim yokmuş kolay oldu",
  "tank ordusuyla ezdim",
  "hava kuvvetleriyle girdim süper oldu",
  "ittifak savaşında 3 saldırı yaptım",
  "mvp oldum ittifak savaşında",
  // İttifak
  "ittifak savaşı kazandık helal olsun",
  "ittifakımız güçleniyo",
  "ittifak savaşı başladı hadi",
  "ittifakta herkes aktif süper",
  "ittifak savaşını kaybettik ama olsun",
  "yeni üyeler geldi ittifaka",
  "ittifak bağışı yaptım",
  "ittifak chati çok eğlenceli",
  // Kaynak / ekonomi
  "petrolüm bitti yine",
  "altın birikiyo güzel",
  "araştırma bitene kadar canım çıktı",
  "mağazadan paket aldım değdi",
  "cevher çok lazım oluyo",
  "kaynak kasıyorum bugün savaş yok",
  "altın 500 oldu biriktiriyorum",
  "vip paket aldım çok iyi",
  "görevden 10 altın geldi",
  "nakit 5m oldu sonunda",
  // Genel sohbet
  "bu oyun sarıyo ya",
  "hava savunma hayat kurtarıyor",
  "bu sezon çok aktifim",
  "sıralamada yükseliyorum yavaş yavaş",
  "gece gece oynuyorum hala",
  "bu oyunu seviyorum",
  "her gün giriyorum artık",
  "strateji çok önemli bu oyunda",
  "sabır şart bu oyunda",
  "bugün çok verimli geçti",
  "yavaş yavaş güçleniyorum",
  "oyun güzel ama biraz yavaş",
  "yeni güncelleme gelmiş mi",
  "sıralama değişmiş bakın",
  "bugün kaç kişi online acaba",
  "selam millet",
  "nasılsınız bugün",
  "iyi akşamlar herkese",
  "günaydın savaşçılar",
];

const COMMENTS_EN = [
  "finally reached hq 15",
  "this game is addictive",
  "just won 3 battles in a row",
  "my defense got destroyed lol",
  "f-22 is insane",
  "just built my first bomber",
  "grinding resources all day",
  "hit 100k power today",
  "love this game",
  "pvp is so fun",
  "just got attacked but won",
  "alliance war started lets go",
  "we won the alliance war gg",
  "built my first submarine",
  "research takes so long",
  "gold is hard to get",
  "shield saved me today",
  "tanks are amazing",
  "air force is the best branch",
  "just reached top 50",
  "this game needs more content",
  "playing every day now",
  "hello everyone",
  "good morning warriors",
  "gg to whoever attacked me",
];

// ── İttifak arama mesajları ──────────────────────────────────
const ALLIANCE_SEARCH_TR = [
  "ittifak arıyorum aktif oyuncuyum",
  "güçlü bi ittifak var mı katılabileceğim",
  "yeni ittifak kurduk gelin",
  "aktif savaşan ittifak arıyorum",
  "ittifak lazım bana hq {LV}",
  "ittifaka katılmak isteyen var mı",
  "türk ittifak var mı",
  "savaş yapan ittifak arıyorum",
  "ittifak kurdum 3 kişiyiz gelin",
  "hq {LV} aktif oyuncuyum ittifak arıyorum",
  "güçlü ittifak lazım pvp yapacağız",
  "ittifak savaşı seven ittifak arıyorum",
  "yeni açtık ittifak katılın",
  "aktif ittifak önerisi olan var mı",
  "ittifak değiştirmek istiyorum aktif olan",
  "2-3 kişilik ekibiz ittifak arıyoruz",
  "savaşçı ittifak var mı türk",
  "her gün giren ittifak lazım",
  "güç {LV}0k ittifak arıyorum",
  "ittifaka alın beni savaşırım",
  "ittifak kurcak var mı beraber",
  "bi ittifak önerin aktif olan",
  "savaş seven 5+ kişi ittifak kuralım",
  "ittifaksız zor oluyo biri alsın",
];

const ALLIANCE_SEARCH_EN = [
  "looking for active alliance",
  "any alliance recruiting?",
  "need alliance hq {LV}",
  "new alliance join us",
  "active player looking for alliance",
  "who wants to start an alliance",
  "looking for war focused alliance",
  "hq {LV} need good alliance",
  "alliance with daily wars anyone",
  "english speaking alliance?",
];

/** Bot isminin Türkçe olup olmadığını algıla */
function isTurkishBotName(name) {
  if (!name) return true;
  // Türkçe karakter varsa kesin Türkçe
  if (/[çğıöşüÇĞİÖŞÜ]/.test(name)) return true;
  // Yaygın Türkçe isim kalıpları
  const trPatterns = ['kan', 'kurt', 'aslan', 'reis', 'sultan', 'fatih', 'osman', 'komutan',
    'paşa', 'pasa', 'bey', 'han', 'efe', 'yıldırım', 'kartal', 'bozkurt', 'anadolu',
    'türk', 'turk', 'cesur', 'kara', 'alparslan', 'mehmet', 'emre', 'gazi',
    'savaş', 'savas', 'çaylak', 'caylak', 'acemi', 'taze', 'deneme', 'barut',
    'yeni', 'başlangıç', 'fırtına', 'erlik', 'torunu', 'kuvvet'];
  const lower = name.toLowerCase();
  return trPatterns.some(p => lower.includes(p));
}

/** Havuzdan tekrar etmeyen mesaj seç */
function pickUnique(pool, recentTexts, maxAttempts) {
  const attempts = maxAttempts ?? 10;
  for (let i = 0; i < attempts; i++) {
    const text = pool[Math.floor(Math.random() * pool.length)];
    if (!recentTexts || !recentTexts.has(text.toLowerCase())) return text;
  }
  return pool[Math.floor(Math.random() * pool.length)]; // fallback
}

/**
 * Rastgele mesaj üret.
 * @param {'question'|'answer'|'reply'|'comment'|'alliance'} type
 * @param {number} hqLevel
 * @param {string} [botName]
 * @param {Set<string>} [recentTexts] — son mesajların lowercase text'leri
 * @returns {{ text: string, isQuestion: boolean }}
 */
function generateMessage(type, hqLevel, botName, recentTexts) {
  let pool;
  let isQuestion = false;

  switch (type) {
    case 'question':
      pool = QUESTIONS_TR;
      isQuestion = true;
      break;
    case 'answer':
      pool = ANSWERS_TR;
      break;
    case 'reply':
      pool = SHORT_REPLIES_TR;
      break;
    case 'comment':
      pool = COMMENTS_TR;
      break;
    case 'alliance':
      pool = ALLIANCE_SEARCH_TR;
      break;
    default:
      pool = COMMENTS_TR;
  }

  let text = pickUnique(pool, recentTexts);
  text = text.replace('{LV}', String(hqLevel ?? Math.floor(8 + Math.random() * 10)));

  // Doğallık: bazen küçük harf, bazen büyük harf başlangıç
  if (Math.random() < 0.3 && text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Sorulara bazen ? ekle (%45 ihtimal), zaten ? varsa ekleme
  if (isQuestion && !text.endsWith('?') && Math.random() < 0.45) {
    text += '?';
  }

  return { text, isQuestion };
}

// ── Anahtar kelime → cevap eşleştirme (gerçek kullanıcı sorularına) ──

const KEYWORD_RESPONSES = {
  // Tank / Zırhlı
  tank: [
    "tank konusunda leopard 2a7 veya abrams öneririm",
    "t-14 armata en güçlüsü ama geç açılıyo",
    "altay da çok iyi bence fena değil",
    "tank kas kesinlikle savunmada ve saldırıda işe yarıyo",
    "abrams vs leopard ikisi de iyi ama leopard savunması daha iyi",
    "k2 panther de güzel dengeli tank",
    "merkava da çok sağlam savunması yüksek",
    "tank fabrikasını yükselt daha iyi tanklar açılır",
    "tanks are great for both attack and defense",
    "i recommend leopard or abrams early on",
  ],
  leopard: [
    "leopard 2a7 savunması çok iyi en dengeli tank",
    "leopard kas pişman olmazsın",
    "leo bence abrams dan iyi savunmada",
  ],
  abrams: [
    "abrams saldırıda çok güçlü bence en iyisi",
    "m1a2 sep3 kas saldırı gücü yüksek",
    "abrams beast ya kesinlikle üret",
  ],
  altay: [
    "altay çok iyi türk tankı",
    "altay dengeli tank saldırı savunma ikisi de iyi",
    "altay ürettim memnunum",
  ],
  // Hava
  hava: [
    "hava kuvvetleri çok önemli kesinlikle kas",
    "f-22 en güçlü savaş uçağı",
    "akıncı ve tb2 ile başla sonra jet geç",
    "hava savunma da unutma saldırılara karşı",
    "havalimanını yükselt iyi uçaklar açılsın",
    "air force is the best branch imo",
  ],
  uçak: [
    "f-22 raptor en iyi uçak oyunda",
    "kaan da çok iyi f-22 e yakın",
    "f-35 stealth çok güçlü",
    "jet uçağı üretmek için havalimanı gerekli",
    "uçaklar saldırıda çok etkili",
  ],
  'f-22': [
    "f-22 en güçlü savaş uçağı şüphesiz",
    "f-22 üret pişman olmazsın",
    "f-22 raptor oyundaki en iyi jet",
  ],
  kaan: [
    "kaan çok iyi f-22 ye yakın güçte",
    "kaan türk gururu kesinlikle üret",
    "kaan güçlü ama f-22 biraz daha iyi bence",
  ],
  'f-35': [
    "f-35 çok iyi stealth uçak",
    "f-35 üret kesinlikle güçlü",
  ],
  bomber: [
    "bomber end game ama hasar müthiş",
    "b-2 spirit üret efsane hasar",
    "b-21 raider en güçlü bomber",
    "bomber pahalı ama çok etkili saldırıda",
    "bombers deal insane damage worth it late game",
  ],
  helikopter: [
    "helikopter erken oyunda çok iyi",
    "ah-64 apache en iyi helikopter",
    "t129 atak da iyi türk helikopteri",
    "helikopter ilk hava birimin olsun",
  ],
  iha: [
    "tb2 ile başla ucuz ve etkili",
    "akıncı çok güçlü iha",
    "iha lar saldırıda çok işe yarıyo",
    "bayraktar serisi efsane bence",
    "drones are very effective early game",
  ],
  drone: [
    "tb2 ile başla ucuz ve etkili",
    "akıncı en güçlü iha bence",
    "drone üret kesinlikle saldırıda çok iyi",
  ],
  // Deniz
  deniz: [
    "deniz end game işi acele etme",
    "tersane hq 8de açılıyo",
    "uçak gemisi en güçlü deniz birimi",
    "denizaltı gizli silah gibi bişey çok iyi",
    "deniz kuvvetleri geç kas önce kara ve hava",
    "navy is endgame focus on land and air first",
  ],
  denizaltı: [
    "denizaltı çok etkili gizli saldırı yapıyo",
    "virginia class en iyi denizaltı",
    "denizaltı üret savunması da yüksek",
  ],
  gemi: [
    "uçak gemisi en güçlü ama çok pahalı",
    "ford carrier oyundaki en güçlü gemi",
    "fragat ile başla sonra destroyer geç",
  ],
  // Savunma
  savunma: [
    "hava savunma şart kesinlikle üret",
    "patriot veya s-500 üret çok güçlü",
    "thaad en güçlü savunma birimi",
    "savunma birimi saldırıda gitmiyo sadece savunmada",
    "stinger ile başla ucuz ama işe yarıyo",
    "air defense is a must have",
  ],
  'hava savunma': [
    "hava savunma şart yoksa hava saldırısına açık kalırsın",
    "patriot al sonra thaad a geç",
    "s-500 prometheus çok güçlü",
    "hava savunma birimleri saldırıya katılmaz dikkat",
  ],
  patriot: [
    "patriot pac-3 çok iyi hava savunma",
    "patriot üret kesinlikle değer",
  ],
  thaad: [
    "thaad en güçlü savunma birimi oyunda",
    "thaad üret hava savunma full olsun",
  ],
  // Piyade / Kara
  piyade: [
    "piyade ucuz ve etkili ilk başta çok iyi",
    "piyade kas ilk birimler onlar olsun",
    "rifleman ile başla sonra özel kuvvetlere geç",
    "infantry is cheap and effective early on",
  ],
  kara: [
    "kara birimlerini kas ilk önce en mantıklısı",
    "kışlayı yükselt daha iyi kara birimleri aç",
    "kara araştırmasını ilk yap",
    "land units first then air",
  ],
  // Bina
  bina: [
    "bina sırası hq > kışla > fabrika > havalimanı",
    "hq her zaman ilk yükselt",
    "binaları dengeli yükselt tek birine takılma",
    "bina yükseltmek güç puanı veriyo",
  ],
  hq: [
    "hq her zaman ilk yükselt en önemli bina",
    "hq seviyesi diğer binaların max seviyesini belirliyo",
    "hq 20 uzun sürüyo ama değer",
    "hq yükselt yeni birimler ve binalar açılır",
    "upgrade hq first always",
  ],
  kışla: [
    "kışla yükselt daha iyi kara birimleri açılır",
    "kışla hq dan sonra ikinci öncelik",
    "kışla seviye arttıkça tier 2 tier 3 birimler açılır",
  ],
  havalimanı: [
    "havalimanı hq 5te açılıyo",
    "havalimanı yükselt jet uçakları açılır",
    "havalimanı çok önemli hava gücü için",
  ],
  tersane: [
    "tersane hq 8de açılıyo",
    "tersane yükselt deniz birimleri açılır",
    "tersane end game binası acele etme",
  ],
  araştırma: [
    "araştırma çok önemli sakın atlama",
    "araştırma güç puanı da veriyo",
    "t4 araştırma bonus veriyo çok iyi",
    "kara araştırmasını ilk yap",
    "araştırma labını yükselt hızlansın",
    "research is super important dont skip it",
  ],
  // Kaynak
  kaynak: [
    "kaynak binalarını yükselt pasif gelir artsın",
    "savaş kazanınca kaynak alıyosun",
    "kalkan al saldırılarda kaynak kaybetme",
    "kaynakları harcamadan çıkma saldırılırsın",
    "resources are important upgrade production buildings",
  ],
  petrol: [
    "petrol rafinerisi yükselt daha çok üretir",
    "petrol en çok lazım olan kaynak",
    "petrol bitiyo sürekli biliyorum normal o",
  ],
  altın: [
    "altın görevlerden geliyo en çok",
    "altını hızlandırma için sakla boşa harcama",
    "altın çok kıymetli dikkatli harca",
    "mağazadan altın alınabiliyo",
    "gold comes from missions mostly save it",
  ],
  cevher: [
    "cevher birim üretimi için lazım",
    "cevher madeni yükselt daha çok üretir",
    "cevher önemli kaynak birim üretiminde kullanılıyo",
  ],
  nakit: [
    "nakit her şeyde lazım ilk onu kas",
    "gökdelen nakit üretiyo yükselt",
    "nakit en temel kaynak her yerde kullanılıyo",
  ],
  mağaza: [
    "mağazadan başlangıç paketi al değer",
    "vip paket çok iyi değer bence",
    "kaynak paketi al acil lazımsa",
    "starter pack is worth it",
  ],
  // Savaş
  savaş: [
    "savaşta çok birlik götür kayıp az olsun",
    "güçsüzlere saldır başta tecrübe kazan",
    "birlik oluştur sonra saldır daha güvenli",
    "savaş gücü bina birim araştırmadan geliyo",
    "kalkan varken saldırılamazsın",
  ],
  pvp: [
    "pvp de birlik seç saldır basit",
    "pvp cooldown 4 saat normal savaşta",
    "pvp de güçlü birimlerini götür",
    "pvp çok zevkli bence en iyi kısım",
    "pvp is the best part of the game",
  ],
  saldırı: [
    "saldırıda savunma birimi gitmiyo dikkat",
    "saldırıda birlik oluşturup seç",
    "saldırırken kaynak da kazanıyosun",
    "saldırmadan önce güçlen biraz",
  ],
  kalkan: [
    "kalkan 4 saat koruyo mağazadan al",
    "kalkan varken kimse saldıramaz",
    "saldırıdan sonra kalkan al güvende ol",
    "shields protect you for 4 hours",
  ],
  // İttifak
  ittifak: [
    "ittifak bul çok önemli yalnız zor",
    "ittifak savaşı çok eğlenceli",
    "ittifakta bağış yap puan kazan",
    "ittifak chatte konuş üyelerle",
    "güçlü ittifak bul beraber büyüyün",
    "join an alliance asap its very important",
  ],
  'ittifak savaşı': [
    "ittifak savaşında kazanan 10 puan alıyo",
    "ittifak savaşı 24 saat sürüyo",
    "ittifak savaşında çok saldır puan topla",
    "ittifak savaşı kazanınca herkes ödül alıyo",
  ],
  // Güç
  güç: [
    "güç puanı bina + birim + araştırmadan geliyo",
    "savaş kazanınca warpower artıyo güce ekleniyo",
    "bina yükselt birim üret araştırma yap güç artar",
    "power comes from buildings units and research",
  ],
  // Görev
  görev: [
    "görevleri yap altın geliyo",
    "50 görev var hepsini bitir",
    "görevler altın kazanmanın en iyi yolu",
    "do daily missions for gold rewards",
  ],
  // Yeni başlayan
  yeni: [
    "yeni başladıysan hq kas ilk",
    "yeniysen kara birimi üret piyade bas",
    "yeni oyuncuya tavsiye: hq > kışla > birim üret",
    "acele etme sabırla büyü",
    "if youre new focus on hq and barracks first",
  ],
  başlangıç: [
    "başlangıçta hq yükselt her şeyden önce",
    "başta piyade üret ucuz ve etkili",
    "başlangıç paketi al mağazadan değer",
  ],
  tavsiye: [
    "bence hq kas ilk her zaman",
    "ittifak bul çok önemli",
    "araştırmayı atla birim kas daha hızlı güçlenirsin",
    "sabırlı ol acele etme bu oyunda",
    "dengeli büyü tek şeye takılma",
    "my advice is upgrade hq first and join alliance",
  ],
  strateji: [
    "en iyi strateji dengeli büyümek",
    "hq kas > birim üret > araştırma yap > savaş",
    "saldırı ve savunma dengeli olmalı",
    "strategy is key in this game balance everything",
  ],
  // Sıralama
  sıralama: [
    "sıralamada savaş kazanarak yükseliyosun",
    "güç puanın arttıkça sıralama yükseliyo",
    "sıralamada top 10 olmak çok zor ama hedefle",
  ],
  // Genel
  nasıl: [
    "ne konuda nasıl diye soruyon biraz detay ver",
    "oyunla ilgili bi şey mi soruyorsun",
    "sorunun ne tam açıkla yardım edeyim",
  ],
  merhaba: [
    "selam hoşgeldin",
    "selam nasılsın",
    "merhaba iyi oyunlar",
    "hey whats up",
  ],
  selam: [
    "selam hoşgeldin",
    "selaam nasılsın",
    "selam iyi oyunlar",
    "hey!",
  ],
};

// ── "En iyi / en güçlü" kalıpları ──
const BEST_RESPONSES = {
  'en iyi uçak': [
    "f-22 raptor en iyi uçak tartışmasız",
    "f-22 bence ama kaan da çok yakın",
    "saldırı için f-22 savunma için f-35",
    "f-22 raptor no doubt best fighter",
  ],
  'en güçlü uçak': [
    "f-22 en güçlü savaş uçağı",
    "b-21 raider en güçlü ama o bomber",
    "jet olarak f-22 bomber olarak b-21",
  ],
  'en iyi tank': [
    "t-14 armata en güçlü tank",
    "leopard 2a7 savunmada en iyi abrams saldırıda",
    "bence leopard ama abrams da çok iyi",
    "t-14 armata is the strongest tank",
  ],
  'en güçlü tank': [
    "t-14 armata en güçlü tank oyunda",
    "merkava savunması en yüksek ama t-14 genel en iyi",
    "t-14 no doubt strongest tank",
  ],
  'en iyi birim': [
    "dala göre değişir ama f-22 ve t-14 en iyiler",
    "her dalın en iyisi farklı neye göre soruyosun",
    "kara t-14, hava f-22, deniz ford carrier",
  ],
  'en güçlü birim': [
    "en güçlü birimler t3 tier olanlar",
    "f-22 t-14 ford carrier thaad en güçlüler",
    "her dalda t3 birimleri kas onlar en güçlü",
  ],
  'en iyi savunma': [
    "thaad en güçlü savunma birimi",
    "s-500 de çok iyi patriot da fena değil",
    "thaad is the best defense unit",
  ],
  'en güçlü savunma': [
    "thaad savunma gücü en yüksek",
    "thaad > s-500 > siper sıralama böyle",
  ],
  'en iyi hava': [
    "f-22 raptor en iyi hava birimi",
    "savaş uçağı f-22, iha akıncı, bomber b-21",
    "f-22 for fighters akinci for drones",
  ],
  'en iyi deniz': [
    "ford carrier en güçlü ama virginia class da efsane",
    "uçak gemisi end game en güçlüsü",
    "ford carrier is the best naval unit",
  ],
  'en iyi kara': [
    "t-14 armata en güçlü kara birimi",
    "leopard ve abrams da çok iyi",
    "t-14 armata best land unit",
  ],
  'en iyi helikopter': [
    "ah-64 apache en iyi helikopter",
    "apache guardian çok güçlü",
    "ah-64e apache kesinlikle en iyisi",
  ],
  'en iyi iha': [
    "akıncı en güçlü iha",
    "bayraktar akıncı kesinlikle üret",
    "akinci is the best drone",
  ],
  'en iyi bomber': [
    "b-21 raider en güçlü bomber",
    "b-2 spirit de çok iyi ama b-21 daha iyi",
  ],
  'en iyi ittifak': [
    "aktif üyeli ittifak bul en iyisi o",
    "savaş yapan ittifak ara",
  ],
  'en iyi strateji': [
    "dengeli büyü hq > birim > araştırma",
    "en iyi strateji sabırlı olmak ve dengeli kasmak",
  ],
};

// Öncelik sırası: BEST kalıpları > spesifik birimler > genel kelimeler
// Tier 1: Çok spesifik (birim isimleri, bina isimleri)
const TIER1_KEYS = ['hava savunma', 'ittifak savaşı', 'f-22', 'f-35', 'kaan',
  'leopard', 'abrams', 'altay', 'patriot', 'thaad', 'denizaltı',
  'helikopter', 'bomber', 'iha', 'drone', 'uçak', 'gemi',
  'havalimanı', 'tersane', 'kışla', 'araştırma', 'hq'];
// Tier 2: Orta spesifik (kategori)
const TIER2_KEYS = ['tank', 'hava', 'deniz', 'savunma', 'piyade', 'kara',
  'bina', 'kaynak', 'petrol', 'altın', 'cevher', 'nakit',
  'mağaza', 'kalkan', 'ittifak', 'güç', 'görev', 'pvp'];
// Tier 3: Genel (en son kontrol et)
const TIER3_KEYS = ['savaş', 'saldırı', 'sıralama', 'yeni', 'başlangıç',
  'tavsiye', 'strateji', 'nasıl', 'merhaba', 'selam'];

const BEST_KEYS = Object.keys(BEST_RESPONSES).sort((a, b) => b.length - a.length);

/**
 * Gerçek kullanıcı mesajına anahtar kelime bazlı cevap üret.
 * @param {string} userMessage
 * @returns {string|null} — eşleşen cevap veya null
 */
/** Mesajın Türkçe olup olmadığını algıla */
function isTurkish(text) {
  const lower = (text ?? '').toLowerCase();
  // Türkçe karakterler veya yaygın Türkçe kelimeler varsa TR
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return true;
  const trWords = ['mı', 'mi', 'mu', 'mü', 'ne', 'nasıl', 'hangisi', 'var', 'yok', 'bir', 'bilen', 'bence',
    'en iyi', 'en güçlü', 'lazım', 'gerekli', 'mantıklı', 'değer', 'önemli', 'kasayım', 'üretmeli',
    'beyler', 'arkadaşlar', 'selam', 'merhaba', 'sizce', 'yapmalı', 'nedir', 'kaç', 'arıyorum'];
  return trWords.some(w => lower.includes(w));
}

/** İngilizce cevabı filtrele — basit heuristic */
function isEnglishText(text) {
  const lower = (text ?? '').toLowerCase();
  const enIndicators = ['the ', 'is ', 'are ', 'its ', 'dont ', "don't", 'best ', 'first',
    'trust me', 'no doubt', 'worth', 'focus', 'build', 'upgrade', 'always', 'early',
    'endgame', 'skip', 'rush', 'imo', 'tbh', 'asap', 'lol'];
  return enIndicators.some(w => lower.includes(w));
}

/** Havuzdan Türkçe + tekrar etmeyen cevap seç */
function pickFromPool(pool, _mustBeTurkish, recentTexts) {
  // Her zaman Türkçe cevap seç
  const trPool = pool.filter(t => !isEnglishText(t));
  let filtered = trPool.length > 0 ? trPool : pool;
  // Tekrar kontrolü
  if (recentTexts && recentTexts.size > 0) {
    const unique = filtered.filter(t => !recentTexts.has(t.toLowerCase()));
    if (unique.length > 0) return unique[Math.floor(Math.random() * unique.length)];
  }
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function generateSmartReply(userMessage, recentTexts) {
  const lower = (userMessage ?? '').toLowerCase();
  if (lower.length < 2) return null;

  const mustTR = isTurkish(userMessage);

  // 1. Önce "en iyi / en güçlü" kalıplarını kontrol et
  for (const key of BEST_KEYS) {
    if (lower.includes(key)) {
      return pickFromPool(BEST_RESPONSES[key], mustTR, recentTexts);
    }
  }

  // 2. Tier bazlı anahtar kelime ara (spesifik → genel)
  for (const tier of [TIER1_KEYS, TIER2_KEYS, TIER3_KEYS]) {
    for (const keyword of tier) {
      if (lower.includes(keyword) && KEYWORD_RESPONSES[keyword]) {
        return pickFromPool(KEYWORD_RESPONSES[keyword], mustTR, recentTexts);
      }
    }
  }

  // 3. Hiçbir eşleşme yoksa fallback
  const FALLBACK_TR = [
    "hmm tam bilmiyorum ama ittifakta sor derim",
    "iyi soru ama tam emin değilim",
    "bence deneyerek öğren en iyisi",
    "bilmiyorum ama biri biliyodur burada",
    "güzel soru bilen varsa yazsın",
  ];
  const FALLBACK_EN = [
    "interesting question someone might know",
    "not sure tbh try asking in alliance chat",
    "hmm good question",
  ];
  if (Math.random() < 0.6) {
    const fb = mustTR ? FALLBACK_TR : [...FALLBACK_TR, ...FALLBACK_EN];
    return pickFromPool(fb, false, recentTexts);
  }
  return null;
}

module.exports = { generateMessage, generateSmartReply, isTurkishBotName };
