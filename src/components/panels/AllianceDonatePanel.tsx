import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/formatters';
import { styles } from '../../screens/AllianceScreen.styles';
import { DONATE_AMOUNTS } from '../../screens/AllianceScreen.constants';

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

export function DonateTab(props: DonateTabProps) {
  const { treasury, allianceLevel, activeBoost, cashAmount, oilAmount, oreAmount, myRank, myUid, members, onDonate, canAfford, onSendFromTreasury, onUpgradeLevel, onActivateBoost } = props;
  const [sendRes, setSendRes] = useState<'cash' | 'oil' | 'ore'>('cash');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTarget, setSendTarget] = useState('');
  const canManageTreasury = myRank === 'leader' || myRank === 'economy';

  const RES_INFO = [
    { key: 'cash' as const, label: t('common.cash'), icon: '💵', current: cashAmount, treasury: treasury.cash },
    { key: 'oil' as const, label: t('common.oil'), icon: '🛢️', current: oilAmount, treasury: treasury.oil },
    { key: 'ore' as const, label: t('common.ore'), icon: '⛏️', current: oreAmount, treasury: treasury.ore },
  ];

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
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

        {/* Kasa Kullanımları */}
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
