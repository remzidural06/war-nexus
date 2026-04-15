/**
 * Purchase Service — Google Play Billing native modül entegrasyonu
 * Native BillingModule üzerinden gerçek ödeme yapılır.
 */
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { CF_BASE } from './firebase';

const { BillingModule } = NativeModules;

// Google Play ürün ID'leri — Console'da tanımlanacak
export const GOLD_PRODUCT_IDS = [
  'gold_100',
  'gold_500',
  'gold_2000',
  'gold_5000',
  'gold_10000',
  'gold_25000',
] as const;

export type GoldProductId = typeof GOLD_PRODUCT_IDS[number];

// Ürün → altın miktarı eşleştirmesi
const GOLD_AMOUNTS: Record<GoldProductId, number> = {
  gold_100: 100,
  gold_500: 500,
  gold_2000: 2000,
  gold_5000: 5000,
  gold_10000: 10000,
  gold_25000: 25000,
};

let initialized = false;

/** IAP bağlantısını başlat */
export async function initIAP(): Promise<boolean> {
  if (Platform.OS === 'web' || !BillingModule) return false;
  if (initialized) return true;

  try {
    await BillingModule.initConnection();
    initialized = true;
    return true;
  } catch (err: any) {
    console.warn('[IAP] Init error:', err?.message);
    return false;
  }
}

/** IAP bağlantısını kapat */
export async function endIAP(): Promise<void> {
  if (!BillingModule || !initialized) return;
  try {
    await BillingModule.endConnection();
    initialized = false;
  } catch {}
}

/** Mevcut ürünleri mağazadan çek (fiyatlar dahil) */
export async function getProducts(): Promise<Array<{ productId: string; localizedPrice: string }>> {
  if (!BillingModule) return [];

  try {
    const products = await BillingModule.getProducts([...GOLD_PRODUCT_IDS]);
    return products.map((p: any) => ({
      productId: p.productId,
      localizedPrice: p.price ?? '?',
    }));
  } catch (err: any) {
    console.warn('[IAP] getProducts error:', err?.message);
    return [];
  }
}

/** Satın alma başlat */
export async function purchaseGold(productId: GoldProductId): Promise<{ success: boolean; error?: string }> {
  if (!BillingModule) return { success: false, error: 'IAP not available' };

  try {
    await BillingModule.purchase(productId);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'USER_CANCELED') {
      return { success: false, error: 'cancelled' };
    }
    console.warn('[IAP] Purchase error:', err?.message);
    return { success: false, error: err?.message ?? 'Purchase failed' };
  }
}

/** Satın alma listener'ı kur */
export function setupPurchaseListener(
  uid: string,
  onGoldAdded: (amount: number, productId: string) => void,
  onError: (error: string) => void,
): () => void {
  if (Platform.OS === 'web' || !BillingModule) return () => {};

  const emitter = new NativeEventEmitter(BillingModule);

  const successSub = emitter.addListener('onPurchaseSuccess', async (data: any) => {
    try {
      const productId = data.productId as GoldProductId;
      const goldAmount = GOLD_AMOUNTS[productId];
      if (!goldAmount) return;

      // Server-side doğrulama
      try {
        await fetch(`${CF_BASE}/validatePurchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            productId,
            receipt: data.purchaseToken,
            platform: 'android',
          }),
        });
      } catch (err: any) {
        console.warn('[IAP] Validation error:', err?.message);
      }

      onGoldAdded(goldAmount, productId);
    } catch (err: any) {
      onError(err?.message ?? 'Processing failed');
    }
  });

  const errorSub = emitter.addListener('onPurchaseError', (data: any) => {
    if (data.error !== 'USER_CANCELED') {
      onError(data.error ?? 'Purchase error');
    }
  });

  return () => {
    successSub.remove();
    errorSub.remove();
  };
}
