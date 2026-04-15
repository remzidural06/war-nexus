/**
 * ShopScreen — Mağaza ekranı
 * Altın ile kaynak/hızlandırma/kalkan satın alma + altın paketleri (gerçek ödeme)
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MilitaryPanel } from '../components/MilitaryPanel';
import { colors } from '../theme/colors';
import { formatNumber } from '../utils/formatters';
import { useDesertGame } from '../state/DesertGameContext';
import { t } from '../i18n';
import { initIAP, getProducts, purchaseGold, setupPurchaseListener, GOLD_PRODUCT_IDS, type GoldProductId } from '../services/purchaseService';

// ─── Mağaza Verileri ─────────────────────────────────────────

const RESOURCE_PACKS = [
  { id: 'cash_50k', i18n: 'shop.cash50k', icon: '💵', resource: 'cash' as const, amount: 50000, goldCost: 50 },
  { id: 'cash_200k', i18n: 'shop.cash200k', icon: '💵', resource: 'cash' as const, amount: 200000, goldCost: 150 },
  { id: 'cash_1m', i18n: 'shop.cash1m', icon: '💵', resource: 'cash' as const, amount: 1000000, goldCost: 600 },
  { id: 'oil_50k', i18n: 'shop.oil50k', icon: '🛢️', resource: 'oil' as const, amount: 50000, goldCost: 60 },
  { id: 'oil_200k', i18n: 'shop.oil200k', icon: '🛢️', resource: 'oil' as const, amount: 200000, goldCost: 180 },
  { id: 'oil_1m', i18n: 'shop.oil1m', icon: '🛢️', resource: 'oil' as const, amount: 1000000, goldCost: 700 },
  { id: 'ore_50k', i18n: 'shop.ore50k', icon: '⛏️', resource: 'ore' as const, amount: 50000, goldCost: 70 },
  { id: 'ore_200k', i18n: 'shop.ore200k', icon: '⛏️', resource: 'ore' as const, amount: 200000, goldCost: 200 },
  { id: 'ore_1m', i18n: 'shop.ore1m', icon: '⛏️', resource: 'ore' as const, amount: 1000000, goldCost: 800 },
];

const BOOST_PACKS = [
  { id: 'shield_4h', i18nLabel: 'shop.shield4h', icon: '🛡️', i18nDesc: 'shop.shield4hDesc', goldCost: 100, type: 'shield' as const, duration: 4 * 60 * 60 * 1000 },
  { id: 'shield_8h', i18nLabel: 'shop.shield8h', icon: '🛡️', i18nDesc: 'shop.shield8hDesc', goldCost: 180, type: 'shield' as const, duration: 8 * 60 * 60 * 1000 },
  { id: 'shield_24h', i18nLabel: 'shop.shield24h', icon: '🛡️', i18nDesc: 'shop.shield24hDesc', goldCost: 400, type: 'shield' as const, duration: 24 * 60 * 60 * 1000 },
  { id: 'power_5k', i18nLabel: 'shop.power5k', icon: '⚡', i18nDesc: 'shop.power5kDesc', goldCost: 200, type: 'power' as const, amount: 5000 },
  { id: 'power_20k', i18nLabel: 'shop.power20k', icon: '⚡', i18nDesc: 'shop.power20kDesc', goldCost: 700, type: 'power' as const, amount: 20000 },
];

const VIP_PACKS = [
  { id: 'vip_starter', i18nLabel: 'shop.vipStarter', i18nDesc: 'shop.vipStarterDesc', goldCost: 250, rewards: { cash: 100000, oil: 100000, ore: 100000, shield: 4 * 60 * 60 * 1000 } },
  { id: 'vip_warrior', i18nLabel: 'shop.vipWarrior', i18nDesc: 'shop.vipWarriorDesc', goldCost: 1500, rewards: { cash: 500000, oil: 500000, ore: 500000, power: 10000 } },
  { id: 'vip_emperor', i18nLabel: 'shop.vipEmperor', i18nDesc: 'shop.vipEmperorDesc', goldCost: 5000, rewards: { cash: 1000000, oil: 1000000, ore: 1000000, power: 50000, shield: 24 * 60 * 60 * 1000 } },
];

const GOLD_PACKS_DEFAULT = [
  { id: 'gold_100' as GoldProductId, i18n: 'shop.gold100', amount: 100, fallbackPrice: '₺9.99', popular: false },
  { id: 'gold_500' as GoldProductId, i18n: 'shop.gold500', amount: 500, fallbackPrice: '₺34.99', popular: false },
  { id: 'gold_2000' as GoldProductId, i18n: 'shop.gold2000', amount: 2000, fallbackPrice: '₺119.99', popular: true },
  { id: 'gold_5000' as GoldProductId, i18n: 'shop.gold5000', amount: 5000, fallbackPrice: '₺269.99', popular: false },
  { id: 'gold_10000' as GoldProductId, i18n: 'shop.gold10000', amount: 10000, fallbackPrice: '₺499.99', popular: false },
  { id: 'gold_25000' as GoldProductId, i18n: 'shop.gold25000', amount: 25000, fallbackPrice: '₺999.99', popular: false },
];

// ─── Bileşen ─────────────────────────────────────────────────

type ShopTab = 'resources' | 'boosts' | 'vip' | 'gold';

export function ShopScreen() {
  const { gold, canAffordGold, deductGold, addResource, buyShield, buyWarPower, uid, addGold } = useDesertGame();
  const [tab, setTab] = useState<ShopTab>('resources');
  const [iapReady, setIapReady] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});

  // IAP başlat + ürün fiyatlarını çek
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const ok = await initIAP();
      setIapReady(ok);
      if (ok) {
        const products = await getProducts();
        const prices: Record<string, string> = {};
        for (const p of products) {
          prices[p.productId] = p.localizedPrice;
        }
        setStorePrices(prices);
      }
    })();

    // Satın alma listener
    if (uid) {
      cleanup = setupPurchaseListener(
        uid,
        (amount, productId) => {
          addGold(amount);
          setPurchasing(false);
          Alert.alert(t('shop.purchaseSuccessTitle'), t('shop.purchaseSuccessMsg', { amount: String(amount) }));
        },
        (error) => {
          setPurchasing(false);
          if (error !== 'cancelled') {
            Alert.alert(t('shop.purchaseErrorTitle'), t('shop.purchaseErrorMsg'));
          }
        },
      );
    }

    return () => cleanup?.();
  }, [uid]);

  async function handleBuyGold(pack: typeof GOLD_PACKS_DEFAULT[0]) {
    if (!iapReady) {
      Alert.alert(t('shop.storeUnavailableTitle'), t('shop.storeUnavailableMsg'));
      return;
    }
    setPurchasing(true);
    const result = await purchaseGold(pack.id);
    if (!result.success) {
      setPurchasing(false);
      if (result.error !== 'cancelled') {
        Alert.alert(t('shop.purchaseErrorTitle'), t('shop.purchaseErrorMsg'));
      }
    }
  }

  function buyResource(pack: typeof RESOURCE_PACKS[0]) {
    if (!canAffordGold(pack.goldCost)) {
      Alert.alert(t('shop.insufficientGoldTitle'), t('shop.insufficientGoldMsg', { cost: String(pack.goldCost) }));
      return;
    }
    deductGold(pack.goldCost);
    addResource(pack.resource, pack.amount);
    Alert.alert(t('shop.purchasedTitle'), t('shop.purchasedMsg', { label: t(pack.i18n) }));
  }

  function buyBoost(pack: typeof BOOST_PACKS[0]) {
    if (!canAffordGold(pack.goldCost)) {
      Alert.alert(t('shop.insufficientGoldTitle'), t('shop.insufficientGoldMsg', { cost: String(pack.goldCost) }));
      return;
    }
    if (pack.type === 'shield') {
      const ok = buyShield(pack.duration!, pack.goldCost);
      if (!ok) {
        Alert.alert(t('shop.shieldBlockedWarTitle'), t('shop.shieldBlockedWar'));
        return;
      }
      Alert.alert(t('shop.shieldActiveTitle'), t('shop.shieldActiveMsg', { label: t(pack.i18nLabel) }));
    } else if (pack.type === 'power') {
      buyWarPower((pack as any).amount, pack.goldCost);
      Alert.alert(t('shop.powerAddedTitle'), t('shop.powerAddedMsg', { amount: formatNumber((pack as any).amount) }));
    }
  }

  function buyVip(pack: typeof VIP_PACKS[0]) {
    if (!canAffordGold(pack.goldCost)) {
      Alert.alert(t('shop.insufficientGoldTitle'), t('shop.insufficientGoldMsg', { cost: formatNumber(pack.goldCost) }));
      return;
    }
    deductGold(pack.goldCost);
    const r = pack.rewards;
    if (r.cash) addResource('cash', r.cash);
    if (r.oil) addResource('oil', r.oil);
    if (r.ore) addResource('ore', r.ore);
    if (r.power) buyWarPower(r.power, 0);
    if (r.shield) buyShield(r.shield, 0);
    Alert.alert(t('shop.vipPurchasedTitle'), t('shop.vipPurchasedMsg', { label: t(pack.i18nLabel) }));
  }


  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabRow}>
        {([
          { key: 'resources' as ShopTab, i18n: 'shop.tabResources' },
          { key: 'boosts' as ShopTab, i18n: 'shop.tabBoosts' },
          { key: 'vip' as ShopTab, i18n: 'shop.tabVip' },
          { key: 'gold' as ShopTab, i18n: 'shop.tabGold' },
        ]).map(tb => (
          <Pressable key={tb.key} style={[s.tabBtn, tab === tb.key && s.tabBtnActive]} onPress={() => setTab(tb.key)}>
            <Text style={[s.tabBtnText, tab === tb.key && s.tabBtnTextActive]}>{t(tb.i18n)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Altın göstergesi */}
      <View style={s.goldBar}>
        <Text style={s.goldBarText}>{t('shop.goldBar', { amount: formatNumber(gold) })}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Kaynak Paketleri */}
        {tab === 'resources' && (
          <MilitaryPanel title={t('shop.sectionResources')} accent>
            {RESOURCE_PACKS.map(pack => (
              <Pressable key={pack.id} style={s.packRow} onPress={() => buyResource(pack)}>
                <Text style={s.packIcon}>{pack.icon}</Text>
                <View style={s.packInfo}>
                  <Text style={s.packLabel}>{t(pack.i18n)}</Text>
                  <Text style={s.packSub}>+{formatNumber(pack.amount)}</Text>
                </View>
                <View style={[s.priceBtn, gold < pack.goldCost && s.priceBtnDisabled]}>
                  <Text style={s.priceBtnText}>🪙 {pack.goldCost}</Text>
                </View>
              </Pressable>
            ))}
          </MilitaryPanel>
        )}

        {/* Boost Paketleri */}
        {tab === 'boosts' && (
          <MilitaryPanel title={t('shop.sectionBoosts')} accent>
            {BOOST_PACKS.map(pack => (
              <Pressable key={pack.id} style={s.packRow} onPress={() => buyBoost(pack)}>
                <Text style={s.packIcon}>{pack.icon}</Text>
                <View style={s.packInfo}>
                  <Text style={s.packLabel}>{t(pack.i18nLabel)}</Text>
                  <Text style={s.packSub}>{t(pack.i18nDesc)}</Text>
                </View>
                <View style={[s.priceBtn, gold < pack.goldCost && s.priceBtnDisabled]}>
                  <Text style={s.priceBtnText}>🪙 {pack.goldCost}</Text>
                </View>
              </Pressable>
            ))}
          </MilitaryPanel>
        )}

        {/* VIP Paketleri */}
        {tab === 'vip' && (
          <MilitaryPanel title={t('shop.sectionVip')} accent>
            {VIP_PACKS.map(pack => (
              <Pressable key={pack.id} style={s.vipCard} onPress={() => buyVip(pack)}>
                <Text style={s.vipTitle}>{t(pack.i18nLabel)}</Text>
                <Text style={s.vipDesc}>{t(pack.i18nDesc)}</Text>
                <View style={[s.priceBtn, s.vipPriceBtn, gold < pack.goldCost && s.priceBtnDisabled]}>
                  <Text style={s.priceBtnText}>🪙 {formatNumber(pack.goldCost)}</Text>
                </View>
              </Pressable>
            ))}
          </MilitaryPanel>
        )}

        {/* Altın Paketleri — Gerçek Ödeme */}
        {tab === 'gold' && (
          <MilitaryPanel title={t('shop.sectionGold')} accent>
            {purchasing && (
              <View style={s.purchasingOverlay}>
                <ActivityIndicator color={colors.sand} size="large" />
                <Text style={s.purchasingText}>{t('shop.processing')}</Text>
              </View>
            )}
            {GOLD_PACKS_DEFAULT.map(pack => {
              const realPrice = storePrices[pack.id];
              const displayPrice = realPrice ?? pack.fallbackPrice;
              return (
                <Pressable
                  key={pack.id}
                  style={[s.goldCard, pack.popular && s.goldCardPopular, purchasing && { opacity: 0.5 }]}
                  onPress={() => handleBuyGold(pack)}
                  disabled={purchasing}
                >
                  {pack.popular && <Text style={s.popularBadge}>{t('shop.popular')}</Text>}
                  <View style={s.goldCardRow}>
                    <View>
                      <Text style={s.goldAmount}>🪙 {formatNumber(pack.amount)}</Text>
                      <Text style={s.goldLabel}>{t(pack.i18n)}</Text>
                    </View>
                    <View style={s.goldPriceBtn}>
                      <Text style={s.goldPriceBtnText}>{displayPrice}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
            <Text style={s.goldNote}>{t('shop.goldNote')}</Text>
          </MilitaryPanel>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 10 },
  tabRow: { flexDirection: 'row', marginBottom: 10, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.panelBorder, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.sand, borderColor: colors.sand },
  tabBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  tabBtnTextActive: { color: colors.background },
  goldBar: { backgroundColor: colors.surface, borderRadius: 6, padding: 8, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.sand },
  goldBarText: { color: colors.sand, fontSize: 16, fontWeight: '800' },

  packRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
  packIcon: { fontSize: 24, marginRight: 12 },
  packInfo: { flex: 1 },
  packLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  packSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  priceBtn: { backgroundColor: '#5D4E37', paddingVertical: 8, width: 80, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  priceBtnDisabled: { opacity: 0.4 },
  priceBtnText: { color: colors.sand, fontSize: 13, fontWeight: '700' },

  vipCard: { backgroundColor: colors.surface, borderRadius: 8, padding: 14, marginVertical: 6, borderWidth: 1, borderColor: colors.panelBorder },
  vipTitle: { color: colors.sand, fontSize: 16, fontWeight: '800' },
  vipDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 10 },
  vipPriceBtn: { alignSelf: 'flex-end' },

  goldCard: { backgroundColor: colors.surface, borderRadius: 8, padding: 14, marginVertical: 6, borderWidth: 1, borderColor: colors.panelBorder },
  goldCardPopular: { borderColor: colors.sand, borderWidth: 2 },
  popularBadge: { color: colors.background, backgroundColor: colors.sand, fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 6 },
  goldCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goldAmount: { color: colors.sand, fontSize: 20, fontWeight: '800' },
  goldLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  goldPriceBtn: { backgroundColor: colors.success, width: 100, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goldPriceBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  goldNote: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  purchasingOverlay: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  purchasingText: { color: colors.sand, fontSize: 14, fontWeight: '700' },
});
