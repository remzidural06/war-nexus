import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/formatters';
import { styles } from '../../screens/AllianceScreen.styles';
import { BattleResultModal } from '../BattleResultModal';
import type { BattleReport } from '../../state/types';

export function WarReportsTab({ warBattleLogs }: { warBattleLogs: any[] }) {
  const [selectedLog, setSelectedLog] = useState<BattleReport | null>(null);
  const warResults = warBattleLogs.filter(l => l.type === 'warResult');
  const battleLogs = warBattleLogs.filter(l => l.type !== 'warResult');

  return (
    <>
      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {warResults.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{t('alliance.warResultsTitle')}</Text>
            {warResults.map((wr: any, i: number) => {
              const date = new Date(wr.timestamp);
              const dateStr = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
              return (
                <View key={wr.id ?? i} style={[styles.warLogRow, { flexDirection: 'column', padding: 12, borderLeftWidth: 3, borderLeftColor: wr.won ? colors.success : colors.danger }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: wr.won ? colors.success : colors.danger, fontSize: 15, fontWeight: '800' }}>
                      {wr.won ? '🏆 ZAFER' : '💀 YENİLGİ'}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{dateStr}</Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                    [{wr.ourTag}] {wr.ourName} vs [{wr.enemyTag}] {wr.enemyName}
                  </Text>
                  <Text style={{ color: colors.sand, fontSize: 14, fontWeight: '700', marginBottom: 6 }}>
                    {t('alliance.scoreLabel', { ours: String(wr.ourScore), theirs: String(wr.theirScore) })}
                  </Text>
                  {wr.won && wr.rewards && (
                    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 6, padding: 8, marginBottom: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 2 }}>{t('alliance.rewardsLabel')}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{wr.rewards.perMember}</Text>
                      {wr.mvp && <Text style={{ color: colors.sand, fontSize: 12, fontWeight: '700', marginTop: 4 }}>🌟 MVP: {wr.mvp} {wr.rewards.mvpBonus}</Text>}
                    </View>
                  )}
                  {(wr.memberStats ?? []).length > 0 && (
                    <View>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>{t('alliance.memberContributions')}</Text>
                      {(wr.memberStats ?? []).map((ms: any, j: number) => (
                        <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 11 }}>{j === 0 ? '🥇' : j === 1 ? '🥈' : j === 2 ? '🥉' : `#${j + 1}`} {ms.name}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('alliance.winLossStat', { wins: String(ms.wins), losses: String(ms.attacks - ms.wins) })} · {t('alliance.scorePoints', { score: String(ms.score) })}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {battleLogs.length === 0 && warResults.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('alliance.noReports')}</Text>
          </View>
        ) : battleLogs.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{t('alliance.battleReports', { count: String(battleLogs.length) })}</Text>
            {battleLogs.map((log: any) => {
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
            })}
          </>
        ) : null}
      </ScrollView>
      {selectedLog && (
        <BattleResultModal report={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
}
