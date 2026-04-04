import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/formatters';
import { styles } from '../../screens/AllianceScreen.styles';
import { isOnline, rankLabel, rankBadgeColor, RANK_INFO, ASSIGNABLE_RANKS } from '../../screens/AllianceScreen.constants';

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

export function MembersTab({
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('alliance.membersTitle', { count: String(members.length) })}</Text>
        {members.map(member => {
          const online = isOnline(member.lastOnline);
          const isMe = member.uid === myUid;

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
