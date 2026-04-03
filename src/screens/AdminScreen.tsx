import React, { useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { db } from '../services/firebase';
import { BUILDING_DEFINITIONS } from '../data/buildings';
import { UNIT_DEFINITIONS } from '../data/units';
import { migratePlayerPower, enforceUnitCaps } from '../services/cloudSave';
import type { BuildingId } from '../state/types';

import { CF_BASE as CF } from '../services/firebase';
const CF2 = 'https://{NAME}-azlw7h3x7q-uc.a.run.app';
function cfUrl(name: string) { return CF2.replace('{NAME}', name.toLowerCase()); }

type Tab = 'players' | 'alliance' | 'bots' | 'wars' | 'server' | 'chat';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'players', label: 'Oyuncular', icon: '👤' },
  { key: 'alliance', label: 'İttifak', icon: '🏰' },
  { key: 'bots', label: 'Botlar', icon: '🤖' },
  { key: 'wars', label: 'Savaş', icon: '⚔️' },
  { key: 'server', label: 'Sunucu', icon: '🖥️' },
  { key: 'chat', label: 'Sohbet', icon: '💬' },
];

interface PlayerInfo {
  uid: string;
  displayName: string;
  hqLevel: number;
  playerPower: number;
  isBot?: boolean;
  allianceId?: string;
  warPower?: number;
  wins?: number;
  losses?: number;
}

export function AdminScreen() {
  const [tab, setTab] = useState<Tab>('players');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [log, setLog] = useState('');

  // Player
  const [searchText, setSearchText] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selPlayer, setSelPlayer] = useState<PlayerInfo | null>(null);
  const [playerBase, setPlayerBase] = useState<any>(null);
  const [buildingId, setBuildingId] = useState<BuildingId>('hq');
  const [newLevel, setNewLevel] = useState('');
  const [unitBuildingId, setUnitBuildingId] = useState<BuildingId>('barracks');
  const [unitId, setUnitId] = useState('');
  const [unitCount, setUnitCount] = useState('');
  const [resAmount, setResAmount] = useState('');
  const [resKey, setResKey] = useState<'cash' | 'oil' | 'ore' | 'gold'>('gold');

  // Chat
  const [sysMsg, setSysMsg] = useState('');

  const showStatus = (s: string) => { setStatus(s); setTimeout(() => setStatus(''), 5000); };
  const addLog = (s: string) => setLog(prev => `[${new Date().toLocaleTimeString('tr-TR')}] ${s}\n${prev}`.slice(0, 3000));

  async function callCF(name: string, body?: any) {
    setLoading(true);
    try {
      const res = await fetch(name.startsWith('http') ? name : cfUrl(name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      addLog(`${name}: ${JSON.stringify(data).slice(0, 200)}`);
      setLoading(false);
      return data;
    } catch (e: any) {
      addLog(`${name}: HATA - ${e.message}`);
      setLoading(false);
      return { error: e.message };
    }
  }

  // ── Oyuncu Ara ──
  const searchPlayers = useCallback(async () => {
    if (!searchText.trim()) return;
    setLoading(true);
    try {
      const snap = await db.players()
        .where('displayName', '>=', searchText.trim())
        .where('displayName', '<=', searchText.trim() + '\uf8ff')
        .limit(15)
        .get();
      const results: PlayerInfo[] = snap.docs.map(d => {
        const data = d.data() as any;
        return { uid: d.id, displayName: data.displayName ?? '?', hqLevel: data.hqLevel ?? 1, playerPower: data.playerPower ?? 0, isBot: data.isBot, allianceId: data.allianceId, warPower: data.warPower ?? 0, wins: data.wins ?? 0, losses: data.losses ?? 0 };
      });
      if (results.length === 0 && searchText.length > 10) {
        const docSnap = await db.players().doc(searchText.trim()).get();
        if (docSnap.exists) {
          const data = docSnap.data() as any;
          results.push({ uid: docSnap.id, displayName: data.displayName ?? '?', hqLevel: data.hqLevel ?? 1, playerPower: data.playerPower ?? 0, isBot: data.isBot, allianceId: data.allianceId, warPower: data.warPower ?? 0, wins: data.wins ?? 0, losses: data.losses ?? 0 });
        }
      }
      setPlayers(results);
      showStatus(results.length === 0 ? 'Bulunamadı' : `${results.length} oyuncu`);
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  }, [searchText]);

  const selectPlayer = useCallback(async (p: PlayerInfo) => {
    setSelPlayer(p);
    try {
      const snap = await db.playerBases().doc(p.uid).get();
      setPlayerBase(snap.exists ? snap.data() : null);
    } catch { setPlayerBase(null); }
  }, []);

  // ── Bina Seviye ──
  const updateBuildingLevel = async () => {
    if (!selPlayer || !playerBase) return;
    const lvl = parseInt(newLevel, 10);
    if (isNaN(lvl) || lvl < 1 || lvl > 20) { showStatus('Geçersiz seviye (1-20)'); return; }
    setLoading(true);
    try {
      const updated = playerBase.buildings.map((b: any) => b.id === buildingId ? { ...b, level: lvl, upgradeRemainingSeconds: 0 } : b);
      await db.playerBases().doc(selPlayer.uid).set({ buildings: updated, lastSavedAt: Date.now() }, { merge: true });
      if (buildingId === 'hq') await db.players().doc(selPlayer.uid).set({ hqLevel: lvl }, { merge: true });
      setPlayerBase({ ...playerBase, buildings: updated });
      addLog(`${selPlayer.displayName}: ${buildingId} → Lv.${lvl}`);
      showStatus('✓ Güncellendi');
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };

  // ── Birim Ekle ──
  const addUnits = async () => {
    if (!selPlayer || !playerBase || !unitId) return;
    const count = parseInt(unitCount || '10', 10);
    setLoading(true);
    try {
      const updated = playerBase.buildings.map((b: any) => {
        if (b.id !== unitBuildingId) return b;
        return { ...b, trainedUnits: { ...b.trainedUnits, [unitId]: (b.trainedUnits?.[unitId] ?? 0) + count } };
      });
      await db.playerBases().doc(selPlayer.uid).set({ buildings: updated, lastSavedAt: Date.now() }, { merge: true });
      setPlayerBase({ ...playerBase, buildings: updated });
      addLog(`${selPlayer.displayName}: +${count} ${unitId}`);
      showStatus(`✓ +${count} birim eklendi`);
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };

  // ── Toplu Birim Ekle ──
  const addAllUnits = async () => {
    if (!selPlayer || !playerBase) return;
    const count = parseInt(unitCount || '10', 10);
    setLoading(true);
    try {
      const updated = playerBase.buildings.map((b: any) => {
        const units = UNIT_DEFINITIONS.filter(u => u.requiredBuildingId === b.id);
        if (units.length === 0) return b;
        const newT = { ...b.trainedUnits };
        for (const u of units) newT[u.id] = (newT[u.id] ?? 0) + count;
        return { ...b, trainedUnits: newT };
      });
      await db.playerBases().doc(selPlayer.uid).set({ buildings: updated, lastSavedAt: Date.now() }, { merge: true });
      setPlayerBase({ ...playerBase, buildings: updated });
      addLog(`${selPlayer.displayName}: tüm birimlere +${count}`);
      showStatus(`✓ Tüm birimlere +${count}`);
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };

  // ── Kaynak Ekle/Çıkar ──
  const modifyResource = async (add: boolean) => {
    if (!selPlayer || !playerBase) return;
    const amount = parseInt(resAmount, 10);
    if (isNaN(amount) || amount < 1) { showStatus('Geçersiz miktar'); return; }
    setLoading(true);
    try {
      // Tüm kaynaklar (altın dahil) doğrudan resources array'ine + pendingResources/pendingGold
      const updated = (playerBase.resources ?? []).map((r: any) => {
        if (r.key !== resKey) return r;
        return { ...r, amount: Math.max(0, (r.amount ?? 0) + (add ? amount : -amount)) };
      });
      await db.playerBases().doc(selPlayer.uid).set({ resources: updated, lastSavedAt: Date.now() }, { merge: true });
      // Ayrıca pending'e de yaz (oyuncu aktifse anında alamayabilir)
      if (resKey === 'gold') {
        const cur = playerBase.pendingGold ?? 0;
        await db.playerBases().doc(selPlayer.uid).set({ pendingGold: cur + (add ? amount : -amount) }, { merge: true });
      } else {
        const pending = playerBase.pendingResources ?? { cash: 0, oil: 0, ore: 0 };
        pending[resKey] = (pending[resKey] ?? 0) + (add ? amount : -amount);
        await db.playerBases().doc(selPlayer.uid).set({ pendingResources: pending }, { merge: true });
      }
      setPlayerBase({ ...playerBase, resources: updated });
      addLog(`${selPlayer.displayName}: ${add ? '+' : '-'}${amount} ${resKey}`);
      showStatus(`✓ ${add ? '+' : '-'}${amount} ${resKey}`);
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };

  // ── Ban/Unban ──
  const banPlayer = async () => {
    if (!selPlayer) return;
    setLoading(true);
    try {
      await db.players().doc(selPlayer.uid).set({ banned: true }, { merge: true });
      addLog(`BAN: ${selPlayer.displayName}`);
      showStatus(`✓ ${selPlayer.displayName} banlandı`);
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };
  const unbanPlayer = async () => {
    if (!selPlayer) return;
    setLoading(true);
    try {
      await db.players().doc(selPlayer.uid).set({ banned: false }, { merge: true });
      addLog(`UNBAN: ${selPlayer.displayName}`);
      showStatus(`✓ ${selPlayer.displayName} ban kaldırıldı`);
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };

  // ── Birim Sıfırla ──
  const resetUnits = async () => {
    if (!selPlayer || !playerBase) return;
    setLoading(true);
    try {
      const updated = playerBase.buildings.map((b: any) => ({ ...b, trainedUnits: {} }));
      await db.playerBases().doc(selPlayer.uid).set({ buildings: updated, birlikler: [], lastSavedAt: Date.now() }, { merge: true });
      setPlayerBase({ ...playerBase, buildings: updated, birlikler: [] });
      addLog(`${selPlayer.displayName}: tüm birimler sıfırlandı`);
      showStatus('✓ Birimler sıfırlandı');
    } catch (e: any) { showStatus('Hata: ' + e.message); }
    setLoading(false);
  };

  // ── Render ──
  const renderBtn = (label: string, onPress: () => void, color?: string, disabled?: boolean) => (
    <Pressable style={[s.btn, color ? { backgroundColor: color } : null, disabled && { opacity: 0.4 }]} onPress={onPress} disabled={disabled || loading}>
      <Text style={s.btnText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>⚙️ Admin Paneli</Text>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tab, tab === t.key && s.tabActive]}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.icon} {t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Status */}
      {status ? <View style={s.statusBar}><Text style={s.statusText}>{status}</Text></View> : null}

      {/* ══════════ OYUNCULAR ══════════ */}
      {tab === 'players' && (
        <View>
          <Text style={s.section}>Oyuncu Ara</Text>
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="İsim veya UID" placeholderTextColor={colors.textMuted} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
            {renderBtn('Ara', searchPlayers)}
          </View>

          {players.map(p => (
            <Pressable key={p.uid} style={[s.card, selPlayer?.uid === p.uid && s.cardActive]} onPress={() => selectPlayer(p)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.cardTitle}>{p.displayName} {p.isBot ? '🤖' : ''}</Text>
                <Text style={s.cardSub}>⚡{p.playerPower.toLocaleString()}</Text>
              </View>
              <Text style={s.cardSub}>HQ {p.hqLevel} | W:{p.wins} L:{p.losses} | WP:{p.warPower}</Text>
            </Pressable>
          ))}

          {selPlayer && playerBase && (
            <>
              <Text style={s.section}>📋 {selPlayer.displayName}</Text>

              {/* Bina Özeti */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Binalar</Text>
                {playerBase.buildings?.map((b: any) => {
                  const uc = Object.values(b.trainedUnits ?? {}).reduce((s: number, c: any) => s + (c as number), 0);
                  return <Text key={b.id} style={s.cardSub}>{BUILDING_DEFINITIONS[b.id as BuildingId]?.label ?? b.id} Lv.{b.level}{uc > 0 ? ` (${uc} birim)` : ''}</Text>;
                })}
              </View>

              {/* Kaynak Özeti */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Kaynaklar</Text>
                {(playerBase.resources ?? []).map((r: any) => (
                  <Text key={r.key} style={s.cardSub}>{r.key}: {Math.round(r.amount).toLocaleString()}</Text>
                ))}
              </View>

              {/* Bina Seviye */}
              <Text style={s.section}>Bina Seviyesi Değiştir</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {playerBase.buildings?.map((b: any) => (
                  <Pressable key={b.id} style={[s.chip, buildingId === b.id && s.chipActive]} onPress={() => setBuildingId(b.id)}>
                    <Text style={[s.chipText, buildingId === b.id && s.chipTextActive]}>{BUILDING_DEFINITIONS[b.id as BuildingId]?.label ?? b.id} ({b.level})</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.row}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Yeni seviye" placeholderTextColor={colors.textMuted} value={newLevel} onChangeText={setNewLevel} keyboardType="numeric" />
                {renderBtn('Güncelle', updateBuildingLevel, '#1a5276')}
              </View>

              {/* Birim Ekle */}
              <Text style={s.section}>Birim Ekle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {(['barracks', 'tankFactory', 'airport', 'shipyard', 'hq'] as BuildingId[]).map(bid => (
                  <Pressable key={bid} style={[s.chip, unitBuildingId === bid && s.chipActive]} onPress={() => { setUnitBuildingId(bid); setUnitId(''); }}>
                    <Text style={[s.chipText, unitBuildingId === bid && s.chipTextActive]}>{BUILDING_DEFINITIONS[bid]?.label ?? bid}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {UNIT_DEFINITIONS.filter(u => u.requiredBuildingId === unitBuildingId).map(u => (
                  <Pressable key={u.id} style={[s.chip, unitId === u.id && s.chipActive]} onPress={() => setUnitId(u.id)}>
                    <Text style={[s.chipText, unitId === u.id && s.chipTextActive]}>{u.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.row}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Miktar (10)" placeholderTextColor={colors.textMuted} value={unitCount} onChangeText={setUnitCount} keyboardType="numeric" />
                {renderBtn('Ekle', addUnits, '#1a5276', !unitId)}
                {renderBtn('Tümüne Ekle', addAllUnits, '#6c3483')}
              </View>

              {/* Kaynak Ekle/Çıkar */}
              <Text style={s.section}>Kaynak Ekle / Çıkar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {(['gold', 'cash', 'oil', 'ore'] as const).map(k => (
                  <Pressable key={k} style={[s.chip, resKey === k && s.chipActive]} onPress={() => setResKey(k)}>
                    <Text style={[s.chipText, resKey === k && s.chipTextActive]}>
                      {k === 'gold' ? '🪙 Altın' : k === 'cash' ? '💵 Nakit' : k === 'oil' ? '🛢️ Petrol' : '⛏️ Cevher'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.row}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Miktar" placeholderTextColor={colors.textMuted} value={resAmount} onChangeText={setResAmount} keyboardType="numeric" />
                {renderBtn('+ Ekle', () => modifyResource(true), '#27ae60')}
                {renderBtn('− Çıkar', () => modifyResource(false), '#c0392b')}
              </View>

              {/* Tehlikeli İşlemler */}
              <Text style={s.section}>Tehlikeli İşlemler</Text>
              <View style={s.row}>
                {renderBtn('🚫 Banla', banPlayer, '#8B0000')}
                {renderBtn('✅ Ban Kaldır', unbanPlayer, '#27ae60')}
                {renderBtn('🗑️ Birimleri Sıfırla', resetUnits, '#c0392b')}
              </View>
            </>
          )}
        </View>
      )}

      {/* ══════════ İTTİFAK ══════════ */}
      {tab === 'alliance' && (
        <View>
          <Text style={s.section}>İttifak Yönetimi</Text>
          {renderBtn('🔧 Üye Sayılarını Düzelt', async () => {
            const r = await callCF('fixAllianceCounts');
            showStatus(r.error ? 'Hata' : `✓ ${r.fixed ?? 0} ittifak düzeltildi`);
          }, '#1a5276')}
          <View style={{ height: 8 }} />
          {renderBtn('📊 Güç Sıralaması Güncelle', async () => {
            const r = await callCF('recalcAllPower');
            showStatus(r.error ? 'Hata' : `✓ ${r.updated ?? 0} oyuncu güncellendi`);
          }, '#6c3483')}
        </View>
      )}

      {/* ══════════ BOTLAR ══════════ */}
      {tab === 'bots' && (
        <View>
          <Text style={s.section}>Bot Simülasyonu</Text>
          {renderBtn('🤖 Bot Gelişimi Tetikle (24h sim)', async () => {
            showStatus('Bot simülasyonu başlatılıyor...');
            // simulateBots scheduled function — manual trigger yok, seedBots var
            const r = await callCF('seedBots');
            showStatus(r.error ? 'Hata: ' + r.error : '✓ Botlar güncellendi');
          }, '#1a5276')}
          <View style={{ height: 8 }} />
          {renderBtn('💬 Bot Sohbet Tetikle', async () => {
            const r = await callCF('simulateBotChat');
            showStatus(r.error ? 'Hata' : `✓ ${r.sent ?? 0} mesaj gönderildi`);
          }, '#6c3483')}
          <View style={{ height: 8 }} />
          {renderBtn('🔧 Bot Birim ID Düzelt', async () => {
            const r = await callCF('fixBotUnitIds');
            showStatus(r.error ? 'Hata' : `✓ ${r.fixed ?? 0}/${r.botsChecked ?? 0} bot düzeltildi`);
          }, '#b7950b')}
          <View style={{ height: 8 }} />
          {renderBtn('⚔️ Bot İttifak Savaşı Başlat', async () => {
            const r = await callCF('startBotAllianceWar');
            showStatus(r.error ? 'Hata' : r.started ? `✓ ${r.war}` : `Uygun ittifak yok: ${r.reason ?? ''}`);
          }, '#c0392b')}
          <View style={{ height: 8 }} />
          {renderBtn('🛡️ Bot Saldırı Planı Oluştur (Tümü)', async () => {
            const r = await callCF('createBotAttackPlan', { force: true });
            showStatus(r.error ? 'Hata' : `✓ ${r.planned ?? 0} plan oluşturuldu`);
          }, '#1a5276')}
        </View>
      )}

      {/* ══════════ SAVAŞ ══════════ */}
      {tab === 'wars' && (
        <View>
          <Text style={s.section}>Aktif Savaşlar</Text>
          {renderBtn('📋 Aktif Savaşları Göster', async () => {
            const r = await callCF('debugWars');
            if (r.wars && r.wars.length > 0) {
              const lines = r.wars.map((w: any) => `${w.name} [${w.tag}] vs ${w.war?.enemyName ?? '?'}\nSkor: ${w.war?.ourScore ?? 0} - ${w.war?.theirScore ?? 0}`);
              showStatus(lines.join('\n\n'));
            } else {
              showStatus('Aktif savaş yok');
            }
          }, '#1a5276')}
          <View style={{ height: 8 }} />
          {renderBtn('🔄 Savaş Skorlarını Sıfırla', async () => {
            const r = await callCF('resetWarScores');
            showStatus(r.error ? 'Hata' : `✓ ${r.reset ?? 0} savaş sıfırlandı`);
          }, '#b7950b')}
          <View style={{ height: 8 }} />
          {renderBtn('✅ Biten Savaşları Sonuçlandır', async () => {
            const r = await callCF('resolveAllianceWar');
            showStatus(r.error ? 'Hata' : `✓ ${r.resolved ?? 0} savaş sonuçlandı`);
          }, '#27ae60')}
          <View style={{ height: 8 }} />
          {renderBtn('⚡ Bot Saldırıları Tetikle', async () => {
            const r = await callCF('simulateAllianceWars');
            showStatus(r.error ? 'Hata' : `✓ ${r.executed ?? 0} saldırı yapıldı`);
          }, '#c0392b')}
        </View>
      )}

      {/* ══════════ SUNUCU ══════════ */}
      {tab === 'server' && (
        <View>
          <Text style={s.section}>Sunucu İşlemleri</Text>
          {renderBtn('🔄 Tüm Oyuncuların Gücünü Güncelle', async () => {
            showStatus('Güç hesaplanıyor...');
            try {
              await migratePlayerPower(true);
              showStatus('✓ Tüm playerPower güncellendi');
              addLog('migratePlayerPower: başarılı');
            } catch (e: any) { showStatus('Hata: ' + e.message); }
          }, '#1a5276')}
          <View style={{ height: 8 }} />
          {renderBtn('✂️ Kapasite Aşanları Temizle', async () => {
            showStatus('Kontrol ediliyor...');
            try {
              const r = await enforceUnitCaps((msg) => showStatus(msg));
              showStatus(`✓ ${r.processed}/${r.total} kontrol, ${r.trimmed} kırpıldı`);
              addLog(`enforceUnitCaps: ${r.trimmed} kırpıldı`);
            } catch (e: any) { showStatus('Hata: ' + e.message); }
          }, '#8B0000')}
          <View style={{ height: 8 }} />
          {renderBtn('🧹 Cheater Temizle', async () => {
            const r = await callCF('clearCheaters');
            showStatus(r.error ? 'Hata' : `✓ Temizlik yapıldı`);
          }, '#c0392b')}
          <View style={{ height: 8 }} />
          {renderBtn('📊 Tüm Güçleri Yeniden Hesapla (Cloud)', async () => {
            const r = await callCF('recalcAllPower');
            showStatus(r.error ? 'Hata' : `✓ ${r.updated ?? 0} oyuncu`);
          }, '#6c3483')}
          <View style={{ height: 8 }} />
          {renderBtn('🔍 Oyuncu Denetle', async () => {
            if (!searchText.trim()) { showStatus('Önce isim yaz'); return; }
            const r = await callCF(`${CF}/inspectPlayer`, { name: searchText.trim() });
            if (r.error) { showStatus('Hata: ' + r.error); return; }
            showStatus(`${r.name} | HQ:${r.hqLevel} | Güç:${r.power}\nEnvanter:${r.envanter} | Birlik:${r.birlik} | Toplam:${r.toplam}`);
          }, '#1a5276')}
        </View>
      )}

      {/* ══════════ SOHBET ══════════ */}
      {tab === 'chat' && (
        <View>
          <Text style={s.section}>Genel Sohbet Yönetimi</Text>
          {renderBtn('🗑️ Tüm Mesajları Temizle', async () => {
            setLoading(true);
            try {
              const snap = await db.globalChat().limit(500).get();
              let deleted = 0;
              for (const doc of snap.docs) { await db.globalChat().doc(doc.id).delete(); deleted++; }
              showStatus(`✓ ${deleted} mesaj silindi`);
              addLog(`globalChat: ${deleted} mesaj silindi`);
            } catch (e: any) { showStatus('Hata: ' + e.message); }
            setLoading(false);
          }, '#c0392b')}
          <View style={{ height: 12 }} />
          <Text style={s.section}>Sistem Mesajı Gönder</Text>
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Mesaj yaz..." placeholderTextColor={colors.textMuted} value={sysMsg} onChangeText={setSysMsg} />
            {renderBtn('Gönder', async () => {
              if (!sysMsg.trim()) return;
              try {
                await db.globalChat().add({
                  senderUid: 'system', senderName: '⚙️ Sistem', allianceTag: null,
                  text: sysMsg.trim(), isQuestion: false, timestamp: Date.now(),
                });
                showStatus('✓ Mesaj gönderildi');
                setSysMsg('');
              } catch (e: any) { showStatus('Hata: ' + e.message); }
            }, '#27ae60')}
          </View>
        </View>
      )}

      {/* ── İşlem Logu ── */}
      {log ? (
        <View style={s.logBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={s.section}>İşlem Logu</Text>
            <Pressable onPress={() => setLog('')}><Text style={{ color: colors.textMuted, fontSize: 11 }}>Temizle</Text></Pressable>
          </View>
          <Text style={s.logText}>{log}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 60 },
  title: { color: colors.sand, fontSize: 20, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
  section: { color: colors.sand, fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10,
    color: '#fff', fontSize: 14, minWidth: 80,
  },
  btn: {
    backgroundColor: colors.military, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tab: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
  },
  tabActive: { backgroundColor: colors.military, borderColor: colors.sand },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 8, padding: 10, marginBottom: 6,
  },
  cardActive: { borderColor: colors.sand, backgroundColor: colors.militaryDark },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub: { color: colors.textMuted, fontSize: 11, marginBottom: 1 },
  chip: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 4,
  },
  chipActive: { backgroundColor: colors.military, borderColor: colors.sand },
  chipText: { color: colors.textMuted, fontSize: 11 },
  chipTextActive: { color: '#fff' },
  statusBar: {
    backgroundColor: '#1a3c2a', borderRadius: 6, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#27ae60',
  },
  statusText: { color: '#27ae60', fontSize: 12, fontWeight: '600' },
  logBox: {
    marginTop: 16, backgroundColor: colors.surface, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.panelBorder, maxHeight: 200,
  },
  logText: { color: colors.textMuted, fontSize: 10, fontFamily: 'monospace' },
});
