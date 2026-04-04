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

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useDesertGame } from '../state/DesertGameContext';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import { formatNumber } from '../utils/formatters';
import { updateAllianceInfo } from '../services/allianceService';
import { styles } from './AllianceScreen.styles';
import { MEMBER_TAB_KEYS } from './AllianceScreen.constants';

// Panels
import { NoAllianceView } from '../components/panels/NoAlliancePanel';
import { ChatTab } from '../components/panels/AllianceChatPanel';
import { MembersTab } from '../components/panels/AllianceMembersPanel';
import { DonateTab } from '../components/panels/AllianceDonatePanel';
import { WarTab } from '../components/panels/AllianceWarPanel';
import { WarReportsTab } from '../components/panels/AllianceReportsPanel';
import { SettingsTab } from '../components/panels/AllianceSettingsPanel';

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

// ─── Main Screen ────────────────────────────────────���─────────

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

  // ── No Alliance ────────────────────────────────���─────────────
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
          onTransferLeadership={(targetUid) => transferLeadership(targetUid)}
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
          onLeave={() => leaveAlliance()}
          onDisband={() => disbandAlliance()}
          onKick={kickMember}
          onTransferLeadership={(targetUid) => transferLeadership(targetUid)}
          onUpdateInfo={async (updates) => {
            if (myAllianceId) await updateAllianceInfo(myAllianceId, updates);
          }}
        />
      )}
    </View>
  );
}
