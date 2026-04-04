import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { styles } from '../../screens/AllianceScreen.styles';

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

export function SettingsTab({ allianceName, allianceTag, allianceJoinType, myRank, myAllianceId, members, loading, onLeave, onDisband, onKick, onTransferLeadership, onUpdateInfo }: SettingsTabProps) {
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

      <View style={styles.settingsSection}>
        <Pressable style={[styles.dangerBtn, loading && { opacity: 0.4 }]} onPress={() => {
          const msg = t('alliance.leaveMsg', { name: allianceName });
          if (typeof window !== 'undefined' && window.confirm) { if (window.confirm(msg)) onLeave(); }
          else Alert.alert(t('alliance.leaveTitle'), msg, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('alliance.leaveAction'), style: 'destructive', onPress: onLeave }]);
        }} disabled={loading}>
          <Text style={styles.dangerBtnText}>{t('alliance.leaveBtn')}</Text>
        </Pressable>
      </View>

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
