import React, { useState, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { UnitImage } from '../components/UnitImage';
import { BUILDING_DEFINITIONS, ALL_BUILDING_IDS } from '../data/buildings';
import { UNIT_DEFINITIONS } from '../data/units';
import { getInteraction } from '../data/combatMatrix';
import type { Interaction } from '../data/combatMatrix';
import { t } from '../i18n';

type HelpTab = 'guide' | 'resources' | 'buildings' | 'hqLevels' | 'combat' | 'pvp' | 'allianceWar' | 'birlik' | 'takas' | 'quests' | 'crossTable' | 'units';

const TAB_ICONS: Record<HelpTab, string> = {
  guide: '📖', resources: '💰', buildings: '🏗️', hqLevels: '🏛️', combat: '⚔️',
  pvp: '🏆', allianceWar: '⚔️', birlik: '🛡️', takas: '🏦', quests: '🎯', crossTable: '🔀', units: '🪖',
};
function getTabInfo(tab: HelpTab) {
  return { label: t(`help.tabs.${tab}.label`), icon: TAB_ICONS[tab], desc: t(`help.tabs.${tab}.desc`) };
}

const formatNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export function HelpScreen() {
  const [openTab, setOpenTab] = useState<HelpTab | null>(null);

  return (
    <View style={s.root}>
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={s.pageTitle}>{t('help.pageTitle')}</Text>
        {(Object.keys(TAB_ICONS) as HelpTab[]).map(tab => {
          const info = getTabInfo(tab);
          return (
            <Pressable key={tab} style={s.menuCard} onPress={() => setOpenTab(tab)}>
              <Text style={s.menuIcon}>{info.icon}</Text>
              <View style={s.menuTextBlock}>
                <Text style={s.menuLabel}>{info.label}</Text>
                <Text style={s.menuDesc}>{info.desc}</Text>
              </View>
              <Text style={s.menuArrow}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Modal */}
      <Modal visible={openTab !== null} animationType="slide" transparent={false}>
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{openTab ? getTabInfo(openTab).label : ''}</Text>
            <Pressable onPress={() => setOpenTab(null)} style={s.modalCloseBtn}>
              <Text style={s.modalCloseText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={s.body}>
            {openTab === 'guide' && <GuideSection />}
            {openTab === 'resources' && <ResourcesSection />}
            {openTab === 'buildings' && <BuildingsTable />}
            {openTab === 'hqLevels' && <HQLevelsTable />}
            {openTab === 'combat' && <CombatSection />}
            {openTab === 'pvp' && <PvPSection />}
            {openTab === 'allianceWar' && <AllianceWarSection />}
            {openTab === 'birlik' && <BirlikSection />}
            {openTab === 'takas' && <TakasSection />}
            {openTab === 'quests' && <QuestsSection />}
            {openTab === 'crossTable' && <CrossTable />}
            {openTab === 'units' && <UnitsTable />}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Binalar Tablosu ──────────────────────────────────────────
function BuildingsTable() {
  const catIcon = (c: string) => c === 'military' ? t('help.catMilitary') : c === 'economy' ? t('help.catEconomy') : t('help.catSupport');
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.buildingsTitle')}</Text>
      {ALL_BUILDING_IDS.map(id => {
        const def = BUILDING_DEFINITIONS[id];
        return (
          <View key={id} style={s.hqCard}>
            <View style={s.hqCardHeader}>
              <Text style={s.hqLvBadge}>{t(`buildings.${id}.name`)}</Text>
              <Text style={s.hqTime}>Max Lv.{def.maxLevel}</Text>
              <Text style={s.hqFeature}>{catIcon(def.category)}</Text>
            </View>
            <Text style={s.hqCost}>
              💵 {formatNum(def.baseCostCash)}   🛢️ {formatNum(def.baseCostOil)}   ⛏️ {formatNum(def.baseCostOre)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Komuta Merkezi Seviyeleri ─────────────────────────────────
function HQLevelsTable() {
  const hqDef = BUILDING_DEFINITIONS.hq;
  const levels = Array.from({ length: hqDef.maxLevel }, (_, i) => i + 1);

  const formatTime = (secs: number) => {
    if (secs < 3600) return t('help.timeMinutes', { m: String(Math.ceil(secs / 60)) });
    const h = Math.floor(secs / 3600);
    const m = Math.ceil((secs % 3600) / 60);
    if (h >= 24) return t('help.timeDaysHours', { d: String(Math.floor(h / 24)), h: String(h % 24) });
    return t('help.timeHoursMinutes', { h: String(h), m: String(m) });
  };

  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.hqLevelsTitle')}</Text>
      {levels.map(lv => {
        const scale = Math.pow(hqDef.costScaleFactor, lv - 1);
        const cash = Math.round(hqDef.baseCostCash * scale);
        const oil = Math.round(hqDef.baseCostOil * scale);
        const ore = Math.round(hqDef.baseCostOre * scale);
        const secs = Math.round(hqDef.baseUpgradeSeconds * Math.pow(hqDef.timeScaleFactor, lv - 1));
        const feature = getHQFeature(lv);
        return (
          <View key={lv} style={s.hqCard}>
            <View style={s.hqCardHeader}>
              <Text style={s.hqLvBadge}>Lv.{lv}</Text>
              <Text style={s.hqTime}>⏱ {formatTime(secs)}</Text>
              {feature !== '—' && <Text style={s.hqFeature}>{feature}</Text>}
            </View>
            <Text style={s.hqCost}>
              💵 {formatNum(cash)}   🛢️ {formatNum(oil)}   ⛏️ {formatNum(ore)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getHQFeature(lv: number): string {
  switch (lv) {
    case 1: return t('help.hqFeature1');
    case 5: return t('help.hqFeature5');
    case 10: return t('help.hqFeature10');
    case 15: return t('help.hqFeature15');
    case 20: return t('help.hqFeature20');
    default: return '—';
  }
}

// ── Çapraz Tablo — Savaş Etkileşim Matrisi ──────────────────
// CAN_ATTACK ve getInteraction artık src/data/combatMatrix.ts'den import ediliyor

const INTERACTION_COLORS: Record<Interaction, string> = {
  canAttack: '#1B5E20',     // yeşil — saldırabilir
  mutual: '#F9A825',        // sarı — karşılıklı
  getsAttacked: '#B71C1C',  // kırmızı — sadece saldırı alır
  none: '#ffffff',          // beyaz — etkileşim yok
};

function getInteractionLabel(i: Interaction): string {
  return t(`help.interaction${i.charAt(0).toUpperCase() + i.slice(1)}`);
}

function CrossTable() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const selectedUnit = useMemo(
    () => UNIT_DEFINITIONS.find(u => u.id === selectedUnitId) ?? null,
    [selectedUnitId],
  );

  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.crossTableTitle')}</Text>

      {/* Lejant */}
      <View style={s.legendRow}>
        {(['canAttack', 'mutual', 'getsAttacked', 'none'] as Interaction[]).map(i => (
          <View key={i} style={s.legendItem}>
            <View style={[s.legendBox, { backgroundColor: INTERACTION_COLORS[i] }]} />
            <Text style={s.legendText}>{getInteractionLabel(i)}</Text>
          </View>
        ))}
      </View>

      {/* Birim seçici — dikey liste */}
      <Text style={s.crossSubtitle}>{t('help.selectUnit')}</Text>
      {UNIT_DEFINITIONS.map(u => (
        <Pressable
          key={u.id}
          style={s.unitPickCard}
          onPress={() => setSelectedUnitId(u.id)}
        >
          {u.imageUri
            ? <UnitImage unitId={u.id} uri={u.imageUri} icon={u.icon} style={s.unitPickCardImg} />
            : <Text style={{ fontSize: 24 }}>{u.icon}</Text>
          }
          <View style={s.unitPickCardInfo}>
            <Text style={s.unitPickCardName} numberOfLines={1}>
              {t(`units.${u.id}.name`)}
            </Text>
            <Text style={s.unitPickCardBranch}>
              {t(`branches.${u.branch}`) ?? u.branch} · T{u.tier} · ATK {u.attackPower}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
        </Pressable>
      ))}

      {/* Etkileşim Modal */}
      <Modal visible={selectedUnit !== null} animationType="slide" transparent={false}>
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={1}>
              {selectedUnit ? t(`units.${selectedUnit.id}.name`) : ''} — {t('help.interactions')}
            </Text>
            <Pressable onPress={() => setSelectedUnitId(null)} style={s.modalCloseBtn}>
              <Text style={s.modalCloseText}>✕</Text>
            </Pressable>
          </View>
          {selectedUnit && (
            <ScrollView style={s.body}>
              {/* Seçili birim başlığı */}
              <View style={s.crossSelectedRow}>
                {selectedUnit.imageUri
                  ? <UnitImage unitId={selectedUnit.id} uri={selectedUnit.imageUri} icon={selectedUnit.icon} style={s.crossSelectedImg} />
                  : <Text style={{ fontSize: 28 }}>{selectedUnit.icon}</Text>
                }
                <View>
                  <Text style={s.crossSelectedName}>{t(`units.${selectedUnit.id}.name`)}</Text>
                  <Text style={s.crossSelectedBranch}>
                    {t(`branches.${selectedUnit.branch}`) ?? selectedUnit.branch} · T{selectedUnit.tier} · ATK {selectedUnit.attackPower} · DEF {selectedUnit.defensePower}
                  </Text>
                </View>
              </View>

              {/* Lejant */}
              <View style={[s.legendRow, { marginTop: 12 }]}>
                {(['canAttack', 'mutual', 'getsAttacked', 'none'] as Interaction[]).map(i => (
                  <View key={i} style={s.legendItem}>
                    <View style={[s.legendBox, { backgroundColor: INTERACTION_COLORS[i] }]} />
                    <Text style={s.legendText}>{getInteractionLabel(i)}</Text>
                  </View>
                ))}
              </View>

              {/* Etkileşim listesi */}
              {UNIT_DEFINITIONS.filter(u => u.id !== selectedUnit.id).map(target => {
                const interaction = getInteraction(selectedUnit.branch, target.branch);
                return (
                  <View key={target.id} style={[s.crossRow, { borderLeftColor: INTERACTION_COLORS[interaction], borderLeftWidth: 4 }]}>
                    {target.imageUri
                      ? <UnitImage unitId={target.id} uri={target.imageUri} icon={target.icon} style={s.crossRowImg} />
                      : <Text style={s.crossRowIcon}>{target.icon}</Text>
                    }
                    <View style={{ flex: 1 }}>
                      <Text style={s.crossRowName} numberOfLines={1}>{t(`units.${target.id}.name`)}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                        {t(`branches.${target.branch}`) ?? target.branch} · T{target.tier}
                      </Text>
                    </View>
                    <View style={[s.crossBadge, { backgroundColor: INTERACTION_COLORS[interaction] + '44' }]}>
                      <Text style={[s.crossBadgeText, { color: INTERACTION_COLORS[interaction] }]}>
                        {t(`help.badge${interaction.charAt(0).toUpperCase() + interaction.slice(1)}`)}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Birimler Tablosu ─────────────────────────────────────────
function UnitsTable() {
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.unitsTitle', { count: String(UNIT_DEFINITIONS.length) })}</Text>
      <View style={s.tableHeader}>
        <Text style={[s.cell, s.cellName, s.headerText]}>{t('help.colUnit')}</Text>
        <Text style={[s.cell, s.cellSm, s.headerText]}>{t('help.colAtk')}</Text>
        <Text style={[s.cell, s.cellSm, s.headerText]}>{t('help.colDef')}</Text>
        <Text style={[s.cell, s.cellSm, s.headerText]}>{t('help.colBranch')}</Text>
        <Text style={[s.cell, s.cellSm, s.headerText]}>{t('help.colMinLv')}</Text>
      </View>
      {UNIT_DEFINITIONS.map(u => (
        <View key={u.id} style={s.tableRow}>
          <View style={[s.cell, s.cellName, s.unitNameCell]}>
            {u.imageUri
              ? <UnitImage unitId={u.id} uri={u.imageUri} icon={u.icon} style={s.unitTableImg} />
              : <Text style={{ fontSize: 14 }}>{u.icon}</Text>
            }
            <Text style={s.cellText} numberOfLines={1}>{t(`units.${u.id}.name`)}</Text>
          </View>
          <Text style={[s.cell, s.cellSm, s.cellText]}>{u.attackPower}</Text>
          <Text style={[s.cell, s.cellSm, s.cellText]}>{u.defensePower}</Text>
          <Text style={[s.cell, s.cellSm, s.cellText]}>{t(`branches.${u.branch}`) ?? u.branch}</Text>
          <Text style={[s.cell, s.cellSm, s.cellText]}>{u.minBuildingLevel}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Başlangıç Rehberi ────────────────────────────────────────
function GuideSection() {
  const steps = Array.from({ length: 7 }, (_, i) => ({
    title: t(`help.guideStep${i + 1}Title`),
    desc: t(`help.guideStep${i + 1}Desc`),
  }));
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.guideTitle')}</Text>
      <Text style={s.guideIntro}>{t('help.guideIntro')}</Text>
      {steps.map((step, i) => (
        <View key={i} style={s.guideCard}>
          <Text style={s.guideStepTitle}>{step.title}</Text>
          <Text style={s.guideStepDesc}>{step.desc}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Kaynaklar & Ekonomi ──────────────────────────────────────
function ResourcesSection() {
  const resources = [
    { icon: '💵', name: t('common.cash'), cap: '3,000,000', source: t('help.cashSource'), usage: t('help.cashUsage') },
    { icon: '🛢️', name: t('common.oil'), cap: '3,000,000', source: t('help.oilSource'), usage: t('help.oilUsage') },
    { icon: '⛏️', name: t('common.ore'), cap: '3,000,000', source: t('help.oreSource'), usage: t('help.oreUsage') },
    { icon: '🪙', name: t('common.gold'), cap: '1,000,000', source: t('help.goldSource'), usage: t('help.goldUsage') },
  ];
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.resourcesTitle')}</Text>
      {resources.map(r => (
        <View key={r.name} style={s.hqCard}>
          <Text style={s.hqLvBadge}>{r.icon} {r.name}</Text>
          <Text style={s.guideStepDesc}>{t('help.resourceCapacity', { cap: r.cap })}</Text>
          <Text style={s.guideStepDesc}>{t('help.resourceSource', { source: r.source })}</Text>
          <Text style={s.guideStepDesc}>{t('help.resourceUsage', { usage: r.usage })}</Text>
        </View>
      ))}
      <Text style={s.sectionTitle}>{t('help.economyTipsTitle')}</Text>
      <View style={s.guideCard}>
        <Text style={s.guideStepDesc}>{t('help.economyTip1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.economyTip2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.economyTip3')}</Text>
        <Text style={s.guideStepDesc}>{t('help.economyTip4')}</Text>
      </View>
    </View>
  );
}

// ── Savaş Kuralları ──────────────────────────────────────────
function CombatSection() {
  const rules = Array.from({ length: 7 }, (_, i) => ({
    title: t(`help.combatRule${i + 1}Title`),
    desc: t(`help.combatRule${i + 1}Desc`),
  }));
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.combatTitle')}</Text>
      {rules.map((r, i) => (
        <View key={i} style={s.guideCard}>
          <Text style={s.guideStepTitle}>{r.title}</Text>
          <Text style={s.guideStepDesc}>{r.desc}</Text>
        </View>
      ))}
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.tierPowerTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.tierPower1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.tierPower2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.tierPower3')}</Text>
      </View>
    </View>
  );
}

// ── PvP & Sıralama ──────────────────────────────────────────
function PvPSection() {
  const rules = Array.from({ length: 6 }, (_, i) => ({
    title: t(`help.pvpRule${i + 1}Title`),
    desc: t(`help.pvpRule${i + 1}Desc`),
  }));
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.pvpTitle')}</Text>
      {rules.map((r, i) => (
        <View key={i} style={s.guideCard}>
          <Text style={s.guideStepTitle}>{r.title}</Text>
          <Text style={s.guideStepDesc}>{r.desc}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Birlik Rehberi ───────────────────────────────────────────
function BirlikSection() {
  const steps = Array.from({ length: 6 }, (_, i) => ({
    title: t(`help.squadRule${i + 1}Title`),
    desc: t(`help.squadRule${i + 1}Desc`),
  }));
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.squadTitle')}</Text>
      {steps.map((r, i) => (
        <View key={i} style={s.guideCard}>
          <Text style={s.guideStepTitle}>{r.title}</Text>
          <Text style={s.guideStepDesc}>{r.desc}</Text>
        </View>
      ))}
    </View>
  );
}

// ── İttifak Savaşları ───────────────────────────────────────
function AllianceWarSection() {
  const rules = Array.from({ length: 6 }, (_, i) => ({
    title: t(`help.awRule${i + 1}Title`),
    desc: t(`help.awRule${i + 1}Desc`),
  }));
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.allianceWarTitle')}</Text>
      {rules.map((r, i) => (
        <View key={i} style={s.guideCard}>
          <Text style={s.guideStepTitle}>{r.title}</Text>
          <Text style={s.guideStepDesc}>{r.desc}</Text>
        </View>
      ))}
      <Text style={[s.sectionTitle, { marginTop: 16 }]}>{t('help.awStrategyTitle')}</Text>
      <View style={s.guideCard}>
        <Text style={s.guideStepDesc}>{t('help.awTip1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.awTip2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.awTip3')}</Text>
        <Text style={s.guideStepDesc}>{t('help.awTip4')}</Text>
        <Text style={s.guideStepDesc}>{t('help.awTip5')}</Text>
        <Text style={s.guideStepDesc}>{t('help.awTip6')}</Text>
      </View>
    </View>
  );
}

// ── Banka & Takas ────────────────────────────────────────────
function TakasSection() {
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.bankTitle')}</Text>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.bankInterestTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankInterestDesc')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.bankExchangeTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankExchangeDesc')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.bankRatesTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankRate1')} {t('common.cash')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankRate2')} {t('common.oil')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankRate3')} {t('common.ore')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.bankBonusTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankBonusDesc')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.bankSpeedTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.bankSpeedDesc')}</Text>
      </View>
    </View>
  );
}

// ── Görevler & İpuçları ──────────────────────────────────────
function QuestsSection() {
  return (
    <View>
      <Text style={s.sectionTitle}>{t('help.questsTitle')}</Text>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.questSystemTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.questSystemDesc')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.questRewardsTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.questRewardsDesc')}</Text>
      </View>

      <Text style={[s.sectionTitle, { marginTop: 16 }]}>{t('help.strategyTitle')}</Text>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.earlyGameTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.earlyTip1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.earlyTip2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.earlyTip3')}</Text>
        <Text style={s.guideStepDesc}>{t('help.earlyTip4')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.midGameTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.midTip1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.midTip2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.midTip3')}</Text>
        <Text style={s.guideStepDesc}>{t('help.midTip4')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.lateGameTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.lateTip1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.lateTip2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.lateTip3')}</Text>
        <Text style={s.guideStepDesc}>{t('help.lateTip4')}</Text>
      </View>
      <View style={s.guideCard}>
        <Text style={s.guideStepTitle}>{t('help.generalTipsTitle')}</Text>
        <Text style={s.guideStepDesc}>{t('help.generalTip1')}</Text>
        <Text style={s.guideStepDesc}>{t('help.generalTip2')}</Text>
        <Text style={s.guideStepDesc}>{t('help.generalTip3')}</Text>
        <Text style={s.guideStepDesc}>{t('help.generalTip4')}</Text>
        <Text style={s.guideStepDesc}>{t('help.generalTip5')}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: 12 },
  pageTitle: { color: colors.sand, fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: 0.5 },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.panelBorder, borderRadius: 10,
    padding: 14, marginBottom: 10, gap: 12,
  },
  menuIcon: { fontSize: 28 },
  menuTextBlock: { flex: 1 },
  menuLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  menuDesc: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  menuArrow: { color: colors.textMuted, fontSize: 24, fontWeight: '300' },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
  },
  modalTitle: { color: colors.sand, fontSize: 16, fontWeight: '800' },
  modalCloseBtn: { padding: 8 },
  modalCloseText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  sectionTitle: { color: colors.sand, fontSize: 14, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt,
    paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4, marginBottom: 2,
  },
  headerText: { color: colors.sand, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  cell: { paddingHorizontal: 2 },
  cellName: { flex: 2, fontSize: 13 },
  cellSm: { flex: 1, fontSize: 12, textAlign: 'center' },
  cellMd: { flex: 3, fontSize: 12 },
  cellText: { color: colors.textSecondary },
  cellBold: { fontWeight: '800', color: colors.sand },
  cellFeature: { color: colors.militaryLight, fontSize: 11 },
  // ── HQ/Bina kart stilleri ──
  hqCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 8, padding: 10, marginBottom: 6,
  },
  hqCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  hqLvBadge: { color: colors.sand, fontSize: 14, fontWeight: '800' },
  hqTime: { color: colors.textSecondary, fontSize: 12 },
  hqFeature: { color: colors.militaryLight, fontSize: 11, fontWeight: '600' },
  hqCost: { color: colors.textSecondary, fontSize: 13 },
  // ── Guide / Rehber stilleri ──
  guideIntro: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  guideCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  guideStepTitle: { color: colors.sand, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  guideStepDesc: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  cellHighlight: { color: colors.sand, fontWeight: '700' },
  // ── Çapraz Tablo stilleri ──
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBox: { width: 12, height: 12, borderRadius: 2 },
  legendText: { color: colors.textMuted, fontSize: 9 },
  crossSubtitle: { color: colors.textSecondary, fontSize: 11, marginBottom: 6 },
  unitPickCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 8, padding: 8, marginBottom: 6,
  },
  unitPickCardSel: { borderColor: colors.sand, backgroundColor: colors.sand + '18' },
  unitPickCardImg: { width: 48, height: 48, borderRadius: 6 },
  unitPickCardInfo: { flex: 1 },
  unitPickCardName: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  unitPickCardNameSel: { color: colors.sand },
  unitPickCardBranch: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  unitPickCardCheck: { color: colors.sand, fontSize: 18, fontWeight: '800' },
  crossResults: { marginTop: 4 },
  crossSelectedName: { color: colors.sand, fontSize: 14, fontWeight: '800' },
  crossSelectedBranch: { color: colors.textMuted, fontSize: 10, marginBottom: 8 },
  crossRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2,
    backgroundColor: colors.surfaceAlt, borderRadius: 4,
  },
  crossRowIcon: { fontSize: 16 },
  crossRowName: { flex: 1, color: colors.textSecondary, fontSize: 11 },
  crossBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  crossBadgeText: { fontSize: 9, fontWeight: '700' },
  emptyHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 30 },
  unitPickerImg: { width: 40, height: 30, borderRadius: 4 },
  crossSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  crossSelectedImg: { width: 48, height: 36, borderRadius: 6 },
  crossRowImg: { width: 28, height: 22, borderRadius: 3 },
  unitTableImg: { width: 24, height: 18, borderRadius: 2 },
  unitNameCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
