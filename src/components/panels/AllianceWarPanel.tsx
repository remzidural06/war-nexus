import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/formatters';
import { styles } from '../../screens/AllianceScreen.styles';
import type { AllianceWar, AllianceData, AllianceMemberData, Birlik } from '../../state/types';

interface WarTabProps {
  activeWar: AllianceWar | null;
  myAllianceName: string;
  myRank: string | null;
  myAllianceId: string | null;
  warBattleLogs: any[];
  onDeclareWar: (enemyId: string) => Promise<boolean>;
  onGetEnemyMembers: () => Promise<AllianceMemberData[]>;
  getAllianceRankings: () => Promise<AllianceData[]>;
  birlikler: Birlik[];
  activeMarch: any;
  attackPvPTarget: any;
  getPvPCooldown: (uid: string) => number;
}

export function WarTab({ activeWar, myAllianceName, myRank, myAllianceId, warBattleLogs, onDeclareWar, onGetEnemyMembers, getAllianceRankings, birlikler, activeMarch, attackPvPTarget, getPvPCooldown }: WarTabProps) {
  const [targets, setTargets] = useState<AllianceData[]>([]);
  const [enemyMembers, setEnemyMembers] = useState<AllianceMemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [warError, setWarError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [attackTarget, setAttackTarget] = useState<AllianceMemberData | null>(null);
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const isLeaderOrOfficer = myRank === 'leader' || myRank === 'officer';

  useEffect(() => {
    if (!attackTarget) { setCooldownLeft(0); return; }
    const update = () => setCooldownLeft(getPvPCooldown(attackTarget.uid));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [attackTarget, getPvPCooldown]);

  useEffect(() => {
    if (!activeWar) { setTimeLeft(''); return; }
    const tick = () => {
      const remaining = activeWar.endsAt - Date.now();
      if (remaining <= 0) { setTimeLeft('Sona erdi'); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(t('alliance.cooldownLabel', { h: String(h), m: String(m), s: String(s) }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeWar]);

  useEffect(() => {
    if (!activeWar) return;
    onGetEnemyMembers().then(setEnemyMembers);
  }, [activeWar, onGetEnemyMembers]);

  const selectedBirlikler = birlikler.filter(b => selectedBirlikIds.has(b.id));
  const birlikTotal = selectedBirlikler.reduce((sum, bl) => sum + bl.slots.reduce((a, s) => a + s.count, 0), 0);

  function handleAttack() {
    if (!attackTarget || birlikTotal < 1) return;
    const marchUnits = selectedBirlikler.flatMap(bl =>
      bl.slots.map(s => ({ unitId: s.unitId, count: s.count, buildingId: s.buildingId })),
    );
    attackPvPTarget(
      { uid: attackTarget.uid, displayName: attackTarget.displayName, warPower: attackTarget.power, hqLevel: 1, wins: 0, allianceTag: '', shieldUntil: 0 },
      birlikTotal,
      marchUnits,
      true,
    );
    setAttackTarget(null);
    setSelectedBirlikIds(new Set());
  }

  async function loadTargets() {
    setLoading(true);
    const all = await getAllianceRankings();
    setTargets(all.filter(a => !a.activeWar && a.id !== myAllianceId));
    setLoading(false);
  }

  async function handleDeclare(enemyId: string) {
    const msg = 'Bu ittifağa savaş ilan etmek istediğine emin misin?';
    let confirmed = false;
    if (typeof window !== 'undefined' && window.confirm) {
      confirmed = window.confirm(msg);
    } else {
      confirmed = await new Promise(resolve => {
        Alert.alert(t('alliance.declareConfirmTitle'), msg, [
          { text: 'İptal', onPress: () => resolve(false) },
          { text: 'İlan Et', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
    }
    if (!confirmed) return;
    setLoading(true);
    setWarError(null);
    const ok = await onDeclareWar(enemyId);
    if (!ok) setWarError(t('alliance.errorDeclare'));
    setLoading(false);
  }

  if (activeWar) {
    const total = activeWar.ourScore + activeWar.theirScore;
    const ourPct = total > 0 ? Math.round((activeWar.ourScore / total) * 100) : 50;
    return (
      <>
      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        <View style={styles.warHeader}>
          <Text style={styles.warTitle}>{t('alliance.activeWar')}</Text>
          <Text style={styles.warEnemy}>[{activeWar.enemyTag}] {activeWar.enemyName}</Text>
          <Text style={styles.warTimer}>⏱️ {timeLeft}</Text>
        </View>

        <View style={styles.warScoreRow}>
          <View style={styles.warScoreBlock}>
            <Text style={styles.warScoreLabel}>{myAllianceName}</Text>
            <Text style={[styles.warScoreValue, { color: colors.success }]}>{formatNumber(activeWar.ourScore)}</Text>
          </View>
          <Text style={styles.warVs}>VS</Text>
          <View style={styles.warScoreBlock}>
            <Text style={styles.warScoreLabel}>{activeWar.enemyName}</Text>
            <Text style={[styles.warScoreValue, { color: colors.danger }]}>{formatNumber(activeWar.theirScore)}</Text>
          </View>
        </View>

        <View style={styles.warBar}>
          <View style={[styles.warBarFill, { width: `${ourPct}%`, backgroundColor: colors.success }]} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('alliance.enemyMembers', { count: String(enemyMembers.length) })}</Text>
        {enemyMembers.map(m => (
          <Pressable key={m.uid} style={[styles.memberCard, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => { setAttackTarget(m); setSelectedBirlikIds(new Set()); }}>
            <View style={[styles.memberInfo, { flex: 1 }]}>
              <Text style={styles.memberName}>{m.displayName}</Text>
              <Text style={styles.memberStat}>{t('common.power')}: {formatNumber(m.power)}</Text>
            </View>
            <Pressable style={styles.warAttackBtn} onPress={() => { setAttackTarget(m); setSelectedBirlikIds(new Set()); }}>
              <Text style={styles.warAttackBtnText}>{t('alliance.attackBtn')}</Text>
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!attackTarget} transparent animationType="fade" onRequestClose={() => setAttackTarget(null)}>
        <Pressable style={styles.warModalOverlay} onPress={() => setAttackTarget(null)}>
          <Pressable style={styles.warModal} onPress={() => {}}>
            {attackTarget && (
              <ScrollView>
                <View style={styles.warModalHeader}>
                  <Text style={styles.warModalTitle}>{t('map.attackTitle')}</Text>
                  <Pressable onPress={() => setAttackTarget(null)}><Text style={styles.warModalClose}>✕</Text></Pressable>
                </View>
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={styles.warModalName}>{attackTarget.displayName}</Text>
                  <Text style={styles.memberStat}>{t('common.power')}: {formatNumber(attackTarget.power)}</Text>
                </View>

                {cooldownLeft > 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: colors.warning, fontSize: 14, fontWeight: '700' }}>
                      {t('alliance.cooldownLabel', { h: String(Math.floor(cooldownLeft / 3600)), m: String(Math.floor((cooldownLeft % 3600) / 60)), s: String(cooldownLeft % 60) })}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{t('alliance.cooldownDesc')}</Text>
                  </View>
                ) : activeMarch ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('alliance.marchInProgress')}</Text>
                  </View>
                ) : birlikler.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: colors.warning, fontSize: 13 }}>{t('alliance.noSquadsWarning')}</Text>
                  </View>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginTop: 8 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{t('alliance.selectSquad', { selected: String(selectedBirlikler.length), total: String(birlikler.length) })}</Text>
                      <Pressable onPress={() => setSelectedBirlikIds(prev => prev.size === birlikler.length ? new Set() : new Set(birlikler.map(b => b.id)))}>
                        <Text style={{ color: colors.sand, fontSize: 12 }}>{selectedBirlikIds.size === birlikler.length ? t('alliance.clear') : t('alliance.selectAll')}</Text>
                      </Pressable>
                    </View>
                    {birlikler.map(bl => {
                      const isSel = selectedBirlikIds.has(bl.id);
                      const blTotal = bl.slots.reduce((a, s) => a + s.count, 0);
                      return (
                        <Pressable key={bl.id} style={[styles.warBirlikCard, isSel && styles.warBirlikCardSel]}
                          onPress={() => setSelectedBirlikIds(prev => { const n = new Set(prev); if (isSel) n.delete(bl.id); else n.add(bl.id); return n; })}>
                          <Text style={{ color: isSel ? colors.sand : colors.textPrimary, fontSize: 13, fontWeight: '700', flex: 1 }}>{bl.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{blTotal} {t('common.units')}</Text>
                          <Text style={{ color: isSel ? colors.sand : colors.textMuted, fontSize: 14, marginLeft: 8 }}>{isSel ? '✓' : '○'}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      style={[styles.warDeclareBtn, birlikTotal < 1 && { opacity: 0.4 }]}
                      disabled={birlikTotal < 1}
                      onPress={handleAttack}
                    >
                      <Text style={styles.warDeclareBtnText}>{t('alliance.attackWithUnits', { count: String(birlikTotal) })}</Text>
                    </Pressable>
                  </>
                )}
                <Pressable style={{ padding: 12, alignItems: 'center' }} onPress={() => setAttackTarget(null)}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('common.close')}</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      </>
    );
  }

  // Savaş yok — ilan et
  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
      <View style={styles.warHeader}>
        <Text style={styles.warTitle}>{t('alliance.allianceWar')}</Text>
        <Text style={styles.warDesc}>{t('alliance.warDesc')}</Text>
        <Text style={styles.warDesc}>🏆 Ödül: 50K 💵 + 50K 🛢️ + 50K ⛏️ + 100 🪙 + 2000 ⚡{'\n'}🌟 MVP: +250 🪙</Text>
      </View>

      {isLeaderOrOfficer ? (
        <>
          {warError && <Text style={{ color: '#ff4444', textAlign: 'center', marginVertical: 8, fontSize: 13 }}>{warError}</Text>}
          {targets.length === 0 && !loading && (
            <Pressable style={styles.warDeclareBtn} onPress={loadTargets}>
              <Text style={styles.warDeclareBtnText}>{t('alliance.showTargets')}</Text>
            </Pressable>
          )}
          {loading && <ActivityIndicator color={colors.sand} style={{ marginVertical: 16 }} />}
          {targets.map(tgt => (
            <View key={tgt.id} style={styles.warTargetRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>[{tgt.tag}] {tgt.name}</Text>
                <Text style={styles.memberStat}>👥 {tgt.memberCount} · ⚡ {formatNumber(tgt.totalPower)}</Text>
              </View>
              <Pressable style={styles.warAttackBtn} onPress={() => handleDeclare(tgt.id)}>
                <Text style={styles.warAttackBtnText}>{t('alliance.declareWar')}</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.warDesc}>{t('alliance.nonLeaderMsg')}</Text>
      )}
    </ScrollView>
  );
}
