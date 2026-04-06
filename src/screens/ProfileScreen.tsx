import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BattleResultModal } from '../components/BattleResultModal';
import { colors } from '../theme/colors';
import { t, setLocale, getLocale, LOCALES, type Locale } from '../i18n';
import { useDesertGame } from '../state/DesertGameContext';

/** Web-safe Alert wrapper */
const xAlert = {
  alert: (title: string, message?: string, buttons?: Array<{ text: string; style?: string; onPress?: () => void }>) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        const ok = window.confirm(`${title}\n${message ?? ''}`);
        if (ok) {
          const action = buttons.find(b => b.style !== 'cancel');
          action?.onPress?.();
        }
      } else {
        window.alert(`${title}\n${message ?? ''}`);
      }
    } else {
      const { Alert } = require('react-native');
      Alert.alert(title, message, buttons);
    }
  },
};
import { signOut, updateDisplayName, canChangeName, getCurrentUser } from '../services/authService';
import { MilitaryPanel } from '../components/MilitaryPanel';
import { formatNumber } from '../utils/formatters';
import { ActionButton } from '../components/ActionButton';
import { db } from '../services/firebase';

export function ProfileScreen() {
  const {
    displayName, uid, playerPower, buildings, battleReports,
    researchStates, getTotalTrainedUnits, missions, alliance,
    wins, losses,
  } = useDesertGame();

  const hqLevel = buildings.find(b => b.id === 'hq')?.level ?? 1;
  const totalUnits = getTotalTrainedUnits();
  const researchDone = researchStates.filter(r => r.completed).length;
  const missionsDone = missions.filter(m => m.claimed).length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const allianceName = alliance?.myAllianceData?.name ?? null;
  const allianceTag = alliance?.myAllianceData?.tag ?? null;

  const [viewReport, setViewReport] = useState<any>(null);
  const [showReports, setShowReports] = useState(false);
  const [reportTab, setReportTab] = useState<'pvp' | 'alliance'>('pvp');
  const [expandedWar, setExpandedWar] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [lang, setLang] = useState(getLocale());
  const [email, setEmail] = useState<string | null>(null);
  const [_provider, _setProvider] = useState<string | null>(null);

  // Bildirim ayarları
  const NOTIF_STORAGE_KEY = 'war-nexus-notif-prefs';
  const [notifPrefs, setNotifPrefs] = useState({
    attacks: true,       // Saldırı bildirimleri
    battleResults: true, // Savaş sonuçları
    allianceWar: true,   // İttifak savaşı
    missions: true,      // Görev tamamlama
  });

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_STORAGE_KEY).then(val => {
      if (val) try { setNotifPrefs(JSON.parse(val)); } catch {}
    });
  }, []);

  const toggleNotifPref = (key: keyof typeof notifPrefs) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    // Firestore'a da kaydet — Cloud Functions bildirim gönderirken kontrol eder
    if (uid) {
      db.players().doc(uid).set({ notifPrefs: next }, { merge: true }).catch(() => {});
    }
  };

  useEffect(() => {
    if (!uid) return;
    canChangeName(uid).then(({ allowed, remainingDays: days }) => {
      setCanEdit(allowed);
      setRemainingDays(days);
    });
    // Email/provider bilgisi
    try {
      const user = getCurrentUser();
      if (user) {
        setEmail(user.email ?? null);
      }
    } catch {}
  }, [uid, displayName, battleReports.length]);

  const handleNameChange = async () => {
    const name = newName.trim();
    if (!name) { setNameError(t('profile.errorUsernameRequired')); return; }
    if (name.length < 3) { setNameError(t('profile.errorTooShort')); return; }
    if (name.length > 20) { setNameError(t('profile.errorTooLong')); return; }
    if (!uid) return;
    setNameLoading(true);
    setNameError(null);
    try {
      await updateDisplayName(uid, name);
      setEditing(false);
      setCanEdit(false);
      setRemainingDays(30);
      xAlert.alert(t('profile.alertSuccessTitle'), t('profile.alertSuccessMsg', { name }));
    } catch (err: any) {
      setNameError(err?.message ?? t('profile.errorGeneric'));
    }
    setNameLoading(false);
  };

  const handleLogout = () => {
    xAlert.alert(
      t('profile.alertLogoutTitle'),
      t('profile.alertLogoutMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.logout'), style: 'destructive', onPress: () => signOut() },
      ],
    );
  };

  const handleLang = (l: Locale) => {
    setLocale(l);
    setLang(l);
  };

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* ── Profil Kartı ── */}
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{displayName}</Text>
        {allianceTag && <Text style={s.allianceTag}>[{allianceTag}] {allianceName}</Text>}

        {/* İsim Değiştir */}
        {!editing ? (
          <Pressable
            style={[s.editNameBtn, !canEdit && s.editNameBtnDisabled]}
            onPress={() => {
              if (canEdit) { setNewName(displayName); setEditing(true); setNameError(null); }
              else xAlert.alert(t('profile.alertWaitTitle'), t('profile.alertWaitMsg', { days: String(remainingDays) }));
            }}
          >
            <Text style={s.editNameText}>
              {canEdit ? t('profile.editName') : `🔒 ${t('profile.changeDaysLater', { days: String(remainingDays) })}`}
            </Text>
          </Pressable>
        ) : (
          <View style={s.editNameForm}>
            <TextInput
              style={s.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('profile.placeholderNewUsername')}
              placeholderTextColor={colors.textMuted}
              maxLength={20}
              autoFocus
            />
            {nameError && <Text style={s.nameError}>{nameError}</Text>}
            <View style={s.editNameActions}>
              <ActionButton label={t('common.cancel')} onPress={() => setEditing(false)} variant="secondary" />
              <ActionButton label={nameLoading ? '...' : t('common.save')} onPress={handleNameChange} disabled={nameLoading} />
            </View>
          </View>
        )}
      </View>

      {/* ── Hesap Bilgileri ── */}
      <MilitaryPanel title={t('profile.sectionAccount')}>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>{t('profile.email')}</Text>
          <Text style={s.infoValue}>{email ?? '—'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>{t('profile.provider')}</Text>
          <Text style={s.infoValue}>Google</Text>
        </View>
        {allianceName && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{t('profile.allianceName')}</Text>
            <Text style={s.infoValue}>[{allianceTag}] {allianceName}</Text>
          </View>
        )}
      </MilitaryPanel>

      {/* ── Oyun İstatistikleri ── */}
      <MilitaryPanel title={t('profile.sectionGameStats')}>
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statValue}>⚡ {formatNumber(playerPower)}</Text>
            <Text style={s.statLabel}>{t('profile.power')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>🏠 Lv.{hqLevel}</Text>
            <Text style={s.statLabel}>{t('profile.hq')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>🏆 {wins}</Text>
            <Text style={s.statLabel}>{t('profile.wins')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>💀 {losses}</Text>
            <Text style={s.statLabel}>{t('profile.losses')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>🪖 {formatNumber(totalUnits)}</Text>
            <Text style={s.statLabel}>{t('profile.totalUnits')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>🔬 {researchDone}/28</Text>
            <Text style={s.statLabel}>{t('profile.researchDone')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>🎯 {missionsDone}/50</Text>
            <Text style={s.statLabel}>{t('profile.missionsDone')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>📊 {winRate}%</Text>
            <Text style={s.statLabel}>{t('profile.winRate')}</Text>
          </View>
        </View>
      </MilitaryPanel>

      {/* ── Savaş Raporları ── */}
      <Pressable
        style={s.reportsBtn}
        onPress={() => setShowReports(!showReports)}
      >
        <Text style={s.reportsBtnText}>⚔️ {t('profile.battleReports')}</Text>
        <Text style={s.reportsBtnArrow}>{showReports ? '▲' : '▼'}</Text>
      </Pressable>
      {showReports && (
        <>
          {/* Tab Toggle */}
          <View style={s.reportTabRow}>
            <Pressable
              style={[s.reportTab, reportTab === 'pvp' && s.reportTabActive]}
              onPress={() => setReportTab('pvp')}
            >
              <Text style={[s.reportTabText, reportTab === 'pvp' && s.reportTabTextActive]}>
                ⚔️ PvP ({battleReports.length})
              </Text>
            </Pressable>
            <Pressable
              style={[s.reportTab, reportTab === 'alliance' && s.reportTabActive]}
              onPress={() => setReportTab('alliance')}
            >
              <Text style={[s.reportTabText, reportTab === 'alliance' && s.reportTabTextActive]}>
                🛡️ {t('alliance.warResultsTitle')} ({(alliance?.warReports ?? []).length})
              </Text>
            </Pressable>
          </View>

          {/* PvP Raporları */}
          {reportTab === 'pvp' && (
            <MilitaryPanel title={`PvP (${battleReports.length})`}>
              {battleReports.length === 0 ? (
                <Text style={s.emptyText}>{t('profile.noReports')}</Text>
              ) : (
                battleReports.slice(-10).reverse().map(r => {
                  const d = new Date(r.timestamp);
                  const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                  const dateStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
                  const isDefense = r.targetId === 'defense';
                  return (
                    <Pressable key={r.id} onPress={() => setViewReport(r)}>
                      <View style={s.reportRow}>
                        <Text style={{ fontSize: 18 }}>{r.won ? '🏆' : '💀'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.reportName}>
                            {isDefense ? '🛡️' : '⚔️'} {r.targetName}
                          </Text>
                          <Text style={s.reportTime}>
                            {dateStr} {timeStr} · {r.unitsLost > 0 ? `−${r.unitsLost} ${t('common.units')}` : t('profile.noLoss')}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {r.rewardCash > 0 && <Text style={s.reportGain}>+💵{formatNumber(r.rewardCash)}</Text>}
                          {r.rewardCash < 0 && <Text style={s.reportLoss}>💵{formatNumber(r.rewardCash)}</Text>}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </MilitaryPanel>
          )}

          {/* İttifak Savaş Raporları */}
          {reportTab === 'alliance' && (
            <MilitaryPanel title={`${t('alliance.warResultsTitle')} (${(alliance?.warReports ?? []).length})`}>
              {(!alliance?.warReports || alliance.warReports.length === 0) ? (
                <Text style={s.emptyText}>{t('alliance.noReports')}</Text>
              ) : (
                alliance.warReports.filter((wr: any) => wr.ourTag && wr.enemyTag).slice(0, 10).map((wr: any, i: number) => {
                  const wrId = (wr as any).id ?? `wr-${i}`;
                  const isExpanded = expandedWar === wrId;
                  const d = new Date(wr.timestamp);
                  const dateStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
                  const scoreTotal = (wr.ourScore + wr.theirScore) || 1;
                  const ourPct = Math.round((wr.ourScore / scoreTotal) * 100);
                  const durationH = wr.startedAt && wr.endedAt ? Math.round((wr.endedAt - wr.startedAt) / 3600000) : 24;
                  return (
                    <Pressable key={wrId} onPress={() => setExpandedWar(isExpanded ? null : wrId)}>
                      <View style={s.warReportRow}>
                        {/* Baslik */}
                        <View style={s.warReportHeader}>
                          <Text style={{ color: wr.won ? colors.success : colors.danger, fontSize: 14, fontWeight: '800' }}>
                            {wr.won ? t('alliance.warVictory') : t('alliance.warDefeat')}
                          </Text>
                          <Text style={s.reportTime}>{dateStr}</Text>
                        </View>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                          [{wr.ourTag}] vs [{wr.enemyTag}] {wr.enemyName}
                        </Text>
                        {/* Skor bar */}
                        <View style={s.warScoreRow}>
                          <Text style={{ color: colors.sand, fontSize: 13, fontWeight: '800' }}>{wr.ourScore}</Text>
                          <View style={s.warScoreBar}>
                            <View style={[s.warScoreBarFill, { width: `${ourPct}%`, backgroundColor: wr.won ? colors.success : colors.danger }]} />
                          </View>
                          <Text style={{ color: colors.sand, fontSize: 13, fontWeight: '800' }}>{wr.theirScore}</Text>
                        </View>

                        {/* Genisletilmis detay */}
                        {isExpanded && (
                          <View style={s.warDetailSection}>
                            {/* Savas detaylari */}
                            <Text style={s.warDetailTitle}>📊 {t('alliance.warDetails')}</Text>
                            <Text style={s.warDetailText}>{t('alliance.warDuration')}: {durationH} {t('alliance.hours')}</Text>
                            <Text style={s.warDetailText}>{t('alliance.totalAttacks')}: {wr.totalAttacks ?? 0}</Text>
                            <Text style={s.warDetailText}>{t('alliance.totalWins')}: {wr.totalWins ?? 0}</Text>

                            {/* Oduller */}
                            {wr.won && (
                              <>
                                <Text style={[s.warDetailTitle, { marginTop: 8 }]}>💰 {t('alliance.rewardsLabel')}</Text>
                                <Text style={s.warDetailText}>{t('alliance.treasuryReward')}: 100K 💵 + 100K 🛢️ + 100K ⛏️</Text>
                                <Text style={s.warDetailText}>{t('alliance.perMemberReward')}: 50K 💵 + 50K 🛢️ + 50K ⛏️ + 500 🪙</Text>
                              </>
                            )}

                            {/* MVP */}
                            {wr.mvp && (
                              <>
                                <Text style={[s.warDetailTitle, { marginTop: 8 }]}>🌟 MVP</Text>
                                <Text style={s.warDetailMvp}>{wr.mvp} — {wr.mvpScore} {t('alliance.points')}{wr.won ? ` (+250 🪙)` : ''}</Text>
                              </>
                            )}

                            {/* Uye katkilari */}
                            {(wr.memberStats ?? []).length > 0 && (
                              <>
                                <Text style={[s.warDetailTitle, { marginTop: 8 }]}>👥 {t('alliance.memberContributions')}</Text>
                                {(wr.memberStats ?? []).map((ms: any, j: number) => (
                                  <View key={ms.uid ?? j} style={s.warMemberRow}>
                                    <Text style={s.warMemberRank}>{j === 0 ? '🥇' : j === 1 ? '🥈' : j === 2 ? '🥉' : `#${j+1}`}</Text>
                                    <Text style={s.warMemberName} numberOfLines={1}>{ms.name}</Text>
                                    <Text style={s.warMemberStat}>{ms.wins}W/{ms.losses}L</Text>
                                    <Text style={s.warMemberScore}>{ms.score} {t('alliance.points')}</Text>
                                  </View>
                                ))}
                              </>
                            )}
                          </View>
                        )}

                        <Text style={s.warExpandHint}>{isExpanded ? '▲' : '▼ ' + t('alliance.tapToExpand')}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </MilitaryPanel>
          )}
        </>
      )}
      {viewReport && (
        <BattleResultModal report={viewReport} onClose={() => setViewReport(null)} />
      )}

      {/* ── Dil Ayarı ── */}
      <MilitaryPanel title={t('profile.sectionLanguage')}>
        <View style={s.langRow}>
          {(Object.keys(LOCALES) as Locale[]).map(l => (
            <Pressable
              key={l}
              style={[s.langBtn, lang === l && s.langBtnActive]}
              onPress={() => handleLang(l)}
            >
              <Text style={[s.langBtnText, lang === l && s.langBtnTextActive]}>
                {l === 'tr' ? '🇹🇷' : '🇬🇧'} {LOCALES[l]}
              </Text>
            </Pressable>
          ))}
        </View>
      </MilitaryPanel>

      {/* ── Bildirim Ayarları ── */}
      <MilitaryPanel title={t('profile.notifSettings')}>
        {([
          { key: 'attacks' as const, label: t('profile.notifAttacks'), icon: '⚔️' },
          { key: 'battleResults' as const, label: t('profile.notifBattleResults'), icon: '🏆' },
          { key: 'allianceWar' as const, label: t('profile.notifAllianceWar'), icon: '🛡️' },
          { key: 'missions' as const, label: t('profile.notifMissions'), icon: '🎯' },
        ]).map(item => (
          <View key={item.key} style={s.notifSettingRow}>
            <Text style={s.notifSettingLabel}>{item.icon} {item.label}</Text>
            <Switch
              value={notifPrefs[item.key]}
              onValueChange={() => toggleNotifPref(item.key)}
              trackColor={{ false: colors.surfaceAlt, true: colors.military }}
              thumbColor={notifPrefs[item.key] ? colors.sand : colors.textMuted}
            />
          </View>
        ))}
      </MilitaryPanel>

      {/* ── Çıkış ── */}
      <Pressable style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>{t('profile.logout')}</Text>
      </Pressable>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16 },
  profileCard: {
    alignItems: 'center', paddingVertical: 24,
    borderBottomWidth: 1, borderBottomColor: colors.panelBorder, marginBottom: 16,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.military, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: colors.sand,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  name: { color: colors.sand, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  allianceTag: { color: colors.military, fontSize: 13, fontWeight: '700', marginTop: 2 },
  uid: { color: colors.textMuted, fontSize: 10, marginTop: 4, marginBottom: 10 },
  editNameBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.sand },
  editNameBtnDisabled: { borderColor: colors.textMuted },
  editNameText: { color: colors.textSecondary, fontSize: 11 },
  editNameForm: { width: '100%', marginTop: 10, gap: 8 },
  nameInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10,
    color: colors.textPrimary, fontSize: 16, textAlign: 'center',
  },
  nameError: { color: colors.danger, fontSize: 11, textAlign: 'center' },
  editNameActions: { flexDirection: 'row', gap: 8 },
  // Account info
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1, minWidth: '22%' as any, backgroundColor: colors.surfaceAlt,
    borderRadius: 4, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  statValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  // Battle Reports
  reportsBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 6, padding: 14, marginBottom: 12,
  },
  reportsBtnText: { color: colors.sand, fontSize: 14, fontWeight: '700' },
  reportsBtnArrow: { color: colors.textMuted, fontSize: 12 },
  reportTabRow: {
    flexDirection: 'row', gap: 0, marginBottom: 12,
    borderRadius: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  reportTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  reportTabActive: {
    backgroundColor: colors.military, borderColor: colors.sand,
  },
  reportTabText: {
    color: colors.textMuted, fontSize: 12, fontWeight: '600',
  },
  reportTabTextActive: {
    color: '#fff',
  },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  reportName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  reportTime: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  reportGain: { color: '#4CAF50', fontSize: 11, fontWeight: '700' },
  reportLoss: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  // Language
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6,
    borderWidth: 1, borderColor: colors.panelBorder, alignItems: 'center',
  },
  langBtnActive: { borderColor: colors.sand, backgroundColor: colors.sand + '22' },
  langBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  langBtnTextActive: { color: colors.sand },
  // Notification settings
  notifSettingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  notifSettingLabel: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  // Logout
  logoutBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 6,
    borderWidth: 1, borderColor: colors.danger, alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  // War Reports
  warReportRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.panelBorder,
  },
  warReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  warScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warScoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  warScoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  warDetailSection: {
    marginTop: 8, borderTopWidth: 1, borderTopColor: colors.panelBorder, paddingTop: 8,
  },
  warDetailTitle: {
    color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 4,
  },
  warDetailText: {
    color: colors.textSecondary, fontSize: 11, marginBottom: 2,
  },
  warDetailMvp: {
    color: colors.sand, fontSize: 12, fontWeight: '700',
  },
  warMemberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 2, gap: 4,
  },
  warMemberRank: { fontSize: 11, width: 22 },
  warMemberName: { color: '#fff', fontSize: 11, flex: 1 },
  warMemberStat: { color: colors.textMuted, fontSize: 10, width: 45, textAlign: 'right' },
  warMemberScore: { color: colors.sand, fontSize: 11, fontWeight: '700', width: 50, textAlign: 'right' },
  warExpandHint: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 6 },
});
