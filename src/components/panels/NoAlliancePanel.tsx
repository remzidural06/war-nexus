import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/formatters';
import { styles } from '../../screens/AllianceScreen.styles';
import { CREATE_COST_GOLD } from '../../screens/AllianceScreen.constants';
import type { AllianceData, AllianceJoinType } from '../../state/types';

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
      return;
    }
    if (tag.length > 5) {
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

export function NoAllianceView({
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
