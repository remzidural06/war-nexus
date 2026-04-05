import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { styles } from '../../screens/AllianceScreen.styles';
import { BattleResultModal } from '../BattleResultModal';
import type { BattleReport, AllianceWarReport } from '../../state/types';

interface Props {
  warBattleLogs: any[];
  warReports: AllianceWarReport[];
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(startedAt: number, endedAt: number): string {
  const hours = Math.round((endedAt - startedAt) / (1000 * 60 * 60));
  return `${hours} ${t('alliance.hours')}`;
}

function WarReportCard({ report }: { report: AllianceWarReport }) {
  const [expanded, setExpanded] = useState(false);
  const scoreTotal = report.ourScore + report.theirScore || 1;
  const ourPct = Math.round((report.ourScore / scoreTotal) * 100);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[rs.card, { borderLeftColor: report.won ? colors.success : colors.danger }]}
    >
      {/* Baslik */}
      <View style={rs.header}>
        <Text style={[rs.resultBadge, { color: report.won ? colors.success : colors.danger }]}>
          {report.won ? t('alliance.warVictory') : t('alliance.warDefeat')}
        </Text>
        <Text style={rs.date}>{formatDate(report.timestamp)}</Text>
      </View>

      {/* Ittifaklar */}
      <Text style={rs.versus}>
        [{report.ourTag}] {report.ourName}  vs  [{report.enemyTag}] {report.enemyName}
      </Text>

      {/* Skor */}
      <View style={rs.scoreRow}>
        <Text style={rs.scoreText}>{report.ourScore}</Text>
        <View style={rs.scoreBar}>
          <View style={[rs.scoreBarFill, { width: `${ourPct}%`, backgroundColor: report.won ? colors.success : colors.danger }]} />
        </View>
        <Text style={rs.scoreText}>{report.theirScore}</Text>
      </View>

      {/* Expand detay */}
      {expanded && (
        <View style={rs.memberSection}>
          {/* Savas detaylari */}
          <Text style={rs.detailTitle}>📊 {t('alliance.warDetails')}</Text>
          <Text style={rs.detailText}>{t('alliance.warDuration')}: {formatDuration(report.startedAt, report.endedAt)}</Text>
          <Text style={rs.detailText}>{t('alliance.totalAttacks')}: {report.totalAttacks}</Text>
          <Text style={rs.detailText}>{t('alliance.totalWins')}: {report.totalWins}</Text>

          {/* Oduller */}
          {report.won && (
            <>
              <Text style={[rs.detailTitle, { marginTop: 8 }]}>💰 {t('alliance.rewardsLabel')}</Text>
              <Text style={rs.detailText}>{t('alliance.treasuryReward')}: 100K 💵 + 100K 🛢️ + 100K ⛏️</Text>
              <Text style={rs.detailText}>{t('alliance.perMemberReward')}: 50K 💵 + 50K 🛢️ + 50K ⛏️ + 500 🪙</Text>
            </>
          )}

          {/* MVP */}
          {report.mvp && (
            <>
              <Text style={[rs.detailTitle, { marginTop: 8 }]}>🌟 MVP</Text>
              <Text style={rs.mvpText}>{report.mvp} — {report.mvpScore} {t('alliance.points')}{report.won ? ' (+250 🪙)' : ''}</Text>
            </>
          )}

          {/* Uye katkilari */}
          {report.memberStats.length > 0 && (
            <>
              <Text style={[rs.detailTitle, { marginTop: 8 }]}>👥 {t('alliance.memberContributions')}</Text>
              {report.memberStats.map((ms, i) => (
                <View key={ms.uid} style={rs.memberRow}>
                  <Text style={rs.memberRank}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </Text>
                  <Text style={rs.memberName} numberOfLines={1}>{ms.name}</Text>
                  <Text style={rs.memberStat}>{ms.wins}W/{ms.losses}L</Text>
                  <Text style={rs.memberScore}>{ms.score} {t('alliance.points')}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <Text style={rs.expandHint}>
        {expanded ? '▲' : '▼ ' + t('alliance.tapToExpand')}
      </Text>
    </Pressable>
  );
}

export function WarReportsTab({ warBattleLogs, warReports }: Props) {
  const [selectedLog, setSelectedLog] = useState<BattleReport | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'results'>('logs');
  const battleLogs = warBattleLogs.filter(l => l.type !== 'warResult');

  return (
    <>
      {/* Tab Toggle */}
      <View style={ts.tabRow}>
        <Pressable
          style={[ts.tab, activeTab === 'logs' && ts.tabActive]}
          onPress={() => setActiveTab('logs')}
        >
          <Text style={[ts.tabText, activeTab === 'logs' && ts.tabTextActive]}>
            ⚔️ {t('alliance.battleReports', { count: String(battleLogs.length) })}
          </Text>
        </Pressable>
        <Pressable
          style={[ts.tab, activeTab === 'results' && ts.tabActive]}
          onPress={() => setActiveTab('results')}
        >
          <Text style={[ts.tabText, activeTab === 'results' && ts.tabTextActive]}>
            🏆 {t('alliance.warResultsTitle')} ({warReports.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {/* Savas Sonuclari */}
        {activeTab === 'results' && (
          warReports.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('alliance.noReports')}</Text>
            </View>
          ) : (
            warReports.map((report, i) => (
              <WarReportCard key={(report as any).id ?? i} report={report} />
            ))
          )
        )}

        {/* Savas Raporlari (bireysel loglar) */}
        {activeTab === 'logs' && (
          battleLogs.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('alliance.noReports')}</Text>
            </View>
          ) : (
            battleLogs.map((log: any) => {
              const ago = Math.round((Date.now() - (log.savedAt ?? log.timestamp)) / 60000);
              const timeStr = ago < 1 ? t('alliance.timeJustNow') : ago < 60 ? t('alliance.timeMinutesAgo', { n: String(ago) }) : t('alliance.timeHoursAgo', { n: String(Math.floor(ago / 60)) });
              return (
                <Pressable key={log.id} style={styles.warLogRow} onPress={() => setSelectedLog(log as BattleReport)}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: log.won ? colors.success : colors.danger, fontSize: 13, fontWeight: '700' }}>
                      {log.won ? '🏆' : '💀'} {log.attackerName ?? t('alliance.attackerFallback')} → {(log.defenderName ?? log.targetName ?? '').replace('⚔️ ', '').replace(' Saldırısı', '')}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      +{t('alliance.scorePoints', { score: String(log.score ?? 0) })} · {timeStr}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
                </Pressable>
              );
            })
          )
        )}
      </ScrollView>
      {selectedLog && (
        <BattleResultModal report={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
}

const ts = {
  tabRow: {
    flexDirection: 'row' as const,
    borderRadius: 6,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    margin: 10,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center' as const,
    backgroundColor: colors.surfaceAlt,
  },
  tabActive: {
    backgroundColor: colors.military,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tabTextActive: {
    color: '#fff' as const,
  },
};

const rs = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  } as const,
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  resultBadge: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  date: {
    color: colors.textMuted,
    fontSize: 11,
  },
  versus: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  scoreText: {
    color: colors.sand,
    fontSize: 16,
    fontWeight: '800' as const,
    minWidth: 30,
    textAlign: 'center' as const,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  scoreBarFill: {
    height: '100%' as const,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  statText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  mvpRow: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  mvpText: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  rewardsBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  rewardsTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  rewardsDetail: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  mvpBonus: {
    color: colors.sand,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  detailTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  memberSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
    paddingTop: 8,
  },
  memberTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  memberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 3,
    gap: 6,
  },
  memberRank: {
    fontSize: 12,
    width: 24,
  },
  memberName: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  memberStat: {
    color: colors.textMuted,
    fontSize: 11,
    width: 50,
    textAlign: 'right' as const,
  },
  memberScore: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700' as const,
    width: 55,
    textAlign: 'right' as const,
  },
  expandHint: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center' as const,
    marginTop: 4,
  },
};
