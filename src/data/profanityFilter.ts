/**
 * Küfür filtresi — Türkçe + İngilizce
 * Mesajlardaki küfürleri **** ile maskeler.
 */

const PROFANITY_LIST: string[] = [
  // ── Türkçe ──
  'amk', 'aq', 'amq', 'amına', 'amina', 'amınakoyim', 'aminakoyim', 'amınakoyayım',
  'aminakoyayim', 'amınakoydumun', 'amınakodumun', 'ananı', 'anani', 'ananın', 'ananin',
  'anasını', 'anasini', 'anasının', 'anasinin', 'orospu', 'orospuçocuğu', 'orospucocugu',
  'oç', 'oc', 'piç', 'pic', 'piçkurusu', 'pickurusu',
  'sik', 'siktir', 'siktirgit', 'sikerim', 'sikeyim', 'sikim', 'sikimin',
  'yarrak', 'yarak', 'yarrağ', 'yarrag', 'taşak', 'tasak', 'taşşak', 'tassak',
  'göt', 'got', 'götün', 'gotun', 'götveren', 'gotveren',
  'meme', 'amcık', 'amcik', 'amcığ', 'amcig',
  'pezevenk', 'ibne', 'gavat', 'kahpe', 'şerefsiz', 'serefsiz',
  'bok', 'boktan', 'hıyar', 'hiyar', 'dangalak', 'gerizekalı', 'gerizekali',
  'salak', 'aptal', 'mal', 'döl', 'dol', 'kaltak',
  'hassiktir', 'hassktir', 'hasiktir', 'sg', 'sktir',
  'ananıskim', 'ananiskm', 'annenisikeyim', 'mk', 'mq',
  'am', 'yavşak', 'yavsak',
  // ── İngilizce ──
  'fuck', 'fucking', 'fucked', 'fucker', 'fck', 'fuk', 'fk',
  'shit', 'shitty', 'bullshit', 'sh1t',
  'ass', 'asshole', 'a$$', 'a$$hole',
  'bitch', 'b1tch', 'btch',
  'dick', 'd1ck', 'dck',
  'pussy', 'puss',
  'cunt', 'c0ck', 'cock',
  'bastard', 'bstrd',
  'whore', 'slut', 'hoe',
  'nigga', 'nigger', 'n1gga', 'n1gger',
  'stfu', 'gtfo', 'wtf', 'lmfao',
  'motherfucker', 'mf', 'mofo',
  'damn', 'dammit', 'goddamn',
  'retard', 'retarded',
  'faggot', 'fag', 'f4g',
  'twat', 'wanker', 'prick',
];

// Regex pattern oluştur — kelime sınırları ile eşleş
const pattern = new RegExp(
  '\\b(' + PROFANITY_LIST.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'gi',
);

/** Mesajdaki küfürleri **** ile maskele */
export function filterProfanity(text: string): string {
  return text.replace(pattern, match => '*'.repeat(match.length));
}

/** Mesajda küfür var mı kontrol et */
export function hasProfanity(text: string): boolean {
  return pattern.test(text);
}
