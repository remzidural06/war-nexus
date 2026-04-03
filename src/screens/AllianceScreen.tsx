/**
 * AllianceScreen — İttifak yönetimi ana ekranı
 *
 * Implements:
 *  - İttifak yok görünümü: kur / ara / sıralama
 *  - İttifak üyesi görünümü: Chat / Üyeler / Bağış / Ayarlar
 *
 * Context: useDesertGame() → alliance (AllianceState), gold, getResource, uid, playerPower
 * Design ref: War Nexus GDD — Alliance System
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDesertGame } from '../state/DesertGameContext';
import { ActionButton } from '../components/ActionButton';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import { formatNumber } from '../utils/formatters';
import type { AllianceData, AllianceJoinType, AllianceWar, AllianceMemberData, Birlik, MarchUnit, BattleReport } from '../state/types';
import { BattleResultModal } from '../components/BattleResultModal';
import { updateAllianceInfo } from '../services/allianceService';

// ─── Constants ───────────────────────────────────────────────
const CREATE_COST_GOLD = 500;
const DONATE_AMOUNTS = [1000, 5000, 10000, 50000];
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────
function isOnline(lastOnline: number): boolean {
  return Date.now() - lastOnline < ONLINE_THRESHOLD_MS;
}

const RANK_INFO: Record<string, { icon: string; color: string }> = {
  leader:   { icon: '🔱', color: colors.sand },
  officer:  { icon: '⭐', color: colors.militaryLight },
  foreign:  { icon: '🌐', color: '#3498db' },
  economy:  { icon: '💰', color: '#f39c12' },
  interior: { icon: '🏛️', color: '#9b59b6' },
  defense:  { icon: '🛡️', color: '#e74c3c' },
  member:   { icon: '•',  color: colors.textSecondary },
};

const ASSIGNABLE_RANKS = ['officer', 'foreign', 'economy', 'interior', 'defense', 'member'] as const;

function rankLabel(rank: string): string {
  const info = RANK_INFO[rank];
  return info ? `${info.icon} ${t(`alliance.roles.${rank}`)}` : `• ${t('alliance.roles.member')}`;
}

function rankBadgeColor(rank: string): string {
  return RANK_INFO[rank]?.color ?? colors.textSecondary;
}

// ─── Sub-components ──────────────────────────────────────────

interface SectionTabProps {
  tabs: string[];
  active: number;
  onPress: (i: number) => void;
}
function SectionTabs({ tabs, active, onPress }: SectionTabProps) {
  return (
    <View style={styles.tabRow}>
      {tabs.map((t, i) => (
        <Pressable
          key={t}
          style={[styles.tabBtn, i === active && styles.tabBtnActive]}
          onPress={() => onPress(i)}
        >
          <Text style={[styles.tabBtnText, i === active && styles.tabBtnTextActive]}>
            {t}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Create Alliance Modal ────────────────────────────────────
interface CreateAllianceModalProps {
  visible: boolean;
  gold: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (name: string, tag: string, desc: string, joinType: AllianceJoinType) => Promise<boolean>;
}

function CreateAllianceModal({ visible, gold, loading, error, onClose, onCreate }: CreateAllianceModalProps) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [desc, setDesc] = useState('');
  const [joinType, setJoinType] = useState<AllianceJoinType>('open');

  function handleCreate() {
    if (!name.trim() || !tag.trim()) {
      Alert.alert(t('alliance.alertMissing'), t('alliance.alertMissingMsg'));
      return;
    }
    if (tag.length > 5) {
      Alert.alert(t('alliance.alertTagLong'), t('alliance.alertTagLongMsg'));
      return;
    }
    onCreate(name.trim(), tag.trim().toUpperCase(), desc.trim(), joinType);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{t('alliance.createModalTitle')}</Text>

          <Text style={styles.fieldLabel}>{t('alliance.nameLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('alliance.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={24}
          />

          <Text style={styles.fieldLabel}>{t('alliance.tagLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('alliance.tagPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={tag}
            onChangeText={v => setTag(v.toLocaleUpperCase('tr-TR'))}
            maxLength={5}
          />

          <Text style={styles.fieldLabel}>{t('alliance.descLabel')}</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMulti]}
            placeholder={t('alliance.descPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={desc}
            onChangeText={setDesc}
            maxLength={120}
          />

          <Text style={styles.fieldLabel}>{t('alliance.joinTypeLabel')}</Text>
          <View style={styles.joinTypeRow}>
            {(['open', 'approval'] as AllianceJoinType[]).map(jt => (
              <Pressable
                key={jt}
                style={[styles.joinTypeBtn, joinType === jt && styles.joinTypeBtnActive]}
                onPress={() => setJoinType(jt)}
              >
                <Text style={[styles.joinTypeBtnText, joinType === jt && styles.joinTypeBtnTextActive]}>
                  {jt === 'open' ? t('alliance.joinTypeOpen') : t('alliance.joinTypeApproval')}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('alliance.costLabel')}</Text>
            <Text style={styles.costValue}>{CREATE_COST_GOLD} 🪙</Text>
            <Text style={[styles.costValue, gold < CREATE_COST_GOLD && styles.costInsufficient]}>
              {t('alliance.balanceLabel', { gold })}
            </Text>
          </View>

          {error != null && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, (loading || gold < CREATE_COST_GOLD) && styles.confirmBtnDisabled]}
              onPress={handleCreate}
              disabled={loading || gold < CREATE_COST_GOLD}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.textOnDark} />
                : <Text style={styles.confirmBtnText}>{t('alliance.createBtn')}</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── No-Alliance View ─────────────────────────────────────────
interface NoAllianceViewProps {
  gold: number;
  loading: boolean;
  error: string | null;
  onCreate: (name: string, tag: string, desc: string, joinType: AllianceJoinType) => Promise<boolean>;
  onJoin: (allianceId: string) => Promise<boolean>;
  onRequest: (allianceId: string) => Promise<boolean>;
  onSearch: (query: string) => Promise<AllianceData[]>;
  onGetRankings: () => Promise<AllianceData[]>;
}

function NoAllianceView({
  gold, loading, error, onCreate, onJoin, onRequest, onSearch, onGetRankings,
}: NoAllianceViewProps) {
  const [createVisible, setCreateVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AllianceData[]>([]);
  const [rankings, setRankings] = useState<AllianceData[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRankings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRankings() {
    setRankingsLoading(true);
    const data = await onGetRankings();
    setRankings(data);
    setRankingsLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    const results = await onSearch(searchQuery.trim());
    setSearchResults(results);
  }

  async function handleJoinOrRequest(al: AllianceData) {
    setJoiningId(al.id);
    if (al.joinType === 'open') {
      await onJoin(al.id);
    } else {
      const ok = await onRequest(al.id);
      if (ok) {
        setAppliedIds(prev => new Set(prev).add(al.id));
      }
    }
    setJoiningId(null);
  }

  function renderAllianceRow(al: AllianceData, idx: number, showRank = false) {
    return (
      <View key={al.id} style={styles.allianceRow}>
        {showRank && (
          <Text style={styles.rankNumText}>#{idx + 1}</Text>
        )}
        <View style={styles.allianceRowInfo}>
          <Text style={styles.allianceTagText}>[{al.tag}]</Text>
          <Text style={styles.allianceNameText}>{al.name}</Text>
          <Text style={styles.allianceStatText}>
            {t('alliance.memberStat', { count: al.memberCount, max: al.maxMembers, power: formatNumber(al.totalPower) })}
          </Text>
        </View>
        {appliedIds.has(al.id) ? (
          <View style={[styles.joinBtn, styles.joinBtnDisabled]}>
            <Text style={styles.joinBtnText}>{t('alliance.appliedBtn')}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.joinBtn, joiningId === al.id && styles.joinBtnDisabled]}
            onPress={() => handleJoinOrRequest(al)}
            disabled={joiningId === al.id}
          >
            <Text style={styles.joinBtnText}>
              {al.joinType === 'open' ? t('alliance.joinBtn') : t('alliance.applyBtn')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.noAllianceScroll} contentContainerStyle={styles.noAllianceContent}>
      {/* Action cards */}
      <View style={styles.actionCardRow}>
        <Pressable style={styles.actionCard} onPress={() => setCreateVisible(true)}>
          <Text style={styles.actionCardIcon}>🏰</Text>
          <Text style={styles.actionCardTitle}>{t('alliance.createTitle')}</Text>
          <Text style={styles.actionCardSub}>{CREATE_COST_GOLD} 🪙</Text>
        </Pressable>
        <View style={styles.actionCardDivider} />
        <View style={[styles.actionCard, styles.actionCardSearch]}>
          <Text style={styles.actionCardIcon}>🔍</Text>
          <Text style={styles.actionCardTitle}>{t('alliance.searchTitle')}</Text>
        </View>
      </View>

      {/* Search section */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('alliance.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchBtnText}>{t('alliance.searchBtn')}</Text>
        </Pressable>
      </View>

      {error != null && <Text style={styles.errorText}>{error}</Text>}

      {searchResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alliance.searchResults')}</Text>
          {searchResults.map((al, i) => renderAllianceRow(al, i, false))}
        </View>
      )}

      {/* Rankings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('alliance.rankingsTitle')}</Text>
          <Pressable onPress={fetchRankings} disabled={rankingsLoading}>
            <Text style={styles.refreshBtn}>{rankingsLoading ? t('common.loading') : t('common.refresh')}</Text>
          </Pressable>
        </View>
        {rankingsLoading
          ? <ActivityIndicator color={colors.sand} style={{ marginVertical: 16 }} />
          : rankings.map((al, i) => renderAllianceRow(al, i, true))
        }
      </View>

      <CreateAllianceModal
        visible={createVisible}
        gold={gold}
        loading={loading}
        error={error}
        onClose={() => setCreateVisible(false)}
        onCreate={async (n, t, d, jt) => {
          const ok = await onCreate(n, t, d, jt);
          if (ok) setCreateVisible(false);
          return ok;
        }}
      />
    </ScrollView>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────
interface ChatTabProps {
  messages: { id: string; senderName: string; text: string; timestamp: number; type: 'chat' | 'system' }[];
  onSend: (text: string) => Promise<void>;
}

function ChatTab({ messages, onSend }: ChatTabProps) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll yeni mesaj gelince
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setSending(true);
    setInputText('');
    await onSend(text);
    setSending(false);
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.chatContainer}>
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && (
          <Text style={styles.chatEmptyText}>{t('alliance.chatEmpty')}</Text>
        )}
        {messages.map(msg => {
          if (msg.type === 'system') {
            return (
              <View key={msg.id} style={styles.systemMsgRow}>
                <Text style={styles.systemMsgText}>{msg.text}</Text>
              </View>
            );
          }
          return (
            <View key={msg.id} style={styles.chatMsgRow}>
              <Text style={styles.chatMsgName}>{msg.senderName}</Text>
              <Text style={styles.chatMsgTime}>{formatTime(msg.timestamp)}</Text>
              <Text style={styles.chatMsgText}>{msg.text}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder={t('alliance.chatPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!sending}
        />
        <Pressable
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? t('alliance.chatSending') : t('alliance.chatSend')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Members Tab ──────────────────────────────────────────────
interface MembersTabProps {
  members: {
    uid: string;
    displayName: string;
    rank: string;
    power: number;
    contribution: number;
    lastOnline: number;
  }[];
  joinRequests: { uid: string; displayName: string; power: number; hqLevel: number; requestedAt: number }[];
  myUid: string | null;
  myRank: string | null;
  onKick: (uid: string) => Promise<void>;
  onPromote: (uid: string, rank: string) => Promise<void>;
  onTransferLeadership: (uid: string) => void;
  onApprove: (uid: string) => Promise<void>;
  onReject: (uid: string) => Promise<void>;
}

function MembersTab({
  members, joinRequests, myUid, myRank,
  onKick, onPromote, onTransferLeadership, onApprove, onReject,
}: MembersTabProps) {
  const isLeader = myRank === 'leader';
  const isLeaderOrOfficer = myRank === 'leader' || myRank === 'officer';
  const [handledRequestIds, setHandledRequestIds] = useState<Set<string>>(new Set());
  const [roleDropdownUid, setRoleDropdownUid] = useState<string | null>(null);
  const visibleRequests = joinRequests.filter(r => !handledRequestIds.has(r.uid));

  async function handleApprove(uid: string) {
    try {
      await onApprove(uid);
    } catch {}
    setHandledRequestIds(prev => new Set(prev).add(uid));
  }

  async function handleReject(uid: string) {
    try {
      await onReject(uid);
    } catch {}
    setHandledRequestIds(prev => new Set(prev).add(uid));
  }

  function confirmKick(targetUid: string, name: string) {
    const msg = `${name} ittifaktan atılsın mı?`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(msg)) onKick(targetUid);
    } else {
      Alert.alert('Üyeyi At', msg, [
        { text: 'İptal', style: 'cancel' },
        { text: 'At', style: 'destructive', onPress: () => onKick(targetUid) },
      ]);
    }
  }

  function confirmTransfer(targetUid: string, name: string) {
    const msg = `Liderliği ${name} adlı üyeye devretmek istiyor musun? Bu işlem geri alınamaz.`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(msg)) onTransferLeadership(targetUid);
    } else {
      Alert.alert('Liderliği Devret', msg, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Devret', style: 'destructive', onPress: () => onTransferLeadership(targetUid) },
      ]);
    }
  }

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
      {/* Join requests — leader/officer görür */}
      {isLeaderOrOfficer && visibleRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Katılım İstekleri ({visibleRequests.length})</Text>
          {visibleRequests.map(req => (
            <View key={req.uid} style={styles.requestRow}>
              <View style={styles.requestInfo}>
                <Text style={styles.memberName}>{req.displayName}</Text>
                <Text style={styles.memberStat}>
                  {t('common.power')}: {formatNumber(req.power)} · HQ: {req.hqLevel}
                </Text>
              </View>
              <Pressable style={styles.approveBtn} onPress={() => handleApprove(req.uid)}>
                <Text style={styles.approveBtnText}>✓</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={() => handleReject(req.uid)}>
                <Text style={styles.rejectBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Member list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('alliance.membersTitle', { count: String(members.length) })}</Text>
        {members.map(member => {
          const online = isOnline(member.lastOnline);
          const isMe = member.uid === myUid;
          const canManage = isLeaderOrOfficer && !isMe && member.rank !== 'leader';
          const canMakeLeader = myRank === 'leader' && !isMe;

          return (
            <View key={member.uid} style={styles.memberCard}>
              <View style={styles.memberOnlineDot}>
                <View style={[styles.onlineDot, online ? styles.onlineDotGreen : styles.onlineDotGrey]} />
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.displayName}{isMe ? ' (Sen)' : ''}</Text>
                  <Text style={[styles.rankBadge, { color: rankBadgeColor(member.rank) }]}>
                    {rankLabel(member.rank)}
                  </Text>
                </View>
                <Text style={styles.memberStat}>
                  {t('alliance.powerContribution', { power: formatNumber(member.power), contribution: formatNumber(member.contribution) })}
                </Text>
              </View>
              {isLeader && !isMe && member.rank !== 'leader' && (
                <View style={styles.memberActions}>
                  <Pressable
                    style={styles.memberActionBtn}
                    onPress={() => setRoleDropdownUid(roleDropdownUid === member.uid ? null : member.uid)}
                  >
                    <Text style={styles.memberActionBtnText}>{t('alliance.roleBtn')}</Text>
                  </Pressable>
                </View>
              )}
              {isLeader && roleDropdownUid === member.uid && (
                <View style={styles.roleDropdown}>
                  {ASSIGNABLE_RANKS.map(r => {
                    const info = RANK_INFO[r];
                    const isActive = member.rank === r;
                    return (
                      <Pressable
                        key={r}
                        style={[styles.roleOption, isActive && styles.roleOptionActive]}
                        onPress={async () => {
                          if (!isActive) await onPromote(member.uid, r);
                          setRoleDropdownUid(null);
                        }}
                      >
                        <Text style={[styles.roleOptionText, isActive && { color: info.color, fontWeight: '800' }]}>
                          {info.icon} {t(`alliance.roles.${r}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Donate Tab (Gelişmiş) ────────────────────────────────────
interface DonateTabProps {
  treasury: { cash: number; oil: number; ore: number };
  allianceLevel: number;
  activeBoost: { type: string; endsAt: number } | null;
  cashAmount: number;
  oilAmount: number;
  oreAmount: number;
  myRank: string | null;
  myUid: string | null;
  members: { uid: string; displayName: string; rank: string; contribution: number }[];
  onDonate: (resource: 'cash' | 'oil' | 'ore', amount: number) => Promise<void>;
  canAfford: (resource: 'cash' | 'oil' | 'ore', amount: number) => boolean;
  onSendFromTreasury: (targetUid: string, targetName: string, resource: 'cash' | 'oil' | 'ore', amount: number) => Promise<void>;
  onUpgradeLevel: () => Promise<void>;
  onActivateBoost: () => Promise<void>;
}

function DonateTab(props: DonateTabProps) {
  const { treasury, allianceLevel, activeBoost, cashAmount, oilAmount, oreAmount, myRank, myUid, members, onDonate, canAfford, onSendFromTreasury, onUpgradeLevel, onActivateBoost } = props;
  const [sendRes, setSendRes] = useState<'cash' | 'oil' | 'ore'>('cash');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTarget, setSendTarget] = useState('');
  const isLeaderOrOfficer = myRank === 'leader' || myRank === 'officer';
  const canManageTreasury = myRank === 'leader' || myRank === 'economy';

  const RES_INFO = [
    { key: 'cash' as const, label: t('common.cash'), icon: '💵', current: cashAmount, treasury: treasury.cash },
    { key: 'oil' as const, label: t('common.oil'), icon: '🛢️', current: oilAmount, treasury: treasury.oil },
    { key: 'ore' as const, label: t('common.ore'), icon: '⛏️', current: oreAmount, treasury: treasury.ore },
  ];

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
      {/* ══ KASA ══ */}
        <View>
          {/* Kasa Durumu */}
          <View style={styles.donateCard}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{t('alliance.treasuryHeader', { level: String(allianceLevel) })}</Text>
            {RES_INFO.map(r => (
              <Text key={r.key} style={{ color: '#fff', fontSize: 13, marginBottom: 2 }}>{r.icon} {r.label}: {formatNumber(r.treasury)}</Text>
            ))}
            {activeBoost && activeBoost.endsAt > Date.now() && (
              <Text style={{ color: '#f39c12', fontSize: 12, marginTop: 4 }}>{t('alliance.boostActive', { hours: String(Math.round((activeBoost.endsAt - Date.now()) / 3600000)) })}</Text>
            )}
          </View>

          {/* Bağış Yap */}
          <Text style={styles.sectionTitle}>{t('alliance.donateTitle')}</Text>
          {RES_INFO.map(res => (
            <View key={res.key} style={styles.donateCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{res.icon} {res.label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('alliance.balance', { amount: formatNumber(res.current) })}</Text>
              </View>
              <View style={styles.donateBtnRow}>
                {DONATE_AMOUNTS.map(amt => (
                  <Pressable key={amt} style={[styles.donateAmountBtn, !canAfford(res.key, amt) && styles.donateAmountBtnDisabled]} onPress={() => onDonate(res.key, amt)} disabled={!canAfford(res.key, amt)}>
                    <Text style={[styles.donateAmountText, !canAfford(res.key, amt) && styles.donateAmountTextDisabled]}>{formatNumber(amt)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {/* Kasa Kullanımları (lider/ekonomi bakanı) */}
          {canManageTreasury && (
            <>
              <Text style={styles.sectionTitle}>{t('alliance.treasuryUses')}</Text>
              <View style={styles.donateCard}>
                {allianceLevel < 10 && (
                  <>
                    <Pressable style={[styles.donateAmountBtn, { paddingVertical: 10, marginBottom: 4 }]} onPress={async () => {
                      try { await onUpgradeLevel(); } catch (e: any) { if (typeof alert !== 'undefined') alert(e.message); }
                    }}>
                      <Text style={styles.donateAmountText}>{t('alliance.upgradeAlliance', { level: String(allianceLevel + 1) })}</Text>
                    </Pressable>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 8, textAlign: 'center' }}>
                      {t('alliance.upgradeCost', { cost: formatNumber([0,0,100000,250000,500000,1000000,2000000,3000000,5000000,7000000,10000000][allianceLevel + 1] ?? 0) })}
                    </Text>
                  </>
                )}
                {!(activeBoost && activeBoost.endsAt > Date.now()) && (
                  <Pressable style={[styles.donateAmountBtn, { paddingVertical: 10 }]} onPress={async () => {
                    try { await onActivateBoost(); } catch (e: any) { if (typeof alert !== 'undefined') alert(e.message); }
                  }}>
                    <Text style={styles.donateAmountText}>{t('alliance.boostBtn')}</Text>
                  </Pressable>
                )}
              </View>

              {/* Kasadan Üyeye Gönder */}
              <Text style={styles.sectionTitle}>{t('alliance.sendToMember')}</Text>
              <View style={styles.donateCard}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  {RES_INFO.map(r => (
                    <Pressable key={r.key} style={[styles.chip, sendRes === r.key && styles.chipActive]} onPress={() => setSendRes(r.key)}>
                      <Text style={[styles.chipText, sendRes === r.key && styles.chipTextActive]}>{r.icon} {r.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  {members.filter(m => m.uid !== myUid).map(m => (
                    <Pressable key={m.uid} style={[styles.chip, sendTarget === m.uid && styles.chipActive]} onPress={() => setSendTarget(m.uid)}>
                      <Text style={[styles.chipText, sendTarget === m.uid && styles.chipTextActive]}>{m.displayName}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput style={[styles.settingsInput, { flex: 1 }]} placeholder={t('alliance.amountPlaceholder')} placeholderTextColor={colors.textMuted} value={sendAmount} onChangeText={setSendAmount} keyboardType="number-pad" />
                  <Pressable style={[styles.donateAmountBtn, { paddingHorizontal: 16 }, (!sendTarget || !sendAmount) && { opacity: 0.4 }]} onPress={async () => {
                    const amt = parseInt(sendAmount, 10);
                    if (!amt || !sendTarget) return;
                    const name = members.find(m => m.uid === sendTarget)?.displayName ?? '?';
                    await onSendFromTreasury(sendTarget, name, sendRes, amt);
                    setSendAmount('');
                  }} disabled={!sendTarget || !sendAmount}>
                    <Text style={styles.donateAmountText}>{t('alliance.sendBtn')}</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
    </ScrollView>
  );
}

// ─── War Tab ──────────────────────────────────────────────────
interface WarTabProps {
  activeWar: AllianceWar | null;
  myAllianceName: string;
  myRank: string | null;
  myAllianceId: string | null;
  warBattleLogs: any[];
  onDeclareWar: (enemyId: string) => Promise<boolean>;
  onGetEnemyMembers: () => Promise<AllianceMemberData[]>;
  getAllianceRankings: () => Promise<AllianceData[]>;
  birlikler: import('../state/types').Birlik[];
  activeMarch: any;
  attackPvPTarget: any;
  getPvPCooldown: (uid: string) => number;
}

function WarTab({ activeWar, myAllianceName, myRank, myAllianceId, warBattleLogs, onDeclareWar, onGetEnemyMembers, getAllianceRankings, birlikler, activeMarch, attackPvPTarget, getPvPCooldown }: WarTabProps) {
  const [targets, setTargets] = useState<AllianceData[]>([]);
  const [enemyMembers, setEnemyMembers] = useState<AllianceMemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [warError, setWarError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [attackTarget, setAttackTarget] = useState<AllianceMemberData | null>(null);
  const [selectedBirlikIds, setSelectedBirlikIds] = useState<Set<string>>(new Set());
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const isLeaderOrOfficer = myRank === 'leader' || myRank === 'officer';

  // Cooldown timer
  useEffect(() => {
    if (!attackTarget) { setCooldownLeft(0); return; }
    const update = () => setCooldownLeft(getPvPCooldown(attackTarget.uid));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [attackTarget, getPvPCooldown]);

  // Geri sayım
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

      {/* Saldırı Modalı */}
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

// ─── War Reports Tab ──────────────────────────────────────────
function WarReportsTab({ warBattleLogs }: { warBattleLogs: any[] }) {
  const [selectedLog, setSelectedLog] = useState<BattleReport | null>(null);
  const warResults = warBattleLogs.filter(l => l.type === 'warResult');
  const battleLogs = warBattleLogs.filter(l => l.type !== 'warResult');

  return (
    <>
      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {/* Savaş sonuç raporları */}
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

        {/* Normal savaş raporları */}
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

// ─── Settings Tab ─────────────────────────────────────────────
interface SettingsTabProps {
  allianceName: string;
  allianceTag: string;
  allianceJoinType: string;
  myRank: string | null;
  myAllianceId: string | null;
  members: { uid: string; displayName: string; rank: string }[];
  loading: boolean;
  onLeave: () => void;
  onDisband: () => void;
  onKick: (uid: string) => Promise<void>;
  onTransferLeadership: (uid: string) => void;
  onUpdateInfo: (updates: { name?: string; tag?: string; joinType?: 'open' | 'approval' }) => Promise<void>;
}

function SettingsTab({ allianceName, allianceTag, allianceJoinType, myRank, myAllianceId, members, loading, onLeave, onDisband, onKick, onTransferLeadership, onUpdateInfo }: SettingsTabProps) {
  const [editName, setEditName] = useState(allianceName);
  const [editTag, setEditTag] = useState(allianceTag);
  const [editJoinType, setEditJoinType] = useState(allianceJoinType);
  const [kickUid, setKickUid] = useState('');
  const [transferUid, setTransferUid] = useState('');
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLeader = myRank === 'leader';

  const otherMembers = members.filter(m => m.rank !== 'leader');

  async function handleSaveInfo() {
    setSaving(true);
    const updates: any = {};
    if (editName !== allianceName) updates.name = editName;
    if (editTag !== allianceTag) updates.tag = editTag;
    if (editJoinType !== allianceJoinType) updates.joinType = editJoinType;
    if (Object.keys(updates).length > 0) await onUpdateInfo(updates);
    setSaving(false);
  }

  function doKick() {
    if (!kickUid) return;
    const name = members.find(m => m.uid === kickUid)?.displayName ?? '?';
    const msg = `${name} ittifaktan atılsın mı?`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(msg)) onKick(kickUid);
    } else {
      Alert.alert('Üyeyi At', msg, [
        { text: 'İptal', style: 'cancel' },
        { text: 'At', style: 'destructive', onPress: () => onKick(kickUid) },
      ]);
    }
  }

  function doTransfer() {
    if (!transferUid) return;
    const name = members.find(m => m.uid === transferUid)?.displayName ?? '?';
    const msg = `Liderliği ${name} adlı üyeye devretmek istiyor musun? Bu işlem geri alınamaz.`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(msg)) onTransferLeadership(transferUid);
    } else {
      Alert.alert('Liderliği Devret', msg, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Devret', style: 'destructive', onPress: () => onTransferLeadership(transferUid) },
      ]);
    }
  }

  function doDisband() {
    if (!confirm1 || !confirm2) return;
    const msg = `"${allianceName}" ittifakı kalıcı olarak silinecek. GERİ ALINAMAZ!`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(msg)) onDisband();
    } else {
      Alert.alert('İttifakı Sil', msg, [
        { text: 'İptal', style: 'cancel' },
        { text: 'SİL', style: 'destructive', onPress: onDisband },
      ]);
    }
  }

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
      {/* ── İttifak Detayları ── */}
      {isLeader && (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('alliance.settingsTitle')}</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>{t('alliance.settingsName')}</Text>
            <TextInput style={styles.settingsInput} value={editName} onChangeText={setEditName} placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>{t('alliance.settingsTag')}</Text>
            <TextInput style={styles.settingsInput} value={editTag} onChangeText={v => setEditTag(v.toUpperCase().slice(0, 5))} maxLength={5} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>{t('alliance.settingsJoinType')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={[styles.settingsToggle, editJoinType === 'open' && styles.settingsToggleActive]} onPress={() => setEditJoinType('open')}>
                <Text style={[styles.settingsToggleText, editJoinType === 'open' && styles.settingsToggleTextActive]}>{t('alliance.settingsOpen')}</Text>
              </Pressable>
              <Pressable style={[styles.settingsToggle, editJoinType === 'approval' && styles.settingsToggleActive]} onPress={() => setEditJoinType('approval')}>
                <Text style={[styles.settingsToggleText, editJoinType === 'approval' && styles.settingsToggleTextActive]}>{t('alliance.settingsApproval')}</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSaveInfo} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : t('alliance.settingsSave')}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Kullanıcıyı Kickle ── */}
      {isLeader && otherMembers.length > 0 && (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('alliance.kickSection')}</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>{t('alliance.memberLabel')}</Text>
            <View style={styles.settingsDropdown}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable style={[styles.dropdownItem, !kickUid && styles.dropdownItemActive]} onPress={() => setKickUid('')}>
                  <Text style={[styles.dropdownItemText, !kickUid && styles.dropdownItemTextActive]}>{t('alliance.selectPlaceholder')}</Text>
                </Pressable>
                {otherMembers.map(m => (
                  <Pressable key={m.uid} style={[styles.dropdownItem, kickUid === m.uid && styles.dropdownItemActive]} onPress={() => setKickUid(m.uid)}>
                    <Text style={[styles.dropdownItemText, kickUid === m.uid && styles.dropdownItemTextActive]}>{m.displayName}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable style={[styles.dangerBtn, !kickUid && { opacity: 0.4 }]} onPress={doKick} disabled={!kickUid || loading}>
            <Text style={styles.dangerBtnText}>{t('alliance.kickBtn')}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Liderliği Devret ── */}
      {isLeader && otherMembers.length > 0 && (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('alliance.transferSection')}</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>{t('alliance.memberLabel')}</Text>
            <View style={styles.settingsDropdown}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable style={[styles.dropdownItem, !transferUid && styles.dropdownItemActive]} onPress={() => setTransferUid('')}>
                  <Text style={[styles.dropdownItemText, !transferUid && styles.dropdownItemTextActive]}>{t('alliance.selectPlaceholder')}</Text>
                </Pressable>
                {otherMembers.map(m => (
                  <Pressable key={m.uid} style={[styles.dropdownItem, transferUid === m.uid && styles.dropdownItemActive]} onPress={() => setTransferUid(m.uid)}>
                    <Text style={[styles.dropdownItemText, transferUid === m.uid && styles.dropdownItemTextActive]}>{m.displayName}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable style={[styles.dangerBtn, { backgroundColor: '#b7950b' }, !transferUid && { opacity: 0.4 }]} onPress={doTransfer} disabled={!transferUid || loading}>
            <Text style={styles.dangerBtnText}>{t('alliance.transferBtn')}</Text>
          </Pressable>
        </View>
      )}

      {/* ── İttifaktan Ayrıl ── */}
      <View style={styles.settingsSection}>
        <Pressable style={[styles.dangerBtn, loading && { opacity: 0.4 }]} onPress={() => {
          const msg = t('alliance.leaveMsg', { name: allianceName });
          if (typeof window !== 'undefined' && window.confirm) { if (window.confirm(msg)) onLeave(); }
          else Alert.alert(t('alliance.leaveTitle'), msg, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('alliance.leaveAction'), style: 'destructive', onPress: onLeave }]);
        }} disabled={loading}>
          <Text style={styles.dangerBtnText}>{t('alliance.leaveBtn')}</Text>
        </Pressable>
      </View>

      {/* ── İttifakı Sil ── */}
      {isLeader && (
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: '#c0392b' }]}>{t('alliance.disbandSection')}</Text>
          <Text style={styles.settingsWarning}>{t('alliance.disbandWarning')}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginVertical: 8 }}>
            <Pressable onPress={() => setConfirm1(!confirm1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.checkbox, confirm1 && styles.checkboxChecked]} />
              <Text style={styles.settingsLabel}>{t('alliance.confirm1')}</Text>
            </Pressable>
            <Pressable onPress={() => setConfirm2(!confirm2)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.checkbox, confirm2 && styles.checkboxChecked]} />
              <Text style={styles.settingsLabel}>{t('alliance.confirm2')}</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.dangerBtn, styles.dangerBtnExtreme, (!confirm1 || !confirm2) && { opacity: 0.3 }]} onPress={doDisband} disabled={!confirm1 || !confirm2 || loading}>
            <Text style={styles.dangerBtnText}>{t('alliance.disbandBtn')}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Alliance Header ──────────────────────────────────────────
interface AllianceHeaderProps {
  tag: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  totalPower: number;
  treasury: { cash: number; oil: number; ore: number };
}

function AllianceHeader({ tag, name, memberCount, maxMembers, totalPower, treasury }: AllianceHeaderProps) {
  return (
    <View style={styles.allianceHeader}>
      <View style={styles.allianceHeaderTop}>
        <Text style={styles.allianceHeaderTag}>[{tag}]</Text>
        <Text style={styles.allianceHeaderName}>{name}</Text>
      </View>
      <View style={styles.allianceHeaderStats}>
        <Text style={styles.headerStat}>👥 {memberCount}/{maxMembers}</Text>
        <Text style={styles.headerStat}>⚔️ {formatNumber(totalPower)}</Text>
      </View>
      <View style={styles.treasuryRow}>
        <Text style={styles.treasuryLabel}>Kasa:</Text>
        <Text style={styles.treasuryItem}>💵 {formatNumber(treasury.cash)}</Text>
        <Text style={styles.treasuryItem}>🛢️ {formatNumber(treasury.oil)}</Text>
        <Text style={styles.treasuryItem}>⛏️ {formatNumber(treasury.ore)}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
const MEMBER_TAB_KEYS = ['alliance.tabs.members', 'alliance.tabs.donate', 'alliance.tabs.war', 'alliance.tabs.reports', 'alliance.tabs.chat', 'alliance.tabs.settings'];

export function AllianceScreen({ onGoToLeaderboard }: { onGoToLeaderboard?: () => void } = {}) {
  const { alliance, gold, getResource, uid, playerPower, birlikler, activeMarch, attackPvPTarget, getPvPCooldown } = useDesertGame();
  const {
    myAllianceId,
    myAllianceData,
    allianceMembers,
    allianceChatMessages,
    allianceJoinRequests,
    myAllianceRank,
    allianceLoading,
    allianceError,
    createAlliance,
    joinAlliance,
    requestJoinAlliance,
    leaveAlliance,
    disbandAlliance,
    sendChatMessage,
    donateToAlliance,
    approveJoinRequest,
    rejectJoinRequest,
    kickMember,
    promoteMember,
    transferLeadership,
    searchAlliances,
    getAllianceRankings,
    declareWar,
    getEnemyMembers,
    sendFromTreasury,
    upgradeAllianceLevel,
    activateAllianceBoost,
  } = alliance;

  const [activeTab, setActiveTab] = useState(0);

  const cashAmount = getResource('cash').amount;
  const oilAmount = getResource('oil').amount;
  const oreAmount = getResource('ore').amount;

  function canAffordResource(resource: 'cash' | 'oil' | 'ore', amount: number): boolean {
    switch (resource) {
      case 'cash': return cashAmount >= amount;
      case 'oil': return oilAmount >= amount;
      case 'ore': return oreAmount >= amount;
    }
  }

  function handleLeave() {
    leaveAlliance();
  }

  function handleDisband() {
    disbandAlliance();
  }

  function handleTransferLeadership(targetUid: string) {
    transferLeadership(targetUid);
  }

  // ── No Alliance ──────────────────────────────────────────────
  if (myAllianceId === null) {
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>{t('alliance.title')}</Text>
        </View>
        <NoAllianceView
          gold={gold}
          loading={allianceLoading}
          error={allianceError}
          onCreate={createAlliance}
          onJoin={joinAlliance}
          onRequest={requestJoinAlliance}
          onSearch={searchAlliances}
          onGetRankings={getAllianceRankings}
        />
      </View>
    );
  }

  // ── In Alliance ──────────────────────────────────────────────
  const headerData = myAllianceData ?? {
    tag: '???',
    name: 'Yükleniyor...',
    memberCount: allianceMembers.length,
    maxMembers: 30,
    totalPower: 0,
    treasury: { cash: 0, oil: 0, ore: 0 },
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{t('alliance.title')}</Text>
        {allianceLoading && <ActivityIndicator size="small" color={colors.sand} style={styles.headerLoader} />}
      </View>

      <AllianceHeader
        tag={headerData.tag}
        name={headerData.name}
        memberCount={headerData.memberCount}
        maxMembers={headerData.maxMembers}
        totalPower={headerData.totalPower}
        treasury={headerData.treasury}
      />

      {/* Savaş saldırı banner'ı */}
      {myAllianceData?.activeWar?.lastAttack && (Date.now() - myAllianceData.activeWar.lastAttack.timestamp) < 30000 && (
        <View style={styles.warBanner}>
          <Text style={styles.warBannerText}>
            {myAllianceData.activeWar.lastAttack.won
              ? t('alliance.warBannerWon', { attacker: myAllianceData.activeWar.lastAttack.attackerName, defender: myAllianceData.activeWar.lastAttack.defenderName, score: formatNumber(myAllianceData.activeWar.lastAttack.score) })
              : t('alliance.warBannerLost', { defender: myAllianceData.activeWar.lastAttack.defenderName, attacker: myAllianceData.activeWar.lastAttack.attackerName })
            }
          </Text>
        </View>
      )}

      <SectionTabs tabs={MEMBER_TAB_KEYS.map(k => t(k))} active={activeTab} onPress={setActiveTab} />

      {activeTab === 0 && (
        <MembersTab
          members={allianceMembers}
          joinRequests={allianceJoinRequests}
          myUid={uid}
          myRank={myAllianceRank}
          onKick={kickMember}
          onPromote={promoteMember}
          onTransferLeadership={handleTransferLeadership}
          onApprove={approveJoinRequest}
          onReject={rejectJoinRequest}
        />
      )}

      {activeTab === 1 && (
        <DonateTab
          treasury={headerData.treasury}
          allianceLevel={myAllianceData?.allianceLevel ?? 1}
          activeBoost={myAllianceData?.activeBoost ?? null}
          cashAmount={cashAmount}
          oilAmount={oilAmount}
          oreAmount={oreAmount}
          myRank={myAllianceRank}
          myUid={uid}
          members={allianceMembers}
          onDonate={donateToAlliance}
          canAfford={canAffordResource}
          onSendFromTreasury={sendFromTreasury}
          onUpgradeLevel={upgradeAllianceLevel}
          onActivateBoost={activateAllianceBoost}
        />
      )}

      {activeTab === 2 && (
        <WarTab
          activeWar={myAllianceData?.activeWar ?? null}
          myAllianceName={headerData.name}
          myRank={myAllianceRank}
          myAllianceId={myAllianceId}
          warBattleLogs={[]}
          onDeclareWar={declareWar}
          onGetEnemyMembers={getEnemyMembers}
          getAllianceRankings={getAllianceRankings}
          birlikler={birlikler}
          activeMarch={activeMarch}
          attackPvPTarget={attackPvPTarget}
          getPvPCooldown={getPvPCooldown}
        />
      )}

      {activeTab === 3 && (
        <WarReportsTab warBattleLogs={alliance.warBattleLogs} />
      )}

      {activeTab === 4 && (
        <ChatTab
          messages={allianceChatMessages}
          onSend={sendChatMessage}
        />
      )}

      {activeTab === 5 && (
        <SettingsTab
          allianceName={headerData.name}
          allianceTag={headerData.tag}
          allianceJoinType={myAllianceData?.joinType ?? 'approval'}
          myRank={myAllianceRank}
          myAllianceId={myAllianceId}
          members={allianceMembers}
          loading={allianceLoading}
          onLeave={handleLeave}
          onDisband={handleDisband}
          onKick={kickMember}
          onTransferLeadership={handleTransferLeadership}
          onUpdateInfo={async (updates) => {
            if (myAllianceId) await updateAllianceInfo(myAllianceId, updates);
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.sand,
    flex: 1,
  },
  headerLoader: {
    marginLeft: 8,
  },

  // Alliance Header
  allianceHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  allianceHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allianceHeaderTag: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
  },
  allianceHeaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  allianceHeaderStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  headerStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  treasuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  treasuryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  treasuryItem: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.sand,
  },
  tabBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: colors.sand,
    fontWeight: '700',
  },

  // Error / info
  errorText: {
    color: colors.dangerLight,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  errorBanner: {
    backgroundColor: colors.danger,
    color: colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },

  // Sections
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  refreshBtn: {
    fontSize: 13,
    color: colors.sand,
    paddingHorizontal: 4,
  },
  tabScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },

  // No Alliance
  noAllianceScroll: {
    flex: 1,
  },
  noAllianceContent: {
    padding: 16,
  },
  actionCardRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    overflow: 'hidden',
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  actionCardSearch: {
    opacity: 0.6,
  },
  actionCardDivider: {
    width: 1,
    backgroundColor: colors.panelBorder,
  },
  actionCardIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionCardSub: {
    fontSize: 11,
    color: colors.sand,
    marginTop: 2,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: colors.military,
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Alliance rows (no-alliance list)
  allianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  rankNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
    width: 28,
    textAlign: 'center',
  },
  allianceRowInfo: {
    flex: 1,
  },
  allianceTagText: {
    fontSize: 11,
    color: colors.sand,
    fontWeight: '700',
  },
  allianceNameText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  allianceStatText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: colors.military,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  joinBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 12,
    gap: 6,
  },
  chatEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  systemMsgRow: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  systemMsgText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  chatMsgRow: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 8,
  },
  chatMsgName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    marginBottom: 2,
  },
  chatMsgTime: {
    fontSize: 10,
    color: colors.textMuted,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  chatMsgText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
    backgroundColor: colors.surface,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: colors.textPrimary,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: colors.military,
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  sendBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Members
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  memberOnlineDot: {
    width: 10,
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDotGreen: {
    backgroundColor: colors.success,
  },
  onlineDotGrey: {
    backgroundColor: colors.metalDark,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rankBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberStat: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 4,
  },
  memberActionBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  memberActionBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  memberActionBtnTextDanger: {
    fontSize: 11,
    color: colors.dangerLight,
    fontWeight: '600',
  },
  memberActionBtnTextGold: {
    fontSize: 11,
    color: colors.sand,
    fontWeight: '600',
  },

  // Role dropdown
  roleDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: 8,
    marginTop: 6,
    padding: 4,
  },
  roleOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  roleOptionActive: {
    backgroundColor: colors.militaryDark,
  },
  roleOptionText: {
    color: colors.textPrimary,
    fontSize: 13,
  },

  // Join requests
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  requestInfo: {
    flex: 1,
  },
  approveBtn: {
    backgroundColor: colors.military,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  approveBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: colors.buttonDanger,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rejectBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Donate
  donateInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  donateCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 12,
    marginBottom: 12,
  },
  donateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  donateCardIcon: {
    fontSize: 18,
  },
  donateCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  donateCardTreasury: {
    fontSize: 11,
    color: colors.textMuted,
  },
  donateCardBalance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  donateBtnRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  donateAmountBtn: {
    flex: 1,
    minWidth: 60,
    backgroundColor: colors.military,
    borderRadius: 5,
    paddingVertical: 7,
    alignItems: 'center',
  },
  donateAmountBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  donateAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  donateAmountTextDisabled: {
    color: colors.buttonDisabledText,
  },

  // Chips (bağış alt sekmeleri, kaynak seçimi, üye seçimi)
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  chipActive: {
    backgroundColor: colors.military,
    borderColor: colors.sand,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Settings
  settingsSection: {
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  settingsLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 70,
  },
  settingsInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
  },
  settingsToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surfaceAlt,
  },
  settingsToggleActive: {
    backgroundColor: colors.military,
    borderColor: colors.sand,
  },
  settingsToggleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  settingsToggleTextActive: {
    color: '#fff',
  },
  settingsDropdown: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 4,
  },
  dropdownItemActive: {
    backgroundColor: colors.military,
  },
  dropdownItemText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dropdownItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.military,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
  },
  checkboxChecked: {
    backgroundColor: '#c0392b',
    borderColor: '#c0392b',
  },
  settingsWarning: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: 10,
    lineHeight: 18,
  },
  dangerBtn: {
    backgroundColor: colors.buttonDanger,
    borderWidth: 1,
    borderColor: colors.buttonDangerBorder,
    borderRadius: 7,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dangerBtnExtreme: {
    borderColor: colors.dangerLight,
    backgroundColor: colors.danger,
  },
  dangerBtnDisabled: {
    opacity: 0.5,
  },
  dangerBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
  },
  textInputMulti: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  joinTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  joinTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  joinTypeBtnActive: {
    borderColor: colors.sand,
    backgroundColor: colors.militaryDark,
  },
  joinTypeBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  joinTypeBtnTextActive: {
    color: colors.sand,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
  },
  costLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  costValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sand,
  },
  costInsufficient: {
    color: colors.dangerLight,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: colors.military,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  confirmBtnText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  surfaceAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  // War banner
  warBanner: { backgroundColor: '#1A0A00', borderWidth: 1, borderColor: colors.sand, borderRadius: 6, padding: 8, marginBottom: 6 },
  warBannerText: { color: colors.sand, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  // War tab
  warHeader: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  warTitle: { color: colors.sand, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  warEnemy: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  warTimer: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  warDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 4, paddingHorizontal: 8 },
  warScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 12 },
  warScoreBlock: { alignItems: 'center', flex: 1 },
  warScoreLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  warScoreValue: { fontSize: 24, fontWeight: '800' },
  warVs: { color: colors.textMuted, fontSize: 16, fontWeight: '800' },
  warBar: { height: 8, backgroundColor: colors.danger, borderRadius: 4, overflow: 'hidden', marginHorizontal: 16 },
  warBarFill: { height: '100%', borderRadius: 4 },
  warHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20, paddingHorizontal: 16 },
  warDeclareBtn: { backgroundColor: colors.sand, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginVertical: 12, marginHorizontal: 16 },
  warDeclareBtnText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  warTargetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
  warAttackBtn: { backgroundColor: '#8B0000', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  warAttackBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  warModalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  warModal: { width: '100%', maxWidth: 360, maxHeight: '85%', backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.panelBorder, overflow: 'hidden' },
  warModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.panelBorder },
  warModalTitle: { color: colors.sand, fontSize: 16, fontWeight: '800' },
  warModalClose: { color: colors.textMuted, fontSize: 18, padding: 4 },
  warModalName: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  warBirlikCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
  warBirlikCardSel: { backgroundColor: 'rgba(196,164,85,0.12)' },
  warLogRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
});
