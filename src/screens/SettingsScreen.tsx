import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MilitaryPanel } from '../components/MilitaryPanel';
import { ActionButton } from '../components/ActionButton';
import { colors } from '../theme/colors';
import { useDesertGame } from '../state/DesertGameContext';
import { formatNumber } from '../utils/formatters';
import { t } from '../i18n';

const TYPE_ICONS: Record<string, string> = {
  upgrade: '🏗️',
  train: '🪖',
  attack: '⚔️',
  research: '🔬',
  donate: '🤝',
};

export function SettingsScreen() {
  const { missions, claimMissionReward } = useDesertGame();

  // Tamamlanıp ödülü alınan görev sayısı → o kadar yeni görev açılır
  const claimedCount = missions.filter(m => m.claimed).length;
  const unlocked = 10 + claimedCount; // İlk 10 + tamamlanan kadar yeni
  const visible = missions
    .filter(m => (m.order ?? 0) <= unlocked)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const active = visible.filter(m => !m.claimed);
  const done = visible.filter(m => m.claimed);

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <MilitaryPanel title={t('settings.activeMissions', { done: String(done.length), total: String(missions.length) })} accent>
        {active.length === 0 ? (
          <Text style={styles.emptyText}>{t('settings.allDone')}</Text>
        ) : (
          active.map(m => {
            const pct = Math.min(1, m.currentCount / m.targetCount);
            return (
              <View key={m.id} style={styles.missionCard}>
                <View style={styles.missionHeader}>
                  <Text style={styles.missionIcon}>{TYPE_ICONS[m.type] ?? '📋'}</Text>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>{t(`missions.${m.id}.title`) !== `missions.${m.id}.title` ? t(`missions.${m.id}.title`) : m.title}</Text>
                    <Text style={styles.missionDesc}>{t(`missions.${m.id}.desc`) !== `missions.${m.id}.desc` ? t(`missions.${m.id}.desc`) : m.description}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {m.currentCount} / {m.targetCount}
                  </Text>
                  <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
                </View>

                {/* Ödül + Talep */}
                <View style={styles.rewardRow}>
                  {m.rewardCash > 0 && (
                    <Text style={styles.rewardChip}>💵 {formatNumber(m.rewardCash)}</Text>
                  )}
                  {m.rewardOil > 0 && (
                    <Text style={styles.rewardChip}>🛢️ {formatNumber(m.rewardOil)}</Text>
                  )}
                  {m.rewardOre > 0 && (
                    <Text style={styles.rewardChip}>⛏️ {formatNumber(m.rewardOre)}</Text>
                  )}
                  {(m.rewardGold ?? 0) > 0 && (
                    <Text style={styles.rewardChip}>🪙 {formatNumber(m.rewardGold!)}</Text>
                  )}
                  {m.completed && !m.claimed && (
                    <ActionButton
                      label={t('settings.claim')}
                      onPress={() => claimMissionReward(m.id)}
                      style={styles.claimBtn}
                    />
                  )}
                  {m.claimed && <Text style={styles.claimedText}>✅</Text>}
                </View>
              </View>
            );
          })
        )}
      </MilitaryPanel>

      {done.length > 0 && (
        <MilitaryPanel title={t('settings.completedMissions')}>
          {done.map(m => (
            <View key={m.id} style={styles.doneMission}>
              <Text style={styles.doneIcon}>{TYPE_ICONS[m.type] ?? '📋'}</Text>
              <Text style={styles.doneTitle}>{t(`missions.${m.id}.title`) !== `missions.${m.id}.title` ? t(`missions.${m.id}.title`) : m.title}</Text>
              <Text style={styles.doneBadge}>✅</Text>
            </View>
          ))}
        </MilitaryPanel>
      )}

      <MilitaryPanel title={t('settings.infoTitle')}>
        <Text style={styles.infoText}>{t('settings.version')}</Text>
        <Text style={styles.infoText}>{t('settings.stats')}</Text>
      </MilitaryPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 10 },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 8 },

  missionCard: {
    borderWidth: 1, borderColor: colors.panelBorder, borderRadius: 4,
    padding: 10, marginBottom: 8, backgroundColor: colors.surface, gap: 6,
  },
  missionHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  missionIcon: { fontSize: 18, marginTop: 1 },
  missionInfo: { flex: 1, gap: 2 },
  missionTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  missionDesc: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },

  progressTrack: {
    height: 5, backgroundColor: colors.surfaceAlt,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.sand,
    borderRadius: 3,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: colors.textMuted, fontSize: 10 },
  progressPct: { color: colors.sand, fontSize: 10, fontWeight: '700' },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rewardChip: { color: colors.textSecondary, fontSize: 11 },
  claimBtn: { paddingVertical: 4, paddingHorizontal: 12, marginLeft: 'auto' },
  claimedText: { fontSize: 16, marginLeft: 'auto' },

  doneMission: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
  },
  doneIcon: { fontSize: 14 },
  doneTitle: { flex: 1, color: colors.textMuted, fontSize: 12 },
  doneBadge: { fontSize: 14 },

  infoText: { color: colors.textSecondary, fontSize: 12, marginBottom: 3 },
});
