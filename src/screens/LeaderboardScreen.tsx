import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { t } from '../i18n';
import { MilitaryPanel } from '../components/MilitaryPanel';
import { ActionButton } from '../components/ActionButton';
import { colors } from '../theme/colors';
import { formatNumber } from '../utils/formatters';
import { useDesertGame } from '../state/DesertGameContext';
import { db } from '../services/firebase';
import { UNIT_MAP, getUnitLabel } from '../data/units';
import { calcMarchCost } from '../state/combatResolvers';
import { UnitImage } from '../components/UnitImage';
import type { MarchUnit } from '../state/types';

type Entry = {
  rank: number;
  uid: string;
  name: string;
  allianceTag: string;
  power: number;
  warPower: number;
  hqLevel: number;
  wins: number;
  losses: number;
  isMe: boolean;
};

export function LeaderboardScreen({ onOpenDM }: { onOpenDM?: (otherUid: string, otherName: string) => void } = {}) {
  const {
    uid,
    birlikler,
    activeMarch,
    attackPvPTarget,
    getPvPCooldown,
    revengeTargets,
    alliance,
    shieldUntil,
    canAfford,
  } = useDesertGame();

  const [tab, setTab] = useState<'players' | 'alliances'>('players');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [allianceEntries, setAllianceEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allianceLoading, setAllianceLoading] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [phase, setPhase] = useState<'info' | 'attack'>('info');
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [expandedBirlikId, setExpandedBirlikId] = useState<string | null>(null);

  // Cooldown timer — seçili oyuncu için her saniye güncelle
  useEffect(() => {
    if (!selected) { setCooldownLeft(0); return; }
    const update = () => setCooldownLeft(getPvPCooldown(selected.uid));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [selected, getPvPCooldown]);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
        const snap = await Promise.race([db.players().limit(200).get(), timeout]);
        if (cancelled) return;
        const list: Entry[] = snap.docs.map((doc: any) => {
          const d = doc.data();
          return {
            rank: 0,
            uid: doc.id,
            name: d.displayName ?? t('leaderboard.anonymous'),
            allianceTag: d.allianceTag || '',
            power: d.playerPower || 0,
            warPower: d.warPower || 0,
            hqLevel: d.hqLevel || 1,
            wins: d.wins || 0,
            losses: d.losses || 0,
            isMe: doc.id === uid,
          };
        });
        list.sort((a, b) => b.power - a.power);
        // Rank ata
        const ranked = list.map((e, i) => ({ ...e, rank: i + 1 }));
        const myRank = ranked.find(e => e.isMe)?.rank ?? 0;

        if (myRank <= 100 || myRank === 0) {
          // Top 100'deyse sadece top 100 göster
          setEntries(ranked.slice(0, 100));
        } else {
          // Top 100 + ayırıcı + kendi bölgesi (±10)
          const top100 = ranked.slice(0, 100);
          const regionStart = Math.max(100, myRank - 11); // top100 ile çakışmasın
          const regionEnd = Math.min(ranked.length, myRank + 10);
          const myRegion = ranked.slice(regionStart, regionEnd);
          // Ayırıcı marker
          const separator = { rank: -1, uid: '__sep__', name: '', allianceTag: '', power: 0, warPower: 0, hqLevel: 0, wins: 0, losses: 0, isMe: false } as any;
          setEntries([...top100, separator, ...myRegion]);
        }
      } catch (err) {
        console.warn('[Leaderboard]', err);
      }
      setLoading(false);
    }
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid]);

  // İttifak sıralaması
  useEffect(() => {
    if (tab !== 'alliances') return;
    let cancelled = false;
    async function fetchAlliances() {
      setAllianceLoading(true);
      try {
        const snap = await db.alliances().orderBy('totalPower', 'desc').limit(50).get();
        if (cancelled) return;
        const list = snap.docs.map((doc: any, i: number) => {
          const d = doc.data();
          return {
            id: doc.id,
            rank: i + 1,
            tag: d.tag ?? '',
            name: d.name ?? t('leaderboard.unnamedAlliance'),
            memberCount: d.memberCount ?? 0,
            maxMembers: d.maxMembers ?? 30,
            totalPower: d.totalPower ?? 0,
            leaderName: d.leaderName ?? '',
          };
        });
        setAllianceEntries(list);
      } catch (err) {
        console.warn('[AllianceLeaderboard]', err);
      }
      setAllianceLoading(false);
    }
    fetchAlliances();
    return () => { cancelled = true; };
  }, [tab]);

  /** Seçilen birliklerden toplam birim ve güç hesabı */
  const selectedBirlikler = useMemo(
    () => birlikler.filter(b => selectedBirlikIds.has(b.id)),
    [birlikler, selectedBirlikIds],
  );

  const birlikTotal = useMemo(
    () => selectedBirlikler.reduce((sum, bl) => sum + bl.slots.reduce((a, s) => a + s.count, 0), 0),
    [selectedBirlikler],
  );

  const birlikPower = useMemo(() => {
    let power = 0;
    for (const bl of selectedBirlikler) {
      for (const slot of bl.slots) {
        const def = UNIT_MAP[slot.unitId];
        if (def) power += slot.count * def.attackPower;
      }
    }
    return power;
  }, [selectedBirlikler]);

  const marchCost = useMemo(() => {
    const units = selectedBirlikler.flatMap(bl =>
      bl.slots.map(s => ({ unitId: s.unitId, count: s.count })),
    );
    return calcMarchCost(units, UNIT_MAP);
  }, [selectedBirlikler]);

  const canAffordMarch = useMemo(() => {
    return canAfford(marchCost.cash, marchCost.oil, marchCost.ore);
  }, [marchCost, canAfford]);

  const openPlayer = (p: Entry) => {
    setSelected(p);
    setPhase('info');
    setSelectedBirlikIds(new Set());
  };

  const closeModal = () => {
    setSelected(null);
    setPhase('info');
    setSelectedBirlikIds(new Set());
  };

  const handleAttack = () => {
    if (!selected || birlikTotal < 1) return;
    const marchUnits: MarchUnit[] = selectedBirlikler.flatMap(bl =>
      bl.slots.map(s => ({ unitId: s.unitId, count: s.count, buildingId: s.buildingId })),
    );
    const enemyTag = alliance?.myAllianceData?.activeWar?.enemyTag;
    const isWarTarget = !!enemyTag && selected.allianceTag === enemyTag;
    attackPvPTarget(
      {
        uid: selected.uid,
        displayName: selected.name,
        warPower: selected.warPower,
        hqLevel: selected.hqLevel,
        wins: selected.wins,
        allianceTag: selected.allianceTag,
        shieldUntil: 0,
      },
      birlikTotal,
      marchUnits,
      isWarTarget,
    );
    closeModal();
  };

  return (
    <View style={s.root}>
      {/* Tab Butonları */}
      <View style={s.tabRow}>
        <Pressable style={[s.tabBtn, tab === 'players' && s.tabBtnActive]} onPress={() => setTab('players')}>
          <Text style={[s.tabBtnText, tab === 'players' && s.tabBtnTextActive]}>{t('leaderboard.tabPlayers')}</Text>
        </Pressable>
        <Pressable style={[s.tabBtn, tab === 'alliances' && s.tabBtnActive]} onPress={() => setTab('alliances')}>
          <Text style={[s.tabBtnText, tab === 'alliances' && s.tabBtnTextActive]}>{t('leaderboard.tabAlliances')}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {tab === 'alliances' ? (
          <MilitaryPanel title={t('leaderboard.panelAlliances')} accent>
            {allianceLoading ? (
              <ActivityIndicator color={colors.sand} style={{ padding: 20 }} />
            ) : allianceEntries.length === 0 ? (
              <Text style={s.empty}>{t('leaderboard.emptyAlliances')}</Text>
            ) : (
              allianceEntries.map(a => (
                <View key={a.id} style={s.row}>
                  <Text style={[s.rank, a.rank <= 3 && s.rankTop]}>
                    {a.rank === 1 ? '🥇' : a.rank === 2 ? '🥈' : a.rank === 3 ? '🥉' : `#${a.rank}`}
                  </Text>
                  <View style={s.info}>
                    <Text style={s.name}>
                      <Text style={s.allianceTagInline}>[{a.tag}]</Text> {a.name}
                    </Text>
                    <Text style={s.allianceSub}>👑 {a.leaderName} · 👥 {a.memberCount}/{a.maxMembers}</Text>
                  </View>
                  <View style={s.statsCol}>
                    <Text style={s.power}>⚡ {formatNumber(a.totalPower)}</Text>
                  </View>
                </View>
              ))
            )}
          </MilitaryPanel>
        ) : (
        <MilitaryPanel title={t('leaderboard.panelPlayers')} accent>
          {loading ? (
            <ActivityIndicator color={colors.sand} style={{ padding: 20 }} />
          ) : entries.length === 0 ? (
            <Text style={s.empty}>{t('leaderboard.emptyPlayers')}</Text>
          ) : (
            entries.map(p => {
              if (p.uid === '__sep__') {
                return (
                  <View key="__sep__" style={{ paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.panelBorder, marginVertical: 4 }}>
                    <Text style={{ color: colors.sand, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{t('leaderboard.separator')}</Text>
                  </View>
                );
              }
              const myRank = entries.find(e => e.isMe)?.rank ?? 0;
              const inRange = myRank > 0 && Math.abs(p.rank - myRank) <= 5 && !p.isMe;
              const hasRevenge = !!revengeTargets[p.uid];
              // İttifak savaşı düşmanı ise ±5 kuralını bypass et
              const enemyAllianceId = alliance?.myAllianceData?.activeWar?.enemyAllianceId;
              const isWarEnemy = !!enemyAllianceId && p.allianceTag && alliance?.myAllianceData?.activeWar?.enemyTag === p.allianceTag;
              // Aynı ittifak üyesine saldırı engelle
              const myAllianceTag = alliance?.myAllianceData?.tag;
              const isSameAlliance = !!myAllianceTag && p.allianceTag === myAllianceTag && !p.isMe;
              const canTarget = !isSameAlliance && (inRange || hasRevenge || isWarEnemy);
              return (
                <Pressable
                  key={p.uid}
                  onPress={() => !p.isMe && openPlayer({ ...p, _canTarget: canTarget } as any)}
                  style={[s.row, p.isMe && s.rowMe, !canTarget && !p.isMe && { opacity: 0.4 }]}
                >
                  <Text style={[s.rank, p.rank <= 3 && s.rankTop]}>
                    {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                  </Text>
                  <View style={s.info}>
                    <Text style={[s.name, p.isMe && s.nameMe]}>
                      {p.name}{p.isMe ? t('leaderboard.me') : ''}{hasRevenge ? ' 🔥' : ''}{isWarEnemy ? ' ⚔️' : ''}
                    </Text>
                  </View>
                  {p.allianceTag ? (
                    <Text style={s.allianceTag}>[{p.allianceTag}]</Text>
                  ) : null}
                  <View style={s.statsCol}>
                    <Text style={s.power}>⚡ {formatNumber(p.power)}</Text>
                    <Text style={s.winsLosses}>🏆 {p.wins} · 💀 {p.losses}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </MilitaryPanel>
        )}
      </ScrollView>

      {/* ─── Oyuncu Detay / Saldırı Modal ─── */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={s.overlay} onPress={closeModal}>
          <Pressable style={s.modal} onPress={() => {}}>
            {selected && phase === 'info' && (
              <>
                {/* Profil Kartı */}
                <View style={s.profileCard}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {selected.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.playerName}>{selected.name}</Text>
                </View>

                {/* İstatistikler */}
                <MilitaryPanel title={t('leaderboard.stats')}>
                  <View style={s.statsGrid}>
                    <View style={s.statBox}>
                      <Text style={s.statValue}>⚡ {formatNumber(selected.power)}</Text>
                      <Text style={s.statLabel}>{t('leaderboard.power')}</Text>
                    </View>
                    <View style={s.statBox}>
                      <Text style={s.statValue}>🏠 Lv.{selected.hqLevel}</Text>
                      <Text style={s.statLabel}>{t('leaderboard.hq')}</Text>
                    </View>
                    <View style={s.statBox}>
                      <Text style={s.statValue}>🏆 {selected.wins}</Text>
                      <Text style={s.statLabel}>{t('leaderboard.wins')}</Text>
                    </View>
                    <View style={s.statBox}>
                      <Text style={s.statValue}>💀 {selected.losses}</Text>
                      <Text style={s.statLabel}>{t('leaderboard.losses')}</Text>
                    </View>
                  </View>
                </MilitaryPanel>

                {/* Saldır Butonu */}
                <View style={s.actionSection}>
                  {(selected as any)._canTarget && (
                    cooldownLeft > 0 ? (
                      <ActionButton
                        label={t('leaderboard.cooldown', { hours: Math.floor(cooldownLeft / 3600), minutes: Math.floor((cooldownLeft % 3600) / 60), seconds: cooldownLeft % 60 })}
                        disabled
                        onPress={() => {}}
                      />
                    ) : (
                      <ActionButton
                        label={activeMarch ? t('leaderboard.marchInProgress') : revengeTargets[selected.uid] ? t('leaderboard.revenge') : t('leaderboard.attack')}
                        disabled={!!activeMarch}
                        onPress={() => setPhase('attack')}
                      />
                    )
                  )}
                  {onOpenDM && selected.uid !== uid && (
                    <ActionButton
                      label={`✉️ ${t('dm.sendMessage')}`}
                      onPress={() => { closeModal(); onOpenDM(selected.uid, selected.name); }}
                      variant="secondary"
                    />
                  )}
                  <ActionButton label={t('leaderboard.close')} onPress={closeModal} variant="secondary" />
                </View>
              </>
            )}

            {selected && phase === 'attack' && (
              <ScrollView>
                {/* Saldırı Başlığı */}
                <View style={s.attackHeader}>
                  <Text style={s.attackTitle}>{t('leaderboard.attackTitle')}</Text>
                  <Pressable onPress={closeModal} style={s.closeBtn}>
                    <Text style={s.closeBtnText}>✕</Text>
                  </Pressable>
                </View>

                <View style={s.attackTargetInfo}>
                  <Text style={s.attackTargetName}>{selected.name}</Text>
                  <Text style={s.attackTargetSub}>
                    ⚡ {formatNumber(selected.warPower)} · 🏠 Lv.{selected.hqLevel} · 🏆 {t('leaderboard.winsCount', { wins: selected.wins })}
                  </Text>
                </View>

                {birlikler.length === 0 ? (
                  <View style={s.noUnitsBox}>
                    <Text style={s.noUnitsIcon}>⚠️</Text>
                    <Text style={s.noUnitsTitle}>{t('leaderboard.noUnitsTitle')}</Text>
                    <Text style={s.noUnitsDesc}>{t('leaderboard.noUnitsDesc')}</Text>
                    <ActionButton label={t('leaderboard.back')} onPress={() => setPhase('info')} variant="secondary" />
                  </View>
                ) : (
                  <>
                    {/* Birlik Seçimi */}
                    <View style={s.birlikSectionHeader}>
                      <Text style={s.birlikSectionTitle}>{t('leaderboard.selectSquad', { selected: selectedBirlikler.length, total: birlikler.length })}</Text>
                      <Pressable onPress={() => {
                        if (selectedBirlikIds.size === birlikler.length) {
                          setSelectedBirlikIds(new Set());
                        } else {
                          setSelectedBirlikIds(new Set(birlikler.map(b => b.id)));
                        }
                      }}>
                        <Text style={s.selectAllBtn}>
                          {selectedBirlikIds.size === birlikler.length ? t('leaderboard.clear') : t('leaderboard.selectAll')}
                        </Text>
                      </Pressable>
                    </View>

                    {birlikler.map(bl => {
                      const blTotal = bl.slots.reduce((a, s) => a + s.count, 0);
                      const blPower = bl.slots.reduce((sum, slot) => {
                        const def = UNIT_MAP[slot.unitId];
                        return sum + (def ? slot.count * def.attackPower : 0);
                      }, 0);
                      const isSel = selectedBirlikIds.has(bl.id);
                      return (
                        <Pressable
                          key={bl.id}
                          style={[s.birlikCard, isSel && s.birlikCardSel]}
                          onPress={() => setSelectedBirlikIds(prev => {
                            const next = new Set(prev);
                            if (isSel) next.delete(bl.id); else next.add(bl.id);
                            return next;
                          })}
                        >
                          <View style={s.birlikCardTop}>
                            <Text style={[s.birlikName, isSel && s.birlikNameSel]}>{bl.name}</Text>
                            <Text style={[s.birlikCheck, isSel && s.birlikCheckSel]}>
                              {isSel ? '✓' : '○'}
                            </Text>
                          </View>
                          {/* Dal bazlı özet */}
                          {(() => {
                            const branches: Record<string, { label: string; icon: string; count: number }> = {};
                            const branchMap: Record<string, [string, string]> = {
                              barracks: [t('common.land'), '🪖'], tankFactory: [t('common.land'), '🪖'],
                              airport: [t('common.air'), '✈️'], shipyard: [t('common.sea'), '⚓'],
                              defenseTower: [t('common.defense'), '🛡️'], hq: [t('common.defense'), '🛡️'],
                            };
                            for (const slot of bl.slots) {
                              const [label, icon] = branchMap[slot.buildingId] ?? ['Diğer', '❓'];
                              if (!branches[label]) branches[label] = { label, icon, count: 0 };
                              branches[label].count += slot.count;
                            }
                            return (
                              <View style={s.birlikBranchRow}>
                                {Object.values(branches).map(b => (
                                  <Text key={b.label} style={s.birlikBranchChip}>
                                    {b.icon} {b.label}: {b.count}
                                  </Text>
                                ))}
                              </View>
                            );
                          })()}
                          <View style={s.birlikStatsRow}>
                            <Text style={s.birlikStat}>{t('leaderboard.unitsChip', { count: blTotal })}</Text>
                            <Text style={s.birlikStat}>{t('leaderboard.powerChip', { power: blPower })}</Text>
                            <Pressable onPress={(e) => { e.stopPropagation?.(); setExpandedBirlikId(prev => prev === bl.id ? null : bl.id); }}>
                              <Text style={{ color: colors.sand, fontSize: 11 }}>
                                {expandedBirlikId === bl.id ? t('leaderboard.hide') : t('leaderboard.detail')}
                              </Text>
                            </Pressable>
                          </View>
                          {/* Resimli detay */}
                          {expandedBirlikId === bl.id && (
                            <View style={s.birlikDetailList}>
                              {bl.slots.map(slot => {
                                const def = UNIT_MAP[slot.unitId];
                                return (
                                  <View key={slot.unitId} style={s.birlikDetailRow}>
                                    {def?.imageUri ? (
                                      <UnitImage unitId={slot.unitId} uri={def.imageUri} icon={def?.icon ?? '?'} style={s.birlikDetailImg} />
                                    ) : (
                                      <Text style={{ fontSize: 18 }}>{def?.icon ?? '?'}</Text>
                                    )}
                                    <Text style={s.birlikDetailName} numberOfLines={1}>{getUnitLabel(def, slot.unitId)}</Text>
                                    <Text style={s.birlikDetailCount}>×{slot.count}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}

                    {/* Saldırı Özeti */}
                    <View style={s.attackSummary}>
                      <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>{t('leaderboard.summarySquads', { count: selectedBirlikler.length })}</Text>
                        <Text style={s.summaryLabel}>{t('leaderboard.summaryUnits', { count: birlikTotal })}</Text>
                        <Text style={s.summaryPower}>⚔️ {birlikPower}</Text>
                      </View>
                      {birlikTotal > 0 && (
                        <>
                          <View style={[s.summaryRow, { marginTop: 4 }]}>
                            <Text style={[s.summaryLabel, !canAffordMarch && { color: colors.danger }]}>
                              Sefer: 💵{formatNumber(marchCost.cash)} 🛢️{formatNumber(marchCost.oil)} ⛏️{formatNumber(marchCost.ore)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    <View style={s.attackActions}>
                      <ActionButton
                        label={Date.now() < shieldUntil ? t('shop.shieldAttackBlockedTitle') : cooldownLeft > 0 ? t('leaderboard.cooldownShort', { hours: Math.floor(cooldownLeft / 3600), minutes: Math.floor((cooldownLeft % 3600) / 60) }) : activeMarch ? t('leaderboard.marchInProgress') : birlikTotal < 1 ? t('leaderboard.selectSquadBtn') : !canAffordMarch ? 'Yetersiz Kaynak' : t('leaderboard.attackWithUnits', { count: birlikTotal })}
                        disabled={!!activeMarch || birlikTotal < 1 || cooldownLeft > 0 || Date.now() < shieldUntil || !canAffordMarch}
                        onPress={handleAttack}
                      />
                      <ActionButton label={t('leaderboard.back')} onPress={() => setPhase('info')} variant="secondary" />
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 10 },
  tabRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.panelBorder, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.sand, borderColor: colors.sand },
  tabBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  tabBtnTextActive: { color: colors.background },
  allianceTagInline: { color: colors.militaryLight, fontSize: 13, fontWeight: '700' },
  allianceSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 20, fontSize: 13 },

  /* List rows */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  rowMe: { backgroundColor: 'rgba(196,164,85,0.12)', borderRadius: 6 },
  rank: { minWidth: 36, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  rankTop: { fontSize: 18 },
  info: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  nameMe: { color: colors.sand },
  allianceTag: { color: colors.militaryLight, fontSize: 11, fontWeight: '600', marginHorizontal: 8 },
  statsCol: { alignItems: 'flex-end' },
  power: { color: colors.success, fontSize: 13, fontWeight: '700' },
  wins: { color: colors.sand, fontSize: 11, marginTop: 2 },
  winsLosses: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },

  /* Modal overlay */
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    width: '100%', maxWidth: 360, maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: 12, borderWidth: 1, borderColor: colors.panelBorder,
    overflow: 'hidden',
  },

  /* Profile card */
  profileCard: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.military, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: colors.sand,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  playerName: { color: colors.sand, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  uid: { color: colors.textMuted, fontSize: 10, marginTop: 4 },

  /* Stats grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1, minWidth: '40%' as any, backgroundColor: colors.surfaceAlt,
    borderRadius: 4, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  statValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4 },

  /* Action section (info phase) */
  actionSection: { padding: 16, gap: 8 },

  /* ─── Attack phase ─── */
  attackHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 8,
  },
  attackTitle: { color: colors.sand, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 4 },
  closeBtnText: { color: colors.textSecondary, fontSize: 18 },

  attackTargetInfo: {
    gap: 2, paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
  },
  attackTargetName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  attackTargetSub: { color: colors.textSecondary, fontSize: 12 },

  /* No units */
  noUnitsBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 8 },
  noUnitsIcon: { fontSize: 32 },
  noUnitsTitle: { color: colors.sand, fontSize: 16, fontWeight: '700' },
  noUnitsDesc: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  /* Birlik section */
  birlikSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  birlikSectionTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  selectAllBtn: { color: colors.sand, fontSize: 12, fontWeight: '700' },

  birlikCard: {
    marginHorizontal: 16, marginBottom: 8, padding: 12,
    backgroundColor: colors.surface, borderRadius: 6,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  birlikCardSel: {
    borderColor: colors.sand, backgroundColor: 'rgba(196,164,85,0.08)',
  },
  birlikCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  birlikName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  birlikNameSel: { color: colors.sand },
  birlikCheck: { color: colors.textMuted, fontSize: 18 },
  birlikCheckSel: { color: colors.sand },

  birlikSlotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  birlikSlotChip: {
    color: colors.textSecondary, fontSize: 11,
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 3, overflow: 'hidden',
  },
  birlikBranchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  birlikBranchChip: {
    color: colors.textPrimary, fontSize: 12, fontWeight: '600',
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, overflow: 'hidden',
  },
  birlikDetailList: { marginTop: 6, gap: 4 },
  birlikDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  birlikDetailImg: { width: 32, height: 32, borderRadius: 4 },
  birlikDetailName: { flex: 1, color: colors.textSecondary, fontSize: 12 },
  birlikDetailCount: { color: colors.sand, fontSize: 13, fontWeight: '700' },

  birlikStatsRow: { flexDirection: 'row', gap: 12, marginTop: 2, alignItems: 'center' },
  birlikStat: { color: colors.textMuted, fontSize: 11 },

  /* Attack summary */
  attackSummary: {
    backgroundColor: colors.surfaceAlt, borderRadius: 3, padding: 10, gap: 4,
    marginHorizontal: 16, marginTop: 8,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.textSecondary, fontSize: 12 },
  summaryPower: { color: colors.sand, fontSize: 13, fontWeight: '700' },
  summaryChance: { fontSize: 14, fontWeight: '900' },

  attackActions: { padding: 16, gap: 8 },
});
