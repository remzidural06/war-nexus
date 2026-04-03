const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getBotProfiles, UNITS_BY_BUILDING, ALL_BUILDING_IDS, MAX_LEVELS } = require("./botData");
const { generateMessage, generateSmartReply } = require("./botChat");
const { resolveServerCombat } = require("./combatEngine");

initializeApp();
const db = getFirestore();

// ── Sabitler ─────────────────────────────────────────────────
const ADMIN_UID = "fDXCXZYZr1PapwTjAlsM3RZoKRn1";

const UNIT_CAP_TABLE = {
  1: 50, 2: 50, 3: 100, 4: 100, 5: 200, 6: 200,
  7: 350, 8: 350, 9: 500, 10: 500, 11: 700, 12: 700,
  13: 900, 14: 900, 15: 1100, 16: 1100, 17: 1300, 18: 1300,
  19: 1500, 20: 1500,
};

const MAX_BUILDING_LEVELS = {
  hq: 20, barracks: 20, tankFactory: 20, airport: 20, shipyard: 20,
  oilRefinery: 20, oreField: 20, bank: 20, researchLab: 10,
  defenseTower: 10, radar: 10, houses: 16,
};

const POWER_TIER = { 1: 10, 2: 30, 3: 60, 4: 100 };

// ── Push Notification gönder ─────────────────────────────────
/**
 * Push notification gönder.
 * @param {string} targetUid - Hedef oyuncu uid
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim mesajı
 * @param {string} [category] - Bildirim kategorisi: 'attacks' | 'battleResults' | 'allianceWar' | 'missions'
 */
async function sendPushNotification(targetUid, title, body, category) {
  try {
    const playerSnap = await db.collection("players").doc(targetUid).get();
    const data = playerSnap.data();
    const fcmToken = data?.fcmToken;
    if (!fcmToken) return; // Token yoksa (web user veya izin vermemiş)

    // Kullanıcının bildirim tercihlerini kontrol et
    if (category && data?.notifPrefs) {
      if (data.notifPrefs[category] === false) return; // Kapalıysa gönderme
    }

    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      android: {
        priority: "high",
        notification: { channelId: "war_nexus_attacks", sound: "default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    });
  } catch (err) {
    // Token geçersizse (uninstall vs.) sessizce geç
    if (err?.code === 'messaging/registration-token-not-registered') {
      await db.collection("players").doc(targetUid).update({ fcmToken: null }).catch(() => {});
    }
  }
}

// ── Yardımcı fonksiyonlar ────────────────────────────────────
function calcPower(state) {
  const buildings = state?.buildings ?? [];
  const buildingPower = buildings.reduce((s, b) => { const l = b.level ?? 1; return s + l * (l + 1) / 2 * 100; }, 0);
  const unitPower = buildings.reduce((s, b) => {
    for (const [, count] of Object.entries(b.trainedUnits ?? {})) {
      s += (count ?? 0) * 10; // Basitleştirilmiş — tier bilgisi olmadan
    }
    return s;
  }, 0);
  const researchPower = (state?.researchStates ?? [])
    .filter(r => r.completed)
    .reduce((s) => s + 50, 0);
  const basePower = buildingPower + unitPower + researchPower;
  const cappedWarPower = Math.min(state?.warPower ?? 0, basePower);
  return basePower + cappedWarPower;
}

function getBuildingUnitCount(building) {
  let total = 0;
  for (const count of Object.values(building.trainedUnits ?? {})) {
    total += count ?? 0;
  }
  return total;
}

/** Birim kayıplarını envanterden düş ve playerPower güncelle */
async function deductUnitLosses(uid, lossMap) {
  // lossMap: { unitId: destroyedCount, ... }
  if (!uid || !lossMap || Object.keys(lossMap).length === 0) return;
  const baseSnap = await db.collection("playerBases").doc(uid).get();
  if (!baseSnap.exists) return;
  const state = baseSnap.data();
  const buildings = state.buildings ?? [];
  const remaining = { ...lossMap };
  let changed = false;

  const updatedBuildings = buildings.map(b => {
    const trained = { ...(b.trainedUnits ?? {}) };
    for (const [unitId, loss] of Object.entries(remaining)) {
      if (trained[unitId] && trained[unitId] > 0 && loss > 0) {
        const deduct = Math.min(trained[unitId], loss);
        trained[unitId] -= deduct;
        remaining[unitId] = loss - deduct;
        if (trained[unitId] <= 0) delete trained[unitId];
        changed = true;
      }
    }
    return { ...b, trainedUnits: trained };
  });

  if (changed) {
    await db.collection("playerBases").doc(uid).set({ buildings: updatedBuildings }, { merge: true });
    const newPower = calcPower({ ...state, buildings: updatedBuildings });
    await db.collection("players").doc(uid).set({ playerPower: newPower }, { merge: true });
  }
}

// ══════════════════════════════════════════════════════════════
// A — Firestore Trigger: playerBases yazıldığında doğrula
// ══════════════════════════════════════════════════════════════
exports.validatePlayerBase = onDocumentWritten(
  { document: "playerBases/{uid}", region: "us-central1" },
  async (event) => {
    const uid = event.params.uid;

    // Admin bypass
    if (uid === ADMIN_UID) return;
    // Bot bypass
    if (uid.startsWith("bot_")) return;
    // Banned user bypass — silinen kullanıcının verisi tekrar yazılmasın
    try {
      const banned = await db.collection("bannedUsers").doc(uid).get();
      if (banned.exists) {
        // Silinen kullanıcı tekrar yazdı — veriyi temizle
        await db.collection("playerBases").doc(uid).delete();
        await db.collection("players").doc(uid).delete();
        return;
      }
    } catch {}

    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Silme işlemi — müdahale etme
    if (!after) return;

    const violations = [];
    const buildings = after.buildings ?? [];
    const prevBuildings = before?.buildings ?? [];

    // 1. Bina seviye kontrolü — max 1 artış, max seviye aşma
    for (const b of buildings) {
      const prev = prevBuildings.find(pb => pb.id === b.id);
      const prevLevel = prev?.level ?? 1;
      const maxLevel = MAX_BUILDING_LEVELS[b.id] ?? 20;

      if (b.level > maxLevel) {
        violations.push(`${b.id}: seviye ${b.level} > max ${maxLevel}`);
      }
      // Yükseltme sırasında seviye artmaz, sadece isUpgrading=true olur
      // Seviye artışı sadece timer bittiğinde olmalı (max +1)
      if (b.level > prevLevel + 1 && !b.isUpgrading) {
        violations.push(`${b.id}: seviye ${prevLevel} → ${b.level} (max +1)`);
      }
    }

    // 2. Bina bazlı birim kapasitesi kontrolü
    const hqLevel = buildings.find(b => b.id === "hq")?.level ?? 1;
    const cap = UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;

    for (const b of buildings) {
      const unitCount = getBuildingUnitCount(b);
      if (unitCount > cap * 1.1) { // %10 tolerans (eğitim kuyruğu tamamlanabilir)
        violations.push(`${b.id}: ${unitCount} birim > cap ${cap}`);
      }
    }

    // 3. Kaynak kontrolü — negatif olamaz, kapasiteyi aşamaz
    for (const r of (after.resources ?? [])) {
      if (r.amount < 0) {
        violations.push(`${r.key}: negatif kaynak (${r.amount})`);
      }
      if (r.amount > r.capacity * 1.05) { // %5 tolerans
        violations.push(`${r.key}: ${r.amount} > kapasite ${r.capacity}`);
      }
    }

    // 4. warPower ani artış kontrolü
    const prevWarPower = before?.warPower ?? 0;
    const newWarPower = after.warPower ?? 0;
    if (newWarPower > prevWarPower + 100000 && prevWarPower > 0) {
      violations.push(`warPower: ${prevWarPower} → ${newWarPower} (ani artış)`);
    }

    // Hile tespit edildi — logla ve eski state'e geri al
    if (violations.length > 0) {
      console.warn(`[CHEAT] ${uid}: ${violations.join(", ")}`);

      // cheaters koleksiyonuna kaydet
      await db.collection("cheaters").doc(uid).set({
        uid,
        violations,
        detectedAt: Date.now(),
        displayName: after.displayName ?? null,
      }, { merge: true });

      // Eski state'e geri al (before varsa)
      if (before) {
        try {
          await db.collection("playerBases").doc(uid).set(before);
          console.log(`[CHEAT] ${uid}: state geri alındı`);
        } catch (err) {
          console.error(`[CHEAT] Rollback failed for ${uid}:`, err);
        }
      }
    }
  }
);

// ══════════════════════════════════════════════════════════════
// C — Periyodik Denetim: her 1 saatte tüm oyuncuları tara
// ══════════════════════════════════════════════════════════════
exports.auditPlayers = onSchedule(
  { schedule: "every 60 minutes", region: "us-central1", timeoutSeconds: 120 },
  async () => {
    console.log("[Audit] Başlatıldı");
    let checked = 0;
    let flagged = 0;

    try {
      const playersSnap = await db.collection("players").limit(500).get();

      for (const playerDoc of playersSnap.docs) {
        const uid = playerDoc.id;
        if (uid === ADMIN_UID) continue;

        try {
          const baseSnap = await db.collection("playerBases").doc(uid).get();
          if (!baseSnap.exists) continue;

          const state = baseSnap.data();
          const buildings = state?.buildings ?? [];
          const hqLevel = buildings.find(b => b.id === "hq")?.level ?? 1;
          const cap = UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;
          const anomalies = [];

          // 1. Bina bazlı birim kapasitesi
          for (const b of buildings) {
            const unitCount = getBuildingUnitCount(b);
            if (unitCount > cap) {
              anomalies.push(`${b.id}: ${unitCount} > cap ${cap}`);
            }
          }

          // 2. Bina seviyesi HQ'dan yüksek olamaz (HQ hariç)
          for (const b of buildings) {
            if (b.id === "hq") continue;
            if (b.level > hqLevel) {
              anomalies.push(`${b.id} Lv.${b.level} > HQ Lv.${hqLevel}`);
            }
          }

          // 3. Max seviye aşma
          for (const b of buildings) {
            const maxLevel = MAX_BUILDING_LEVELS[b.id] ?? 20;
            if (b.level > maxLevel) {
              anomalies.push(`${b.id} Lv.${b.level} > max ${maxLevel}`);
            }
          }

          // 4. warPower tavanı kontrolü
          const basePower = calcPower({ ...state, warPower: 0 });
          if ((state?.warPower ?? 0) > basePower * 3) {
            anomalies.push(`warPower ${state.warPower} > 3x basePower ${basePower}`);
          }

          // 5. Kaynak anomalisi — 10M üstü kaynak şüpheli
          for (const r of (state?.resources ?? [])) {
            if (r.amount > 30000000) {
              anomalies.push(`${r.key}: ${r.amount} (>10M)`);
            }
          }

          if (anomalies.length > 0) {
            flagged++;
            await db.collection("cheaters").doc(uid).set({
              uid,
              anomalies,
              auditedAt: Date.now(),
              displayName: state?.displayName ?? null,
              hqLevel,
            }, { merge: true });

            // Otomatik düzeltme: kapasiteyi aşan birimleri kırp
            let anyFixed = false;
            const fixedBuildings = buildings.map(b => {
              const unitCount = getBuildingUnitCount(b);
              if (unitCount <= cap) return b;

              let excess = unitCount - cap;
              const newTrained = { ...b.trainedUnits };
              for (const [unitId, count] of Object.entries(newTrained)) {
                if (excess <= 0) break;
                const remove = Math.min(count, excess);
                newTrained[unitId] = count - remove;
                excess -= remove;
                if (newTrained[unitId] <= 0) delete newTrained[unitId];
              }
              anyFixed = true;
              return { ...b, trainedUnits: newTrained };
            });

            if (anyFixed) {
              await db.collection("playerBases").doc(uid).set(
                { buildings: fixedBuildings, lastSavedAt: Date.now() },
                { merge: true }
              );
              // playerPower güncelle
              const power = calcPower({ ...state, buildings: fixedBuildings });
              await db.collection("players").doc(uid).set(
                { playerPower: power, hqLevel },
                { merge: true }
              );
            }
          }

          checked++;
        } catch (err) {
          console.warn(`[Audit] ${uid} hata:`, err.message);
        }
      }
    } catch (err) {
      console.error("[Audit] Fatal:", err);
    }

    console.log(`[Audit] Tamamlandı: ${checked} kontrol, ${flagged} şüpheli`);
  }
);

// ══════════════════════════════════════════════════════════════
// BOT SİSTEMİ
// ══════════════════════════════════════════════════════════════

/** Botları Firestore'a yaz (tek seferlik — HTTPS callable). Eski botları temizler. */
/** Tüm oyuncuların birim kapasitesini kontrol et, aşanları kırp, power güncelle */
exports.enforceAllCaps = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    let processed = 0, trimmed = 0;
    const details = [];
    try {
      const playersSnap = await db.collection("players").limit(500).get();
      for (const playerDoc of playersSnap.docs) {
        const uid = playerDoc.id;
        // Admin dahil herkes kontrol edilsin
        try {
          const baseSnap = await db.collection("playerBases").doc(uid).get();
          if (!baseSnap.exists) { processed++; continue; }
          const state = baseSnap.data();
          const buildings = state.buildings ?? [];
          const hqLevel = buildings.find(b => b.id === "hq")?.level ?? 1;
          const cap = UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;
          const name = state.displayName ?? uid.slice(0, 8);

          let anyTrimmed = false;
          // Debug: sadece cap aşanları raporla
          for (const b of buildings) {
            const uc = getBuildingUnitCount(b);
            if (uc > cap) details.push(`⚠️ ${name} ${b.id}: ${uc} > cap ${cap}`);
          }
          const fixedBuildings = buildings.map(b => {
            const unitCount = getBuildingUnitCount(b);
            if (unitCount <= cap) return b;
            let excess = unitCount - cap;
            const newTrained = { ...b.trainedUnits };
            for (const [unitId, count] of Object.entries(newTrained)) {
              if (excess <= 0) break;
              const remove = Math.min(count, excess);
              newTrained[unitId] = count - remove;
              excess -= remove;
              if (newTrained[unitId] <= 0) delete newTrained[unitId];
            }
            anyTrimmed = true;
            return { ...b, trainedUnits: newTrained };
          });

          if (anyTrimmed) {
            await db.collection("playerBases").doc(uid).set(
              { buildings: fixedBuildings, lastSavedAt: Date.now() },
              { merge: true }
            );
            trimmed++;
            details.push(`${name}: kırpıldı`);
          }

          // Power güncelle
          const finalBuildings = anyTrimmed ? fixedBuildings : buildings;
          const power = calcPower({ ...state, buildings: finalBuildings });
          await db.collection("players").doc(uid).set(
            { playerPower: power, hqLevel },
            { merge: true }
          );
          processed++;
        } catch (err) {
          details.push(`${uid.slice(0,8)}: ${err.message}`);
        }
      }
    } catch (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({ processed, trimmed, details });
  }
);

/** Belirli oyuncuları derin sil — tüm koleksiyonlar + Auth */
/** Belirli oyuncuya her binanın en güçlü biriminden cap kadar ekle */
/** bannedUsers'tan uid kaldır — ?uids=xxx */
exports.unbanPlayers = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    const uids = (req.query.uids || '').split(',').map(n => n.trim()).filter(Boolean);
    if (uids.length === 0) { res.json({ error: 'uids parametresi gerekli' }); return; }
    const removed = [];
    for (const uid of uids) {
      try {
        await db.collection("bannedUsers").doc(uid).delete();
        removed.push(uid);
      } catch {}
    }
    res.json({ removed, count: removed.length });
  }
);

/** Oyuncuya pendingGold ekle — ?name=X&amount=Y */
exports.addGold = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    const name = (req.query.name || '').trim();
    const amount = parseInt(req.query.amount || '0', 10);
    if (!name || amount <= 0) { res.json({ error: 'name ve amount gerekli' }); return; }
    try {
      // İsimle uid bul
      const snap = await db.collection("players").limit(500).get();
      let targetUid = null;
      let targetName = null;
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.displayName && data.displayName.toLowerCase() === name.toLowerCase()) { targetUid = doc.id; targetName = data.displayName; break; }
      }
      if (!targetUid) {
        // playerBases'te de ara
        const basesSnap = await db.collection("playerBases").limit(500).get();
        for (const doc of basesSnap.docs) {
          const data = doc.data();
          if (data.displayName && data.displayName.toLowerCase() === name.toLowerCase()) { targetUid = doc.id; targetName = data.displayName; break; }
        }
      }
      if (!targetUid) {
      // Doğrudan uid olarak da dene
      const directSnap = await db.collection("playerBases").doc(name).get();
      if (directSnap.exists) { targetUid = name; targetName = directSnap.data()?.displayName ?? name; }
      else {
        // Debug: tüm gerçek oyuncuları listele
        const allPlayers = [];
        const pSnap = await db.collection("players").limit(20).get();
        for (const d of pSnap.docs) {
          const dd = d.data();
          if (!dd.isBot) allPlayers.push(`${dd.displayName} (${d.id.slice(0,8)})`);
        }
        const bSnap = await db.collection("playerBases").limit(200).get();
        for (const d of bSnap.docs) {
          const dd = d.data();
          if (!dd.isBot && !allPlayers.find(p => p.includes(d.id.slice(0,8)))) {
            allPlayers.push(`${dd.displayName ?? '?'} (${d.id.slice(0,8)}) [bases]`);
          }
        }
        res.json({ error: `${name} bulunamadı`, realPlayers: allPlayers });
        return;
      }
    }
      // Direkt resources array'ine yaz + pendingGold da set et (fallback)
      const baseSnap = await db.collection("playerBases").doc(targetUid).get();
      if (!baseSnap.exists) { res.json({ error: 'playerBases bulunamadı' }); return; }
      const state = baseSnap.data();
      const resources = state?.resources ?? [];
      const updatedResources = resources.map(r => {
        if (r.key === 'gold') return { ...r, amount: (r.amount ?? 0) + amount };
        return r;
      });
      await db.collection("playerBases").doc(targetUid).set({
        resources: updatedResources,
        pendingGold: (state?.pendingGold ?? 0) + amount,
        lastSavedAt: Date.now() + 120000,
      }, { merge: true });
      const newGold = updatedResources.find(r => r.key === 'gold')?.amount ?? 0;
      res.json({ success: true, name: targetName, uid: targetUid, newGold, pendingGold: (state?.pendingGold ?? 0) + amount });
    } catch (err) {
      res.json({ error: err.message });
    }
  }
);

/** Cheaters koleksiyonunu temizle */
exports.clearCheaters = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const uids = (req.query.uids || '').split(',').map(n => n.trim()).filter(Boolean);
      if (uids.length > 0) {
        // Belirli UID'leri cheaters'dan sil
        const removed = [];
        for (const uid of uids) {
          await db.collection("cheaters").doc(uid).delete();
          removed.push(uid);
        }
        return res.json({ success: true, removed, count: removed.length });
      }
      // Parametresiz: tümünü sil
      const snap = await db.collection("cheaters").limit(500).get();
      let deleted = 0;
      for (const doc of snap.docs) {
        await db.collection("cheaters").doc(doc.id).delete();
        deleted++;
      }
      res.json({ success: true, deleted });
    } catch (err) {
      res.json({ error: err.message });
    }
  }
);

/** Oyuncu alanlarını güncelle — admin, displayName vb. */
exports.setAdmin = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const { name, uid: qUid, admin, displayName: newName } = { ...(req.query ?? {}), ...(req.body ?? {}) };
    if (!name && !qUid) return res.status(400).json({ error: "name veya uid gerekli" });
    let targetUid = qUid;
    if (!targetUid) {
      const snap = await db.collection("players").where("displayName", "==", name).limit(1).get();
      if (snap.empty) return res.status(404).json({ error: "Oyuncu bulunamadı" });
      targetUid = snap.docs[0].id;
    }
    const updates = {};
    if (admin !== undefined) updates.isAdmin = admin !== 'false' && admin !== false;
    if (newName) updates.displayName = newName;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Güncellenecek alan yok" });
    await db.collection("players").doc(targetUid).set(updates, { merge: true });
    // playerBases'te de displayName güncelle
    if (newName) {
      await db.collection("playerBases").doc(targetUid).set({ displayName: newName }, { merge: true });
      // Firebase Auth displayName güncelle
      try {
        const { getAuth } = require("firebase-admin/auth");
        await getAuth().updateUser(targetUid, { displayName: newName });
      } catch (e) { console.warn("Auth displayName güncellenemedi:", e.message); }
    }
    res.json({ success: true, uid: targetUid, updates });
  }
);

exports.fillTopUnits = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    const uid = req.query.uid;
    if (!uid) { res.json({ error: 'uid parametresi gerekli' }); return; }
    try {
      const baseSnap = await db.collection("playerBases").doc(uid).get();
      if (!baseSnap.exists) { res.json({ error: 'playerBases bulunamadı' }); return; }
      const state = baseSnap.data();
      const buildings = state.buildings ?? [];
      const hqLevel = buildings.find(b => b.id === 'hq')?.level ?? 1;
      const cap = UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;

      const updatedBuildings = buildings.map(b => {
        const unitsForBuilding = UNITS_BY_BUILDING[b.id] ?? [];
        if (unitsForBuilding.length === 0) return b;
        const available = unitsForBuilding.filter(u => b.level >= u.min);
        if (available.length === 0) return b;
        // Her binanın en güçlü birimi (hardcoded — tier 3 en yüksek ATK)
        const TOP_UNITS = {
          barracks: 'specOps', tankFactory: 't14armata', airport: 'b21raider',
          shipyard: 'fordCarrier', defenseTower: 'thaad',
        };
        const topId = TOP_UNITS[b.id];
        const topDef = topId && unitsForBuilding.find(u => u.id === topId);
        if (topDef) {
          // Bina seviyesini birim gereksinimi kadar yükselt
          const newLevel = Math.max(b.level, topDef.min);
          return { ...b, level: Math.min(newLevel, MAX_LEVELS[b.id] ?? 20), trainedUnits: { [topDef.id]: cap } };
        }
        // Fallback: en yüksek tier
        const best = available.sort((a, b) => b.tier - a.tier)[0];
        return { ...b, trainedUnits: { [best.id]: cap } };
      });

      await db.collection("playerBases").doc(uid).set(
        { buildings: updatedBuildings, lastSavedAt: Date.now() },
        { merge: true }
      );

      // Power güncelle
      const power = calcPower({ ...state, buildings: updatedBuildings });
      await db.collection("players").doc(uid).set(
        { playerPower: power, hqLevel },
        { merge: true }
      );

      const filled = updatedBuildings
        .filter(b => (UNITS_BY_BUILDING[b.id] ?? []).length > 0)
        .map(b => `${b.id}: ${JSON.stringify(b.trainedUnits)}`);

      res.json({ success: true, hqLevel, cap, filled });
    } catch (err) {
      res.json({ error: err.message });
    }
  }
);

exports.deletePlayers = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    const { getAuth } = require("firebase-admin/auth");
    const auth = getAuth();
    const names = (req.query.names || '').split(',').map(n => n.trim()).filter(Boolean);
    const uids = (req.query.uids || '').split(',').map(n => n.trim()).filter(Boolean);
    if (names.length === 0 && uids.length === 0) { res.json({ error: 'names veya uids parametresi gerekli' }); return; }
    const deleted = [];
    const collections = ["players", "playerBases", "cheaters", "battleReports", "marches", "alliances"];
    try {
      // Önce uid'leri bul
      const snap = await db.collection("players").limit(500).get();
      const targets = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        if (names.includes(data.displayName)) {
          targets.push({ uid: doc.id, name: data.displayName });
        }
      }
      // playerBases'ten de kontrol et (players'ta olmayabilir)
      const basesSnap = await db.collection("playerBases").limit(500).get();
      for (const doc of basesSnap.docs) {
        const data = doc.data();
        if (names.includes(data.displayName) && !targets.find(t => t.uid === doc.id)) {
          targets.push({ uid: doc.id, name: data.displayName });
        }
      }
      // Doğrudan UID ile de ekle
      for (const uid of uids) {
        if (!targets.find(t => t.uid === uid)) {
          targets.push({ uid, name: uid.slice(0, 12) });
        }
      }

      for (const target of targets) {
        const steps = [];
        // Tüm koleksiyonlardan sil
        for (const col of collections) {
          try {
            await db.collection(col).doc(target.uid).delete();
            steps.push(col);
          } catch {}
        }
        // Bu uid'nin başkalarının battleReports'unda referansı olabilir — bunları silmiyoruz
        // Auth hesabını sil
        try {
          await auth.deleteUser(target.uid);
          steps.push("auth");
        } catch (e) {
          steps.push(`auth-fail: ${e.message}`);
        }
        // bannedUsers koleksiyonuna kaydet — tekrar giriş yapınca eski veriler yüklenmesin
        try {
          await db.collection("bannedUsers").doc(target.uid).set({
            uid: target.uid,
            displayName: target.name,
            deletedAt: Date.now(),
          });
          steps.push("banned");
        } catch {}
        deleted.push(`${target.name} (${target.uid}) → ${steps.join(', ')}`);
      }
    } catch (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({ deleted, count: deleted.length });
  }
);

exports.seedBots = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    // Önce eski botları sil
    try {
      const oldBots = await db.collection("players").where("isBot", "==", true).get();
      for (const doc of oldBots.docs) {
        await db.collection("players").doc(doc.id).delete();
        await db.collection("playerBases").doc(doc.id).delete();
      }
    } catch (e) { console.warn("[SeedBots] Cleanup:", e.message); }

    const bots = getBotProfiles();
    let created = 0;
    for (const bot of bots) {
      try {
        // playerBases'e yaz
        await db.collection("playerBases").doc(bot.uid).set({
          buildings: bot.buildings,
          resources: bot.resources,
          researchStates: bot.researchStates,
          warPower: bot.warPower,
          battleReports: bot.battleReports,
          birlikler: bot.birlikler,
          allianceContribution: bot.allianceContribution,
          missions: bot.missions,
          schemaVersion: bot.schemaVersion,
          lastSavedAt: bot.lastSavedAt,
          displayName: bot.displayName,
          coordinate: bot.coordinate,
          isBot: true,
        });
        // players'a yaz (sıralama için)
        await db.collection("players").doc(bot.uid).set({
          displayName: bot.displayName,
          coordinate: bot.coordinate,
          playerPower: bot.playerPower,
          hqLevel: bot.hqLevel,
          wins: bot.wins,
          losses: bot.losses,
          warPower: bot.warPower,
          lastOnline: Date.now(),
          isBot: true,
        });
        created++;
      } catch (err) {
        console.warn(`[SeedBots] ${bot.displayName} hata:`, err.message);
      }
    }
    res.json({ success: true, created, total: bots.length });
  }
);

/** Günlük bot simülasyonu — her 24 saatte bir çalışır */
exports.simulateBots = onSchedule(
  { schedule: "every 24 hours", region: "us-central1", timeoutSeconds: 300 },
  async () => {
    console.log("[BotSim] Başlatıldı");
    let processed = 0;

    try {
      // Tüm botları bul
      const botsSnap = await db.collection("players")
        .where("isBot", "==", true)
        .limit(200)
        .get();

      const botDocs = {};
      for (const doc of botsSnap.docs) {
        botDocs[doc.id] = doc.data();
      }
      const botUids = Object.keys(botDocs);

      for (const uid of botUids) {
        try {
          const baseSnap = await db.collection("playerBases").doc(uid).get();
          if (!baseSnap.exists) continue;
          const state = baseSnap.data();
          let buildings = state.buildings ?? [];
          let resources = state.resources ?? [];
          let warPower = state.warPower ?? 0;

          // 1. 24 saatlik kaynak üretimi
          resources = resources.map(r => {
            if (r.productionPerHour <= 0 && r.key !== 'cash') return r;
            const buildingProd = buildings.reduce((sum, b) => {
              // Basit üretim tahmini
              if (r.key === 'oil' && b.id === 'oilField') return sum + 120 * b.level;
              if (r.key === 'ore' && b.id === 'mine') return sum + 100 * b.level;
              if (r.key === 'cash' && b.id === 'houses') return sum + 150 * b.level;
              return sum;
            }, 0);
            const gained = (r.productionPerHour + buildingProd) * 24;
            return { ...r, amount: Math.min(r.capacity, r.amount + gained) };
          });

          // 2. Bina yükseltme (1 rastgele bina, kaynaklar yetiyorsa)
          const upgradable = buildings.filter(b => {
            const maxLv = MAX_LEVELS[b.id] ?? 20;
            if (b.id === 'hq') return b.level < maxLv;
            const hqLv = buildings.find(x => x.id === 'hq')?.level ?? 1;
            return b.level < Math.min(maxLv, hqLv);
          });
          if (upgradable.length > 0 && Math.random() > 0.5) {
            // %50 ihtimalle 1 bina yükselt
            const target = upgradable[Math.floor(Math.random() * upgradable.length)];
            buildings = buildings.map(b =>
              b.id === target.id ? { ...b, level: b.level + 1 } : b
            );
          }

          // 3. Birim eğitimi (her askeri binada 2-5 birim)
          const hqLevel = buildings.find(b => b.id === 'hq')?.level ?? 1;
          const unitCap = {
            1: 50, 2: 50, 3: 100, 4: 100, 5: 200, 6: 200,
            7: 350, 8: 350, 9: 500, 10: 500, 11: 700, 12: 700,
            13: 900, 14: 900, 15: 1100, 16: 1100, 17: 1300, 18: 1300,
            19: 1500, 20: 1500,
          }[Math.min(hqLevel, 20)] ?? 50;

          buildings = buildings.map(b => {
            const unitsForBuilding = UNITS_BY_BUILDING[b.id] ?? [];
            if (unitsForBuilding.length === 0) return b;

            let currentCount = Object.values(b.trainedUnits ?? {}).reduce((s, c) => s + c, 0);
            if (currentCount >= unitCap) return b;

            const available = unitsForBuilding.filter(u => b.level >= u.min);
            if (available.length === 0) return b;

            const newTrained = { ...b.trainedUnits };
            const toTrain = Math.min(
              Math.floor(3 + Math.random() * 3),
              unitCap - currentCount
            );
            for (let i = 0; i < toTrain; i++) {
              const unit = available[Math.floor(Math.random() * available.length)];
              newTrained[unit.id] = (newTrained[unit.id] ?? 0) + 1;
            }
            return { ...b, trainedUnits: newTrained };
          });

          // 4. 2 savaş yap (rastgele sonuç)
          const battles = 2;
          const playerData = botDocs[uid] ?? {};
          let wins = playerData.wins ?? 0;
          let losses = playerData.losses ?? 0;
          for (let i = 0; i < battles; i++) {
            const won = Math.random() > 0.45; // %55 kazanma şansı
            if (won) {
              wins++;
              warPower += Math.round(25 + Math.random() * 50 * hqLevel);
            } else {
              losses++;
              warPower = Math.max(0, warPower - Math.round(10 + Math.random() * 25));
            }
          }

          // (4b kaldırıldı — ittifak savaşı artık plan bazlı executePendingBotAttacks ile yapılıyor)

          // 5. playerPower hesapla
          const buildingPower = buildings.reduce((s, b) => s + b.level * (b.level + 1) / 2 * 100, 0);
          const unitPower = buildings.reduce((s, b) => {
            for (const count of Object.values(b.trainedUnits ?? {})) {
              s += (count ?? 0) * 10;
            }
            return s;
          }, 0);
          const researchPower = (state.researchStates ?? [])
            .filter(r => r.completed).reduce((s) => s + 50, 0);
          const basePower = buildingPower + unitPower + researchPower;
          const cappedWarPower = Math.min(warPower, basePower);
          const playerPower = basePower + cappedWarPower;

          // 6. Firestore'a kaydet
          await db.collection("playerBases").doc(uid).set({
            buildings,
            resources,
            warPower,
            lastSavedAt: Date.now(),
          }, { merge: true });

          await db.collection("players").doc(uid).set({
            playerPower,
            hqLevel,
            wins,
            losses,
            warPower,
            lastOnline: Date.now(),
          }, { merge: true });

          processed++;
        } catch (err) {
          console.warn(`[BotSim] ${uid} hata:`, err.message);
        }
      }
    } catch (err) {
      console.error("[BotSim] Fatal:", err);
    }

    console.log(`[BotSim] Tamamlandı: ${processed} bot güncellendi`);
  }
);

// ── Tüm oyuncuların gücünü yeniden hesapla ────────────────────
exports.recalcAllPower = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    const basesSnap = await db.collection("playerBases").get();
    let updated = 0;
    let errors = 0;

    for (const doc of basesSnap.docs) {
      try {
        const state = doc.data();
        const uid = doc.id;
        const buildings = state.buildings ?? [];

        // Yeni kademeli formül
        const buildingPower = buildings.reduce((s, b) => {
          const l = b.level ?? 1;
          return s + l * (l + 1) / 2 * 100;
        }, 0);
        const unitPower = buildings.reduce((s, b) => {
          for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
            s += (count ?? 0) * (POWER_TIER[1] ?? 10); // basit tier
          }
          return s;
        }, 0);
        const researchPower = (state.researchStates ?? [])
          .filter(r => r.completed)
          .reduce((s) => s + 50, 0);
        const basePower = buildingPower + unitPower + researchPower;
        const warPower = state.warPower ?? 0;
        const cappedWarPower = Math.min(warPower, basePower);
        const playerPower = basePower + cappedWarPower;

        const hqLevel = buildings.find(b => b.id === "hq")?.level ?? 1;

        await db.collection("players").doc(uid).set({
          playerPower,
          hqLevel,
          warPower,
          lastOnline: Date.now(),
        }, { merge: true });

        updated++;
      } catch (err) {
        console.error(`[RecalcPower] ${doc.id}:`, err.message);
        errors++;
      }
    }

    res.json({ success: true, updated, errors, total: basesSnap.size });
  }
);

// ── Bot İttifakları Oluştur ──────────────────────────────────
const BOT_ALLIANCES = [
  { name: "Demir Pençe", tag: "DPRCE", joinType: "approval" },
  { name: "Kızıl Bozkurt", tag: "KBZKT", joinType: "approval" },
  { name: "Yıldırım Ordu", tag: "YLDRM", joinType: "open" },
  { name: "Çelik Kalkan", tag: "CLKKN", joinType: "approval" },
  { name: "Şahin Timi", tag: "SAHIN", joinType: "approval" },
  { name: "Shadow Legion", tag: "SHDWL", joinType: "approval" },
  { name: "Iron Wolves", tag: "IRWLF", joinType: "open" },
  { name: "Phantom Strike", tag: "PHNTM", joinType: "approval" },
  { name: "Thunder Hawks", tag: "THAWK", joinType: "open" },
  { name: "Dark Vanguard", tag: "DKVGD", joinType: "approval" },
  { name: "Nefes Kesen", tag: "NFSKS", joinType: "open" },
  { name: "Anka Kartalı", tag: "ANKKR", joinType: "approval" },
  { name: "Steel Titans", tag: "STTNS", joinType: "approval" },
  { name: "Börü Takımı", tag: "BORUT", joinType: "open" },
  { name: "War Council", tag: "WRCNL", joinType: "approval" },
];

exports.seedBotAlliances = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    try {
      // 1. Mevcut bot ittifaklarını temizle
      const existingSnap = await db.collection("alliances").get();
      for (const doc of existingSnap.docs) {
        const data = doc.data();
        // Sadece bot ittifaklarını sil (BOT_ALLIANCES tag listesinde olanlar)
        if (BOT_ALLIANCES.some(a => a.tag === data.tag)) {
          const membersSnap = await db.collection("alliances").doc(doc.id).collection("members").get();
          for (const m of membersSnap.docs) await m.ref.delete();
          const msgsSnap = await db.collection("alliances").doc(doc.id).collection("messages").limit(100).get();
          for (const m of msgsSnap.docs) await m.ref.delete();
          await doc.ref.delete();
        }
      }

      // 2. Bot oyuncuları al (playerPower'a göre sırala)
      const playersSnap = await db.collection("players").get();
      const bots = [];
      for (const doc of playersSnap.docs) {
        const d = doc.data();
        if (d.isBot) {
          bots.push({ uid: doc.id, displayName: d.displayName ?? "Bot", power: d.playerPower ?? 0, hqLevel: d.hqLevel ?? 1 });
        }
      }
      // Güce göre karıştır — her ittifak farklı güçte olsun
      bots.sort(() => Math.random() - 0.5);

      // 3. Botları ittifaklara dağıt (3-5 kişi)
      let botIndex = 0;
      let createdAlliances = 0;

      for (const allianceDef of BOT_ALLIANCES) {
        const memberCount = 3 + Math.floor(Math.random() * 3); // 3-5
        const members = [];
        for (let i = 0; i < memberCount && botIndex < bots.length; i++) {
          members.push(bots[botIndex++]);
        }
        if (members.length < 3) break;

        // Lider = en güçlü üye
        members.sort((a, b) => b.power - a.power);
        const leader = members[0];

        const allianceRef = db.collection("alliances").doc();
        const allianceId = allianceRef.id;
        const now = Date.now();
        const totalPower = members.reduce((s, m) => s + m.power, 0);

        // İttifak dokümanı
        await allianceRef.set({
          id: allianceId,
          name: allianceDef.name,
          nameLower: allianceDef.name.toLowerCase(),
          tag: allianceDef.tag,
          description: `${allianceDef.name} ittifakı`,
          leaderUid: leader.uid,
          leaderName: leader.displayName,
          joinType: allianceDef.joinType,
          memberCount: members.length,
          maxMembers: 30,
          totalPower,
          treasury: { cash: Math.floor(Math.random() * 50000), oil: Math.floor(Math.random() * 20000), ore: Math.floor(Math.random() * 15000) },
          createdAt: now - Math.floor(Math.random() * 7 * 86400000), // 1-7 gün önce
        });

        // Üyeleri ekle
        for (let i = 0; i < members.length; i++) {
          const m = members[i];
          const rank = i === 0 ? "leader" : (i === 1 && Math.random() > 0.5 ? "officer" : "member");
          await db.collection("alliances").doc(allianceId).collection("members").doc(m.uid).set({
            uid: m.uid,
            displayName: m.displayName,
            rank,
            power: m.power,
            contribution: Math.floor(Math.random() * 10000),
            joinedAt: now - Math.floor(Math.random() * 5 * 86400000),
            lastOnline: now - Math.floor(Math.random() * 3600000),
          });

          // Oyuncunun allianceId/Tag'ini güncelle
          await db.collection("players").doc(m.uid).set({
            allianceId,
            allianceTag: allianceDef.tag,
          }, { merge: true });
        }

        // Hoş geldin mesajı
        await db.collection("alliances").doc(allianceId).collection("messages").add({
          senderUid: "system",
          senderName: "Sistem",
          text: `${allianceDef.name} ittifakı kuruldu!`,
          timestamp: now,
          type: "system",
        });

        createdAlliances++;
      }

      res.json({
        success: true,
        alliances: createdAlliances,
        botsAssigned: botIndex,
        botsRemaining: bots.length - botIndex,
      });
    } catch (err) {
      console.error("[SeedBotAlliances]", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Tüm ittifakların memberCount ve totalPower'ını düzelt ────
exports.fixAllianceCounts = onRequest(
  { region: "us-central1", timeoutSeconds: 120 },
  async (req, res) => {
    const alliancesSnap = await db.collection("alliances").get();
    let fixed = 0;
    for (const doc of alliancesSnap.docs) {
      const membersSnap = await db.collection("alliances").doc(doc.id).collection("members").get();
      const realCount = membersSnap.size;
      let totalPower = 0;
      for (const m of membersSnap.docs) {
        totalPower += m.data().power ?? 0;
      }
      // players koleksiyonundan güncel güçleri al
      let liveTotalPower = 0;
      for (const m of membersSnap.docs) {
        const playerSnap = await db.collection("players").doc(m.id).get();
        if (playerSnap.exists) {
          liveTotalPower += playerSnap.data().playerPower ?? 0;
        }
      }
      await doc.ref.set({
        memberCount: realCount,
        totalPower: liveTotalPower > 0 ? liveTotalPower : totalPower,
      }, { merge: true });
      fixed++;
    }
    res.json({ success: true, fixed });
  }
);

// ── Bot birim ID düzeltme (one-time fix) ─────────────────────
exports.fixBotUnitIds = onRequest(
  { region: "us-central1", timeoutSeconds: 120 },
  async (req, res) => {
    const ID_MAP = {
      kirpiMRAP: 'kirpi', cobraII: 'cobra2', kaplanIFV: 'kaplanIfv',
      bradleyIFV: 'bradley', pumaIFV: 'puma', ah1zViper: 'ah1z',
      firtinaSPH: 'firtina', arleighBurke: 'arleighburke',
      virginiaSSN: 'virginiaclass', qeCarrier: 'qecarrier',
      fordCarrier: 'fordcarrier', patriot: 'patriotPac3',
    };
    const botsSnap = await db.collection("players").where("isBot", "==", true).get();
    let fixed = 0;
    for (const doc of botsSnap.docs) {
      const baseSnap = await db.collection("playerBases").doc(doc.id).get();
      if (!baseSnap.exists) continue;
      const buildings = baseSnap.data().buildings ?? [];
      let changed = false;
      const updated = buildings.map(b => {
        if (!b.trainedUnits) return b;
        const newTrained = {};
        for (const [uid, count] of Object.entries(b.trainedUnits)) {
          const correctId = ID_MAP[uid] ?? uid;
          if (correctId !== uid) changed = true;
          newTrained[correctId] = (newTrained[correctId] ?? 0) + count;
        }
        return { ...b, trainedUnits: newTrained };
      });
      if (changed) {
        await db.collection("playerBases").doc(doc.id).set({ buildings: updated }, { merge: true });
        fixed++;
      }
    }
    res.json({ success: true, botsChecked: botsSnap.size, fixed });
  }
);

// ── Oyuncu envanter sorgulama ─────────────────────────────────
exports.inspectPlayer = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const { name, uid: queryUid } = req.body ?? req.query ?? {};
    if (!name && !queryUid) return res.status(400).json({ error: "name veya uid gerekli" });
    // UID ile doğrudan arama
    if (queryUid) {
      const doc = await db.collection("players").doc(queryUid).get();
      if (!doc.exists) {
        // players'da yok ama Auth'ta olabilir
        let email = null, provider = null;
        try {
          const { getAuth } = require("firebase-admin/auth");
          const userRecord = await getAuth().getUser(queryUid);
          email = userRecord.email ?? null;
          provider = (userRecord.providerData ?? []).map(p => p.providerId).join(', ') || null;
        } catch {}
        return res.json({ uid: queryUid, name: null, email, provider, note: "players koleksiyonunda bulunamadı" });
      }
      // doc bulundu — normal akışa devam
      var snap = { docs: [doc], empty: false };
    } else {
    // Önce tam eşleşme dene, bulamazsa partial arama yap
    var snap = await db.collection("players").where("displayName", "==", name).limit(1).get();
    if (snap.empty) {
      // Partial: tüm oyuncuları tara (küçük DB için uygun)
      const allSnap = await db.collection("players").limit(500).get();
      const lowerName = name.toLowerCase();
      const matches = allSnap.docs.filter(d => (d.data().displayName ?? '').toLowerCase().includes(lowerName));
      if (matches.length === 0) {
        // Hiç bulunamadıysa tüm gerçek oyuncu isimlerini döndür
        const realPlayers = allSnap.docs.filter(d => !d.data().isBot).map(d => d.data().displayName).filter(Boolean).sort();
        return res.status(404).json({ error: "Oyuncu bulunamadı", allRealPlayers: realPlayers });
      }
      if (matches.length > 1) return res.json({ multipleMatches: matches.map(d => ({ uid: d.id, name: d.data().displayName })) });
      snap = { docs: [matches[0]], empty: false };
    }
    } // end else (name-based search)
    const uid = snap.docs[0].id;
    const playerData = snap.docs[0].data();
    const baseSnap = await db.collection("playerBases").doc(uid).get();
    if (!baseSnap.exists) return res.json({ uid, units: {}, total: 0 });
    const buildings = baseSnap.data().buildings ?? [];
    const birlikler = baseSnap.data().birlikler ?? [];
    const units = {};
    let total = 0;
    for (const b of buildings) {
      for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
        if (count > 0) { units[unitId] = (units[unitId] ?? 0) + count; total += count; }
      }
    }
    let birlikTotal = 0;
    for (const bl of birlikler) {
      for (const s of (bl.slots ?? [])) { if (s.count > 0) birlikTotal += s.count; }
    }
    const hqLevel = buildings.find(b => b.id === 'hq')?.level ?? 1;
    // Auth bilgisi
    let email = null;
    let provider = null;
    try {
      const { getAuth } = require("firebase-admin/auth");
      const userRecord = await getAuth().getUser(uid);
      email = userRecord.email ?? null;
      provider = (userRecord.providerData ?? []).map(p => p.providerId).join(', ') || null;
    } catch {}
    res.json({ uid, name: playerData.displayName, email, provider, hqLevel, power: playerData.playerPower, units, envanter: total, birlik: birlikTotal, toplam: total + birlikTotal });
  }
);

// ── Debug: aktif savaşları göster ────────────────────────────
exports.debugWars = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const snap = await db.collection("alliances").get();
    const wars = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.activeWar) {
        wars.push({ id: doc.id, name: d.name, tag: d.tag, war: d.activeWar });
      }
    }
    res.json({ wars });
  }
);

// ── Savaş skorlarını sıfırla ─────────────────────────────────
exports.resetWarScores = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const snap = await db.collection("alliances").get();
    let reset = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.activeWar) {
        const updatedWar = { ...d.activeWar, ourScore: 0, theirScore: 0, lastAttack: null };
        await doc.ref.set({ activeWar: updatedWar }, { merge: true });
        reset++;
      }
    }
    res.json({ success: true, reset });
  }
);

// ── Bot PvP saldırısı — server-side çözümleme ──────────────
exports.botAttack = onRequest(
  { region: "us-central1", timeoutSeconds: 120 },
  async (req, res) => {
    try {
      const { botUid, targetUid, travelSeconds, isWarAttack, allianceId, enemyAllianceId } = req.body ?? {};
      if (!botUid || !targetUid) return res.status(400).json({ error: "botUid ve targetUid gerekli" });

      const botSnap = await db.collection("players").doc(botUid).get();
      const targetSnap = await db.collection("players").doc(targetUid).get();
      if (!botSnap.exists || !targetSnap.exists) return res.status(404).json({ error: "Oyuncu bulunamadı" });

      const botData = botSnap.data();
      const targetData = targetSnap.data();
      const now = Date.now();
      const travel = travelSeconds ?? 180; // 3 dakika

      // Bot'un birimlerini oku (savunma birimleri saldırıya katılmaz)
      const AIR_DEF = new Set(['stinger','iglaS','hisarA','hisarO','ironDome','patriotPac3','siper','s500','thaad']);
      const botBaseSnap = await db.collection("playerBases").doc(botUid).get();
      const botBuildings = botBaseSnap.exists ? (botBaseSnap.data().buildings ?? []) : [];
      const marchUnits = [];
      let totalUnits = 0;
      let attackPower = 0;
      for (const b of botBuildings) {
        for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
          if (count > 0 && !AIR_DEF.has(unitId)) {
            marchUnits.push({ unitId, count, buildingId: b.id });
            totalUnits += count;
            attackPower += count * 10;
          }
        }
      }

      // 1. March oluştur (banner için)
      const marchRef = db.collection("marches").doc();
      await marchRef.set({
        id: marchRef.id,
        attackerUid: botUid,
        attackerName: botData.displayName ?? "Bot",
        defenderUid: targetUid,
        defenderName: targetData.displayName ?? "Oyuncu",
        marchUnits: marchUnits.slice(0, 8),
        attackPower,
        committedUnits: totalUnits,
        startedAt: now,
        arrivesAt: now + travel * 1000,
        travelSeconds: travel,
        status: "marching",
      });

      // Push notification — saldırı başladı
      const atkName = botData.displayName ?? "Bot";
      const defName = targetData.displayName ?? "Oyuncu";
      await sendPushNotification(targetUid, "⚔️ Saldırı!", `${atkName} üssüne saldırıyor!`, "attacks");

      // 2. Savunanın birimlerini oku
      const defBaseSnap = await db.collection("playerBases").doc(targetUid).get();
      const defBuildings = defBaseSnap.exists ? (defBaseSnap.data().buildings ?? []) : [];
      const defUnits = [];
      let defPower = 0;
      for (const b of defBuildings) {
        for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
          if (count > 0) {
            defUnits.push({ unitId, count, buildingId: b.id });
            defPower += count * 10;
          }
        }
      }
      const totalDefUnits = defUnits.reduce((s, u) => s + u.count, 0);

      // 3. Sefer süresini bekle
      await new Promise(resolve => setTimeout(resolve, travel * 1000));

      // 4. Savaş sonucu — combat engine ile (branch-aware çapraz tablo)
      // Savunanın birlik birimlerini de dahil et
      const defBirlikler = defBaseSnap.exists ? (defBaseSnap.data().birlikler ?? []) : [];
      const allDefUnits = [...defUnits];
      for (const bl of defBirlikler) {
        for (const slot of (bl.slots ?? [])) {
          if (slot.count > 0) allDefUnits.push({ unitId: slot.unitId, count: slot.count });
        }
      }
      const combat = resolveServerCombat(marchUnits, allDefUnits);
      const won = combat.won;
      const score = won ? 0 : 10;
      const attackerResults = combat.attackerResults;
      const defenderResults = combat.defenderResults;
      const atkLossTotal = combat.totalAttackerLosses;
      const defLossTotal = combat.totalDefenderDestroyed;
      attackPower = combat.totalAttackPower;
      defPower = combat.totalDefensePower;

      // 5. March'ı sil
      await marchRef.delete();

      // ── Birim kayıplarını envanterden düş ──
      const atkLossMap = {};
      for (const r of attackerResults) {
        if (r.losses > 0) atkLossMap[r.unitId] = (atkLossMap[r.unitId] ?? 0) + r.losses;
      }
      await deductUnitLosses(botUid, atkLossMap);
      const defLossMap = {};
      for (const r of defenderResults) {
        if (r.destroyed > 0) defLossMap[r.unitId] = (defLossMap[r.unitId] ?? 0) + r.destroyed;
      }
      await deductUnitLosses(targetUid, defLossMap);

      // ── Kaynak & güç transferi (PvP ile aynı mantık) ──
      const botBaseState = botBaseSnap.exists ? botBaseSnap.data() : {};
      const defBaseState = defBaseSnap.exists ? defBaseSnap.data() : {};
      const botRes = botBaseState.resources ?? [];
      const defRes = defBaseState.resources ?? [];
      const bCash = botRes.find(r => r.key === 'cash')?.amount ?? 0;
      const bOil = botRes.find(r => r.key === 'oil')?.amount ?? 0;
      const bOre = botRes.find(r => r.key === 'ore')?.amount ?? 0;
      const dCash = defRes.find(r => r.key === 'cash')?.amount ?? 0;
      const dOil = defRes.find(r => r.key === 'oil')?.amount ?? 0;
      const dOre = defRes.find(r => r.key === 'ore')?.amount ?? 0;
      const bPP = botData.playerPower ?? 0;
      const dPP = targetData.playerPower ?? 0;
      const loserC = won ? dCash : bCash;
      const loserO = won ? dOil : bOil;
      const loserR = won ? dOre : bOre;
      const loserPP = won ? dPP : bPP;
      const tCash = Math.round(loserC * 0.2);
      const tOil = Math.round(loserO * 0.2);
      const tOre = Math.round(loserR * 0.2);
      const tPower = Math.max(10, Math.round(loserPP * 0.2));

      if (won) {
        // Bot kazandı → savunan kaynak & güç kaybeder
        const updRes = defRes.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount - tCash) };
          if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount - tOil) };
          if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount - tOre) };
          return r;
        });
        await db.collection("playerBases").doc(targetUid).set({ resources: updRes, warPower: Math.max(0, (defBaseState.warPower ?? 0) - tPower) }, { merge: true });
        await db.collection("players").doc(targetUid).set({ playerPower: Math.max(0, dPP - tPower) }, { merge: true });
      } else {
        // Bot kaybetti → savunan kaynak & güç kazanır
        const updRes = defRes.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity ?? 10000000, r.amount + tCash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity ?? 10000000, r.amount + tOil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity ?? 10000000, r.amount + tOre) };
          return r;
        });
        await db.collection("playerBases").doc(targetUid).set({ resources: updRes, warPower: (defBaseState.warPower ?? 0) + tPower }, { merge: true });
        await db.collection("players").doc(targetUid).set({ playerPower: dPP + tPower }, { merge: true });
      }

      const defRewardCash = won ? -tCash : tCash;
      const defRewardOil = won ? -tOil : tOil;
      const defRewardOre = won ? -tOre : tOre;
      const defPowerChg = won ? -tPower : tPower;

      // 6. İttifak savaşı skoru ekle
      if (isWarAttack && allianceId && enemyAllianceId) {
        const defAllianceId = targetData.allianceId;
        if (defAllianceId) {
          const defAllianceSnap = await db.collection("alliances").doc(defAllianceId).get();
          if (defAllianceSnap.exists) {
            const defWarData = defAllianceSnap.data().activeWar;
            if (defWarData) {
              await defAllianceSnap.ref.set({
                activeWar: { ...defWarData, ourScore: (defWarData.ourScore ?? 0) + score, lastAttack: { attackerName: botData.displayName ?? "Bot", defenderName: targetData.displayName ?? "Oyuncu", won: !won, score, timestamp: Date.now() } },
              }, { merge: true });
            }
          }
        }

        const atkAllianceSnap = await db.collection("alliances").doc(allianceId).get();
        if (atkAllianceSnap.exists) {
          const atkWarData = atkAllianceSnap.data().activeWar;
          if (atkWarData) {
            const botScore = won ? 10 : 0;
            await atkAllianceSnap.ref.set({
              activeWar: { ...atkWarData, ourScore: (atkWarData.ourScore ?? 0) + botScore },
            }, { merge: true });
          }
        }
        if (defAllianceId) {
          const defSnap2 = await db.collection("alliances").doc(defAllianceId).get();
          if (defSnap2.exists && defSnap2.data().activeWar) {
            const dw2 = defSnap2.data().activeWar;
            const botScore2 = won ? 10 : 0;
            await defSnap2.ref.set({
              activeWar: { ...dw2, theirScore: (dw2.theirScore ?? 0) + botScore2 },
            }, { merge: true });
          }
        }

        // Savaş raporu (savunanın ittifakına)
        if (defAllianceId) {
          try {
            const atkName = botData.displayName ?? "Bot";
            const defName = targetData.displayName ?? "Oyuncu";
            await db.collection("alliances").doc(defAllianceId).collection("warBattleLogs").add({
              id: `bot_${Date.now()}`,
              targetId: 'defense',
              targetName: defName,
              attackerName: atkName,
              defenderName: defName,
              timestamp: Date.now(),
              savedAt: Date.now(),
              won: !won,
              score,
              attackPower,
              defensePower: defPower,
              unitsLost: !won ? 0 : defLossTotal,
              rewardCash: defRewardCash, rewardOil: defRewardOil, rewardOre: defRewardOre, powerChange: defPowerChg,
              attackerResults,
              defenderResults,
            });
          } catch {}
        }

        // Saldıranın ittifakına rapor
        if (allianceId) {
          try {
            const atkName = botData.displayName ?? "Bot";
            const defName = targetData.displayName ?? "Oyuncu";
            const botScore = won ? 10 : 0;
            await db.collection("alliances").doc(allianceId).collection("warBattleLogs").add({
              id: `bot_atk_${Date.now()}`,
              targetId: targetUid,
              targetName: defName,
              attackerName: atkName,
              defenderName: defName,
              timestamp: Date.now(),
              savedAt: Date.now(),
              won: won,
              score: botScore,
              attackPower,
              defensePower: defPower,
              unitsLost: won ? 0 : atkLossTotal,
              rewardCash: won ? tCash : -tCash, rewardOil: won ? tOil : -tOil, rewardOre: won ? tOre : -tOre, powerChange: won ? tPower : -tPower,
              attackerResults,
              defenderResults,
            });
          } catch {}
        }
      }

      // Push notification — savaş sonucu
      if (won) {
        await sendPushNotification(targetUid, "💀 Üssün saldırıya uğradı!", `${atkName} saldırdı — kaynak ve birim kaybettin.`, "battleResults");
      } else {
        await sendPushNotification(targetUid, "🏆 Savunma başarılı!", `${atkName} saldırdı ama yenildi! Ganimet kazandın.`, "battleResults");
      }

      res.json({ success: true, marchId: marchRef.id, attacker: botData.displayName, won, score, travelSeconds: travel });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Savunan kayıplarını düş (PvP sonrası client çağırır) ─────
exports.deductDefenderLosses = onRequest(
  { region: "us-central1", timeoutSeconds: 30 },
  async (req, res) => {
    try {
      const { defenderUid, losses, attackerName, won } = req.body;
      // losses: { unitId: destroyedCount, ... }
      if (!defenderUid || !losses || typeof losses !== 'object') {
        return res.status(400).json({ error: 'defenderUid ve losses gerekli' });
      }

      // Push notification — PvP savaş sonucu
      if (attackerName) {
        if (won) {
          await sendPushNotification(defenderUid, "💀 Üssün saldırıya uğradı!", `${attackerName} saldırdı — kaynak ve birim kaybettin.`, "battleResults");
        } else {
          await sendPushNotification(defenderUid, "🏆 Savunma başarılı!", `${attackerName} saldırdı ama yenildi! Ganimet kazandın.`, "battleResults");
        }
      }

      const baseSnap = await db.collection("playerBases").doc(defenderUid).get();
      if (!baseSnap.exists) return res.status(404).json({ error: 'Oyuncu bulunamadı' });

      const state = baseSnap.data();
      const buildings = state.buildings ?? [];
      const lossMap = { ...losses };
      let changed = false;

      const updatedBuildings = buildings.map(b => {
        const trained = { ...(b.trainedUnits ?? {}) };
        for (const [unitId, loss] of Object.entries(lossMap)) {
          if (trained[unitId] && trained[unitId] > 0 && loss > 0) {
            const deduct = Math.min(trained[unitId], loss);
            trained[unitId] -= deduct;
            lossMap[unitId] = loss - deduct;
            if (trained[unitId] <= 0) delete trained[unitId];
            changed = true;
          }
        }
        return { ...b, trainedUnits: trained };
      });

      if (changed) {
        await db.collection("playerBases").doc(defenderUid).set({ buildings: updatedBuildings }, { merge: true });

        // playerPower güncelle
        const buildingPower = updatedBuildings.reduce((s, b) => { const l = b.level ?? 1; return s + l * (l + 1) / 2 * 100; }, 0);
        const unitPower = updatedBuildings.reduce((s, b) => {
          for (const count of Object.values(b.trainedUnits ?? {})) { s += (count ?? 0) * 10; }
          return s;
        }, 0);
        const researchPower = (state.researchStates ?? []).filter(r => r.completed).reduce((s) => s + 50, 0);
        const basePower = buildingPower + unitPower + researchPower;
        const warPower = state.warPower ?? 0;
        const playerPower = basePower + Math.min(warPower, basePower);
        await db.collection("players").doc(defenderUid).set({ playerPower }, { merge: true });
      }

      res.json({ success: true, changed });
    } catch (err) {
      console.error("[deductDefenderLosses]", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── İttifak Savaşı Sonuçlandırma — ödül dağıtımı ────────────
const WAR_REWARD_PER_MEMBER = { cash: 50000, oil: 50000, ore: 50000, gold: 100, warPower: 2000 };
const MVP_GOLD_BONUS = 250;

/** Tek bir ittifak için savaşı çöz — ödüller, mesajlar, rapor, temizlik */
async function resolveWarForAlliance(allianceDoc) {
  const data = allianceDoc.data();
  if (!data.activeWar) return null;
  const war = data.activeWar;

  const won = (war.ourScore ?? 0) >= (war.theirScore ?? 0);
  const membersSnap = await db.collection("alliances").doc(allianceDoc.id).collection("members").get();
  const memberUids = membersSnap.docs.map(d => d.id);
  let mvpName = null;

  if (won && memberUids.length > 0) {
    let mvpUid = null;
    let mvpScore = 0;
    try {
      const logsSnap = await db.collection("alliances").doc(allianceDoc.id).collection("warBattleLogs").get();
      const scoreByAttacker = {};
      for (const logDoc of logsSnap.docs) {
        const log = logDoc.data();
        if (log.attackerName && log.score) {
          scoreByAttacker[log.attackerName] = (scoreByAttacker[log.attackerName] ?? 0) + log.score;
        }
      }
      for (const memberDoc of membersSnap.docs) {
        const memberName = memberDoc.data().displayName;
        const memberScore = scoreByAttacker[memberName] ?? 0;
        if (memberScore > mvpScore) { mvpScore = memberScore; mvpUid = memberDoc.id; }
      }
    } catch {}

    for (const memberUid of memberUids) {
      try {
        const baseSnap = await db.collection("playerBases").doc(memberUid).get();
        if (!baseSnap.exists) continue;
        const state = baseSnap.data();
        const resources = state.resources ?? [];
        const updatedResources = resources.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity ?? 10000000, (r.amount ?? 0) + WAR_REWARD_PER_MEMBER.cash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity ?? 10000000, (r.amount ?? 0) + WAR_REWARD_PER_MEMBER.oil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity ?? 10000000, (r.amount ?? 0) + WAR_REWARD_PER_MEMBER.ore) };
          if (r.key === 'gold') {
            const goldBonus = WAR_REWARD_PER_MEMBER.gold + (memberUid === mvpUid ? MVP_GOLD_BONUS : 0);
            return { ...r, amount: Math.min(r.capacity ?? 1000000, (r.amount ?? 0) + goldBonus) };
          }
          return r;
        });
        const newWarPower = (state.warPower ?? 0) + WAR_REWARD_PER_MEMBER.warPower;
        await db.collection("playerBases").doc(memberUid).set({ resources: updatedResources, warPower: newWarPower }, { merge: true });
        const buildings = state.buildings ?? [];
        const buildingPower = buildings.reduce((s, b) => { const l = b.level ?? 1; return s + l * (l + 1) / 2 * 100; }, 0);
        const unitPower = buildings.reduce((s, b) => { for (const count of Object.values(b.trainedUnits ?? {})) { s += (count ?? 0) * 10; } return s; }, 0);
        const researchPower = (state.researchStates ?? []).filter(r => r.completed).reduce((s) => s + 50, 0);
        const basePower = buildingPower + unitPower + researchPower;
        const playerPower = basePower + Math.min(newWarPower, basePower);
        await db.collection("players").doc(memberUid).set({ playerPower, warPower: newWarPower }, { merge: true });
      } catch (err) { console.warn(`[ResolveWar] Reward error for ${memberUid}:`, err.message); }
    }

    mvpName = mvpUid ? membersSnap.docs.find(d => d.id === mvpUid)?.data()?.displayName ?? '?' : null;
    const msg = `🏆 SAVAŞ KAZANILDI!\n💰 Her üyeye: 50K 💵 + 50K 🛢️ + 50K ⛏️ + 100 🪙 + 2000 ⚡${mvpName ? `\n🌟 MVP: ${mvpName} (+250 🪙)` : ''}`;
    try { await db.collection("alliances").doc(allianceDoc.id).collection("messages").add({ senderUid: "system", senderName: "Sistem", text: msg, timestamp: Date.now(), type: "system" }); } catch {}
  } else {
    try { await db.collection("alliances").doc(allianceDoc.id).collection("messages").add({ senderUid: "system", senderName: "Sistem", text: "💀 İttifak savaşı kaybedildi...", timestamp: Date.now(), type: "system" }); } catch {}
  }

  // Savaş sonuç raporu
  const warReport = {
    type: 'warResult', timestamp: Date.now(), won,
    ourName: data.name, ourTag: data.tag,
    enemyName: war.enemyName ?? '?', enemyTag: war.enemyTag ?? '?',
    ourScore: war.ourScore ?? 0, theirScore: war.theirScore ?? 0,
    duration: (war.endsAt ?? 0) - (war.startedAt ?? 0),
    memberCount: memberUids.length,
    mvp: won ? (mvpName ?? null) : null,
    rewards: won ? { perMember: `50K 💵 + 50K 🛢️ + 50K ⛏️ + 100 🪙 + 2000 ⚡`, mvpBonus: mvpName ? '+250 🪙' : null } : null,
    memberStats: [],
  };
  try {
    const logsSnap = await db.collection("alliances").doc(allianceDoc.id).collection("warBattleLogs").get();
    const statsByMember = {};
    for (const logDoc of logsSnap.docs) {
      const log = logDoc.data();
      if (log.type === 'warResult') continue;
      const name = log.attackerName ?? log.defenderName;
      if (!statsByMember[name]) statsByMember[name] = { name, attacks: 0, wins: 0, score: 0 };
      statsByMember[name].attacks++;
      if (log.won) statsByMember[name].wins++;
      statsByMember[name].score += (log.score ?? 0);
    }
    warReport.memberStats = Object.values(statsByMember).sort((a, b) => b.score - a.score);
  } catch {}

  try { await db.collection("alliances").doc(allianceDoc.id).collection("warBattleLogs").add(warReport); } catch {}
  await allianceDoc.ref.set({ activeWar: null, lastWarEnded: Date.now() }, { merge: true });

  // Eski logları temizle (warResult hariç)
  try {
    const logsSnap = await db.collection("alliances").doc(allianceDoc.id).collection("warBattleLogs").get();
    for (const logDoc of logsSnap.docs) {
      if (logDoc.data().type === 'warResult') continue;
      await logDoc.ref.delete();
    }
  } catch {}

  return { alliance: data.name, won, members: memberUids.length, mvp: mvpName };
}

exports.resolveAllianceWar = onRequest(
  { region: "us-central1", timeoutSeconds: 120 },
  async (req, res) => {
    try {
      const alliancesSnap = await db.collection("alliances").get();
      let resolvedCount = 0;
      const results = [];
      for (const allianceDoc of alliancesSnap.docs) {
        const data = allianceDoc.data();
        if (!data.activeWar) continue;
        if (Date.now() < data.activeWar.endsAt) continue;
        const result = await resolveWarForAlliance(allianceDoc);
        if (result) { results.push(result); resolvedCount++; }
      }
      res.json({ success: true, resolved: resolvedCount, results });
    } catch (err) {
      console.error("[ResolveAllianceWar]", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── İttifak Savaşı — Plan Bazlı Bot Saldırıları ─────────────
// Savaş başladığında botAttackPlan oluşturulur:
// Her bot × 3 saldırı × farklı düşman üyesi = zamanlanmış saldırılar
// Scheduler her 30dk çalışır, zamanı gelen saldırıları botAttack ile çalıştırır

exports.createBotAttackPlan = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const { allianceId, force } = req.body ?? {};
      const alliancesSnap = allianceId
        ? [await db.collection("alliances").doc(allianceId).get()]
        : (await db.collection("alliances").get()).docs;

      let planned = 0;
      for (const allianceDocOrSnap of alliancesSnap) {
        const allianceDoc = allianceDocOrSnap.ref ? allianceDocOrSnap : { ref: db.collection("alliances").doc(allianceDocOrSnap.id), id: () => allianceDocOrSnap.id, data: () => allianceDocOrSnap.data(), exists: allianceDocOrSnap.exists };
        const data = allianceDoc.data ? allianceDoc.data() : allianceDocOrSnap.data();
        if (!data?.activeWar) continue;
        if (data.activeWar.botAttackPlan && !force) continue; // Plan zaten var

        const war = data.activeWar;
        const docId = allianceDoc.id ?? allianceDocOrSnap.id;

        // Bot üyelerini bul
        const membersSnap = await db.collection("alliances").doc(docId).collection("members").get();
        const botMembers = [];
        for (const memberDoc of membersSnap.docs) {
          const playerSnap = await db.collection("players").doc(memberDoc.id).get();
          if (playerSnap.exists && playerSnap.data().isBot) {
            botMembers.push({ uid: memberDoc.id, name: playerSnap.data().displayName ?? "Bot" });
          }
        }
        if (botMembers.length === 0) continue;

        // Düşman üyelerini al + güçlerini oku
        const enemyMembersSnap = await db.collection("alliances").doc(war.enemyAllianceId).collection("members").get();
        const enemyMembers = [];
        for (const d of enemyMembersSnap.docs) {
          const playerSnap = await db.collection("players").doc(d.id).get();
          const power = playerSnap.exists ? (playerSnap.data().playerPower ?? 0) : 0;
          enemyMembers.push({ uid: d.id, name: d.data().displayName ?? "Düşman", power });
        }
        if (enemyMembers.length === 0) continue;

        // Bot güçlerini oku
        for (const bot of botMembers) {
          const bSnap = await db.collection("players").doc(bot.uid).get();
          bot.power = bSnap.exists ? (bSnap.data().playerPower ?? 0) : 0;
        }

        // Plan oluştur: her bot × 3 saldırı, aynı bot'un saldırıları arasında min 2 saat
        const ATTACKS_PER_BOT = 3;
        const BOT_COOLDOWN = 2 * 60 * 60 * 1000; // 2 saat
        const MAX_POWER_RATIO = 5; // Bot, kendisinden 5x güçlü hedefe saldırmasın

        // Güvenlik: düşman listesinden kendi ittifak üyelerini ve botun kendisini çıkar
        const botUids = new Set(botMembers.map(b => b.uid));
        const memberUids = new Set(membersSnap.docs.map(d => d.id));
        const safeEnemies = enemyMembers.filter(e => !botUids.has(e.uid) && !memberUids.has(e.uid));
        if (safeEnemies.length === 0) continue;

        const plan = [];
        const MAX_ATTACKS_PER_BOT = Math.min(safeEnemies.length, ATTACKS_PER_BOT);
        for (const bot of botMembers) {
          // Bot'un gücüne uygun düşmanları filtrele (max 5x güçlü olana saldırabilir)
          const viableEnemies = safeEnemies
            .filter(e => e.uid !== bot.uid && e.power <= (bot.power ?? 0) * MAX_POWER_RATIO)
            .sort(() => Math.random() - 0.5);
          // Uygun düşman yoksa en zayıf düşmanlara saldırsın
          const targetPool = viableEnemies.length > 0
            ? viableEnemies
            : [...safeEnemies].filter(e => e.uid !== bot.uid).sort((a, b) => a.power - b.power).slice(0, 3);
          if (targetPool.length === 0) continue;
          const attackCount = Math.min(targetPool.length, MAX_ATTACKS_PER_BOT);
          for (let i = 0; i < attackCount; i++) {
            const target = targetPool[i % targetPool.length];
            // İlk saldırı: 30-60dk sonra, sonrakiler her biri +2 saat arayla
            const baseDelay = 30 * 60 * 1000 + Math.floor(Math.random() * 30 * 60 * 1000);
            plan.push({
              botUid: bot.uid,
              botName: bot.name,
              targetUid: target.uid,
              targetName: target.name,
              scheduledAt: war.startedAt + baseDelay + (i * BOT_COOLDOWN) + Math.floor(Math.random() * 15 * 60 * 1000),
              executed: false,
            });
          }
        }

        // Zamanına göre sırala
        plan.sort((a, b) => a.scheduledAt - b.scheduledAt);

        // Plan'ı activeWar'a yaz
        const ref = allianceDoc.ref ?? db.collection("alliances").doc(docId);
        const freshSnap = await ref.get();
        const freshWar = freshSnap.data()?.activeWar;
        if (freshWar) {
          await ref.set({ activeWar: { ...freshWar, botAttackPlan: plan } }, { merge: true });
        }
        planned++;
      }
      res.json({ success: true, planned });
    } catch (err) {
      console.error("[CreateBotAttackPlan]", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Zamanı gelen bot saldırılarını çalıştır
async function executePendingBotAttacks() {
  const alliancesSnap = await db.collection("alliances").get();
  let executed = 0;
  let resolved = 0;

  for (const allianceDoc of alliancesSnap.docs) {
    const data = allianceDoc.data();
    if (!data.activeWar) continue;
    const war = data.activeWar;
    const now = Date.now();

    // Savaş bitti mi? → otomatik çöz (ödüller, mesajlar, rapor)
    if (now >= war.endsAt) {
      try { await resolveWarForAlliance(allianceDoc); } catch (err) { console.warn('[ExecBotAttacks] resolve error:', err.message); }
      resolved++;
      continue;
    }

    const plan = war.botAttackPlan ?? [];
    if (plan.length === 0) continue;

    // Zamanı gelmiş ve henüz çalıştırılmamış saldırıları bul
    const pending = plan.filter(p => !p.executed && now >= p.scheduledAt);
    if (pending.length === 0) continue;

    // 2 saat cooldown — aynı bot son 2 saatte saldırmışsa atla
    const BOT_WAR_COOLDOWN_MS = 2 * 60 * 60 * 1000;
    const executedByBot = plan.filter(p => p.executed);
    // Cooldown'a uyan saldırıları filtrele
    const eligible = pending.filter(p => {
      const lastByThis = executedByBot.filter(e => e.botUid === p.botUid).sort((a, b) => (b.executedAt ?? 0) - (a.executedAt ?? 0))[0];
      return !lastByThis || (now - (lastByThis.executedAt ?? 0)) >= BOT_WAR_COOLDOWN_MS;
    });
    if (eligible.length === 0) continue;

    // Birden fazla eligible saldırı varsa hepsini çalıştır (farklı botlardan)
    const botsUsed = new Set();
    const attacksToRun = [];
    for (const p of eligible) {
      if (botsUsed.has(p.botUid)) continue; // Aynı bot'tan sadece 1 saldırı per run
      botsUsed.add(p.botUid);
      attacksToRun.push(p);
    }

    for (const attack of attacksToRun) {

    try {
      const botSnap = await db.collection("players").doc(attack.botUid).get();
      const targetSnap = await db.collection("players").doc(attack.targetUid).get();
      if (!botSnap.exists || !targetSnap.exists) { attack.executed = true; continue; }
      // Kendi ittifak üyesine saldırma kontrolü
      if (attack.botUid === attack.targetUid) { attack.executed = true; continue; }
      const targetAllianceId = targetSnap.data().allianceId;
      if (targetAllianceId === allianceDoc.id) { attack.executed = true; continue; }

      const botData = botSnap.data();
      const targetData = targetSnap.data();
      const travel = 180; // 3 dakika

      // Bot birimlerini oku (savunma birimleri saldırıya katılmaz)
      const AIR_DEF = new Set(['stinger','iglaS','hisarA','hisarO','ironDome','patriotPac3','siper','s500','thaad']);
      const botBaseSnap = await db.collection("playerBases").doc(attack.botUid).get();
      const botBuildings = botBaseSnap.exists ? (botBaseSnap.data().buildings ?? []) : [];
      const marchUnits = [];
      let totalUnits = 0;
      let atkPower = 0;
      for (const b of botBuildings) {
        for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
          if (count > 0 && !AIR_DEF.has(unitId)) { marchUnits.push({ unitId, count, buildingId: b.id }); totalUnits += count; atkPower += count * 10; }
        }
      }

      // Savunanın birimlerini oku (envanter + birlikler)
      const defBaseSnap = await db.collection("playerBases").doc(attack.targetUid).get();
      const defState = defBaseSnap.exists ? defBaseSnap.data() : {};
      const defBuildings = defState.buildings ?? [];
      const defBirlikler = defState.birlikler ?? [];
      const defUnitTotals = {};
      // Envanterden
      for (const b of defBuildings) {
        for (const [unitId, count] of Object.entries(b.trainedUnits ?? {})) {
          if (count > 0) defUnitTotals[unitId] = (defUnitTotals[unitId] ?? 0) + count;
        }
      }
      // Birliklerden
      for (const bl of defBirlikler) {
        for (const slot of (bl.slots ?? [])) {
          if (slot.count > 0) defUnitTotals[slot.unitId] = (defUnitTotals[slot.unitId] ?? 0) + slot.count;
        }
      }
      const defUnits = Object.entries(defUnitTotals).map(([unitId, count]) => ({ unitId, count, buildingId: '' }));
      let defPower = 0;
      for (const u of defUnits) defPower += u.count * 10;
      const totalDefUnits = defUnits.reduce((s, u) => s + u.count, 0);

      if (totalUnits === 0) { attack.executed = true; continue; }

      // March oluştur (banner için)
      const marchRef = db.collection("marches").doc();
      await marchRef.set({
        id: marchRef.id,
        attackerUid: attack.botUid,
        attackerName: attack.botName,
        defenderUid: attack.targetUid,
        defenderName: attack.targetName,
        marchUnits: marchUnits,
        attackPower: atkPower,
        committedUnits: totalUnits,
        startedAt: now,
        arrivesAt: now + travel * 1000,
        travelSeconds: travel,
        status: "marching",
      });

      // Savaş anında resolve — sleep yok (Cloud Function timeout önlemi)
      // March 10 saniye sonra silinecek (banner gösterimi için kısa süre)

      // Savaş sonucu — combat engine ile (branch-aware çapraz tablo)
      const combat = resolveServerCombat(marchUnits, defUnits);
      const won = combat.won;
      const score = won ? 0 : 10;
      const attackerResults = combat.attackerResults;
      const defenderResults = combat.defenderResults;
      const atkLossTotal = combat.totalAttackerLosses;
      const defLossTotal = combat.totalDefenderDestroyed;
      atkPower = combat.totalAttackPower;
      defPower = combat.totalDefensePower;

      // March sil
      await marchRef.delete();

      // ── Birim kayıplarını envanterden düş ──
      // Saldıran (bot) kayıpları
      const atkLossMap = {};
      for (const r of attackerResults) {
        if (r.losses > 0) atkLossMap[r.unitId] = (atkLossMap[r.unitId] ?? 0) + r.losses;
      }
      await deductUnitLosses(attack.botUid, atkLossMap);
      // Savunan kayıpları
      const defLossMap = {};
      for (const r of defenderResults) {
        if (r.destroyed > 0) defLossMap[r.unitId] = (defLossMap[r.unitId] ?? 0) + r.destroyed;
      }
      await deductUnitLosses(attack.targetUid, defLossMap);

      // ── Kaynak & güç transferi (PvP ile aynı mantık) ──
      // Bot kaynakları
      const botResources = botBaseSnap.exists ? (botBaseSnap.data().resources ?? []) : [];
      const botCash = botResources.find(r => r.key === 'cash')?.amount ?? 0;
      const botOil = botResources.find(r => r.key === 'oil')?.amount ?? 0;
      const botOre = botResources.find(r => r.key === 'ore')?.amount ?? 0;
      const botPP = botData.playerPower ?? 0;
      // Savunan kaynakları
      const defResources = defState.resources ?? [];
      const defCash = defResources.find(r => r.key === 'cash')?.amount ?? 0;
      const defOil = defResources.find(r => r.key === 'oil')?.amount ?? 0;
      const defOre = defResources.find(r => r.key === 'ore')?.amount ?? 0;
      const defPP = targetData.playerPower ?? 0;

      // Kaybeden tarafın kaynaklarının %20'si transfer edilir
      const loserCash = won ? defCash : botCash;
      const loserOil = won ? defOil : botOil;
      const loserOre = won ? defOre : botOre;
      const loserPP = won ? defPP : botPP;
      const tCash = Math.round(loserCash * 0.2);
      const tOil = Math.round(loserOil * 0.2);
      const tOre = Math.round(loserOre * 0.2);
      const tPower = Math.max(10, Math.round(loserPP * 0.2));

      // Savunanın kaynaklarını ve gücünü güncelle
      if (won) {
        // Bot kazandı → savunan kaynak & güç kaybeder
        const updatedDefRes = defResources.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.max(0, r.amount - tCash) };
          if (r.key === 'oil') return { ...r, amount: Math.max(0, r.amount - tOil) };
          if (r.key === 'ore') return { ...r, amount: Math.max(0, r.amount - tOre) };
          return r;
        });
        const newDefWarPower = Math.max(0, (defState.warPower ?? 0) - tPower);
        await db.collection("playerBases").doc(attack.targetUid).set({
          resources: updatedDefRes, warPower: newDefWarPower,
        }, { merge: true });
        // Savunanın playerPower güncelle
        await db.collection("players").doc(attack.targetUid).set({
          playerPower: Math.max(0, defPP - tPower),
        }, { merge: true });
      } else {
        // Bot kaybetti → savunan kaynak & güç kazanır
        const updatedDefRes = defResources.map(r => {
          if (r.key === 'cash') return { ...r, amount: Math.min(r.capacity ?? 10000000, r.amount + tCash) };
          if (r.key === 'oil') return { ...r, amount: Math.min(r.capacity ?? 10000000, r.amount + tOil) };
          if (r.key === 'ore') return { ...r, amount: Math.min(r.capacity ?? 10000000, r.amount + tOre) };
          return r;
        });
        const newDefWarPower = (defState.warPower ?? 0) + tPower;
        await db.collection("playerBases").doc(attack.targetUid).set({
          resources: updatedDefRes, warPower: newDefWarPower,
        }, { merge: true });
        await db.collection("players").doc(attack.targetUid).set({
          playerPower: defPP + tPower,
        }, { merge: true });
      }

      // Rapordaki kaynak/güç değerleri (savunan perspektifinden)
      const defRewardCash = won ? -tCash : tCash;
      const defRewardOil = won ? -tOil : tOil;
      const defRewardOre = won ? -tOre : tOre;
      const defPowerChange = won ? -tPower : tPower;

      // Skor güncelle
      const defAllianceId = targetData.allianceId;
      if (defAllianceId) {
        const defAllianceSnap = await db.collection("alliances").doc(defAllianceId).get();
        if (defAllianceSnap.exists && defAllianceSnap.data().activeWar) {
          const defWarData = defAllianceSnap.data().activeWar;
          await defAllianceSnap.ref.set({
            activeWar: { ...defWarData, ourScore: (defWarData.ourScore ?? 0) + score, lastAttack: { attackerName: attack.botName, defenderName: attack.targetName, won: !won, score, timestamp: Date.now() } },
          }, { merge: true });
        }
        // Savaş raporu (savunan perspektifi)
        const defenderWon = !won;
        await db.collection("alliances").doc(defAllianceId).collection("warBattleLogs").add({
          id: `bot_${Date.now()}`,
          targetId: 'defense',
          targetName: attack.targetName,
          attackerName: attack.botName,
          defenderName: attack.targetName,
          timestamp: Date.now(),
          savedAt: Date.now(),
          won: defenderWon,
          score,
          attackPower: atkPower,
          defensePower: defPower,
          unitsLost: defenderWon ? 0 : defLossTotal,
          rewardCash: defRewardCash, rewardOil: defRewardOil, rewardOre: defRewardOre, powerChange: defPowerChange,
          attackerResults,
          defenderResults,
        }).catch(() => {});
      }

      // Saldıranın ittifak skoru (bot'un ittifakı)
      const botScore = won ? 10 : 0;
      const freshWarSnap = await allianceDoc.ref.get();
      const freshWar = freshWarSnap.data()?.activeWar;
      if (freshWar) {
        await allianceDoc.ref.set({
          activeWar: { ...freshWar, ourScore: (freshWar.ourScore ?? 0) + botScore, lastAttack: { attackerName: attack.botName, defenderName: attack.targetName, won, score: botScore, timestamp: Date.now() } },
        }, { merge: true });
      }
      // Savunanın ittifakında theirScore güncelle
      if (defAllianceId) {
        const defAllianceSnap2 = await db.collection("alliances").doc(defAllianceId).get();
        if (defAllianceSnap2.exists && defAllianceSnap2.data().activeWar) {
          const dw = defAllianceSnap2.data().activeWar;
          await defAllianceSnap2.ref.set({
            activeWar: { ...dw, theirScore: (dw.theirScore ?? 0) + botScore },
          }, { merge: true });
        }
      }

      // Saldıranın ittifakına da rapor yaz
      await allianceDoc.ref.collection("warBattleLogs").add({
        id: `bot_atk_${Date.now()}`,
        targetId: attack.targetUid,
        targetName: attack.targetName,
        attackerName: attack.botName,
        defenderName: attack.targetName,
        timestamp: Date.now(),
        savedAt: Date.now(),
        won: won,
        score: botScore,
        attackPower: atkPower,
        defensePower: defPower,
        unitsLost: won ? 0 : totalUnits,
        rewardCash: won ? tCash : -tCash, rewardOil: won ? tOil : -tOil, rewardOre: won ? tOre : -tOre, powerChange: won ? tPower : -tPower,
        attackerResults,
        defenderResults,
      }).catch(() => {});

      // Push notification — savaş sonucu (plan bazlı bot saldırısı)
      const botName = botData.displayName ?? "Bot";
      if (won) {
        await sendPushNotification(attack.targetUid, "💀 Üssün saldırıya uğradı!", `${botName} saldırdı — kaynak ve birim kaybettin.`, "battleResults");
      } else {
        await sendPushNotification(attack.targetUid, "🏆 Savunma başarılı!", `${botName} saldırdı ama yenildi! Ganimet kazandın.`, "battleResults");
      }

      executed++;
    } catch (err) {
      console.warn(`[BotAttackPlan] Error executing attack:`, err.message);
    }

    // Plan'daki saldırıyı executed olarak işaretle
    attack.executed = true;
    const latestSnap = await allianceDoc.ref.get();
    const latestWar = latestSnap.data()?.activeWar;
    if (latestWar) {
      const updatedPlan = (latestWar.botAttackPlan ?? []).map(p =>
        p.botUid === attack.botUid && p.targetUid === attack.targetUid && p.scheduledAt === attack.scheduledAt
          ? { ...p, executed: true, executedAt: Date.now() }
          : p
      );
      await allianceDoc.ref.set({ activeWar: { ...latestWar, botAttackPlan: updatedPlan } }, { merge: true });
    }
    } // end attacksToRun loop
  } // end alliance loop
  return { executed, resolved };
}

// Her 30 dakikada zamanı gelen saldırıları çalıştır
exports.simulateAllianceWarsScheduled = onSchedule(
  { schedule: "every 30 minutes", region: "us-central1", timeoutSeconds: 300 },
  async () => {
    const result = await executePendingBotAttacks();
    console.log("[AllianceWarSim]", result);
  }
);

// Manuel tetikleme
exports.simulateAllianceWars = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  async (req, res) => {
    const result = await executePendingBotAttacks();
    res.json({ success: true, ...result });
  }
);

// ── Bot ittifakları arası savaş otomasyonu (72 saatte 1) ────
async function startBotAllianceWar() {
  const alliancesSnap = await db.collection("alliances").get();
  const botAlliances = [];
  const realAlliances = new Set();

  for (const doc of alliancesSnap.docs) {
    const data = doc.data();
    // Bot ittifaklarını bul (en az 1 bot üye olan ve gerçek oyuncu olmayan)
    const membersSnap = await doc.ref.collection("members").get();
    let hasReal = false;
    let hasBot = false;
    for (const m of membersSnap.docs) {
      const pSnap = await db.collection("players").doc(m.id).get();
      if (pSnap.exists && pSnap.data().isBot) hasBot = true;
      else hasReal = true;
    }
    if (hasReal) { realAlliances.add(doc.id); continue; }
    if (!hasBot) continue;
    botAlliances.push({
      id: doc.id,
      name: data.name,
      tag: data.tag,
      hasActiveWar: !!data.activeWar,
      lastWarEnded: data.lastWarEnded ?? 0,
      memberCount: membersSnap.size,
    });
  }

  // Savaşta olmayan ve son savaşından 72 saat geçmiş bot ittifaklarını filtrele
  const now = Date.now();
  const cooldown = 72 * 60 * 60 * 1000; // 72 saat
  const available = botAlliances.filter(a => !a.hasActiveWar && (now - a.lastWarEnded) >= cooldown && a.memberCount >= 2);
  if (available.length < 2) return { started: 0, reason: "Yeterli uygun bot ittifak yok" };

  // Rastgele 2 ittifak seç
  const shuffled = available.sort(() => Math.random() - 0.5);
  const a1 = shuffled[0];
  const a2 = shuffled[1];

  // Savaş başlat (24 saat)
  const warDuration = 24 * 60 * 60 * 1000;
  const warData = {
    enemyAllianceId: null, enemyName: null, enemyTag: null,
    startedAt: now, endsAt: now + warDuration,
    ourScore: 0, theirScore: 0, lastAttack: null, botAttackPlan: null,
  };

  // İttifak 1
  await db.collection("alliances").doc(a1.id).set({
    activeWar: { ...warData, enemyAllianceId: a2.id, enemyName: a2.name, enemyTag: a2.tag },
  }, { merge: true });

  // İttifak 2
  await db.collection("alliances").doc(a2.id).set({
    activeWar: { ...warData, enemyAllianceId: a1.id, enemyName: a1.name, enemyTag: a1.tag },
  }, { merge: true });

  // Bot saldırı planları oluştur (her iki taraf için)
  const planUrl = "https://createbotattackplan-azlw7h3x7q-uc.a.run.app";
  await Promise.all([
    fetch(planUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allianceId: a1.id, force: true }) }).catch(() => {}),
    fetch(planUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allianceId: a2.id, force: true }) }).catch(() => {}),
  ]);

  // Sistem mesajı gönder
  const warMsg1 = `⚔️ İttifak savaşı başladı!\n${a1.name} [${a1.tag}] vs ${a2.name} [${a2.tag}]\nSüre: 24 saat`;
  await db.collection("alliances").doc(a1.id).collection("messages").add({ senderUid: "system", senderName: "Sistem", text: warMsg1, timestamp: now, type: "system" }).catch(() => {});
  await db.collection("alliances").doc(a2.id).collection("messages").add({ senderUid: "system", senderName: "Sistem", text: warMsg1, timestamp: now, type: "system" }).catch(() => {});

  console.log(`[BotWar] Savaş başlatıldı: ${a1.name} vs ${a2.name}`);
  return { started: 1, war: `${a1.name} [${a1.tag}] vs ${a2.name} [${a2.tag}]` };
}

// 72 saatte 1 — bot ittifakları arası savaş
exports.startBotAllianceWarScheduled = onSchedule(
  { schedule: "every 72 hours", region: "us-central1", timeoutSeconds: 120 },
  async () => {
    // Önce biten savaşları sonuçlandır
    try {
      await fetch("https://resolvealliancewar-azlw7h3x7q-uc.a.run.app", { method: "POST" }).catch(() => {});
    } catch {}
    const result = await startBotAllianceWar();
    console.log("[BotAllianceWar]", result);
  }
);

// Manuel tetikleme
exports.startBotAllianceWar = onRequest(
  { region: "us-central1", timeoutSeconds: 120 },
  async (req, res) => {
    const result = await startBotAllianceWar();
    res.json({ success: true, ...result });
  }
);

// ── Bot Genel Sohbet Simülasyonu ─────────────────────────────
async function runBotChat() {
  // Rastgele bir bot seç
  const botsSnap = await db.collection("players")
    .where("isBot", "==", true)
    .limit(50)
    .get();
  if (botsSnap.empty) return { sent: 0 };

  const bots = botsSnap.docs.map(d => ({
    uid: d.id,
    name: d.data().displayName ?? "Bot",
    hqLevel: d.data().hqLevel ?? 10,
    allianceTag: null,
  }));

  // Bot ittifak tag'lerini al
  for (const bot of bots) {
    const pData = botsSnap.docs.find(d => d.id === bot.uid)?.data();
    if (pData?.allianceId) {
      try {
        const aSnap = await db.collection("alliances").doc(pData.allianceId).get();
        if (aSnap.exists) bot.allianceTag = aSnap.data().tag ?? null;
      } catch {}
    }
  }

  // Son mesajları oku (tekrar kontrolü için 75)
  const recentSnap = await db.collection("globalChat")
    .orderBy("timestamp", "desc")
    .limit(75)
    .get();

  const recentMsgs = [];
  recentSnap.forEach(d => recentMsgs.push(d.data()));
  recentMsgs.reverse();
  const recentTexts = new Set(recentMsgs.map(m => (m.text ?? '').toLowerCase()));

  const now = Date.now();
  let sent = 0;
  const botUidSet = new Set(bots.map(b => b.uid));

  const lastMsg = recentMsgs.length > 0 ? recentMsgs[recentMsgs.length - 1] : null;
  const lastSenderUid = lastMsg?.senderUid ?? '';
  const lastIsFromRealUser = lastMsg && !botUidSet.has(lastSenderUid);
  const lastIsFromBot = lastMsg && botUidSet.has(lastSenderUid);
  const lastIsQuestion = lastMsg && (
    lastMsg.text?.includes('?') ||
    lastMsg.text?.includes(' mı') ||
    lastMsg.text?.includes(' mi') ||
    lastMsg.text?.includes(' mu') ||
    lastMsg.text?.includes(' mü') ||
    lastMsg.isQuestion === true
  );

  // ── ÖNCELİK 1: Gerçek kullanıcı mesajına akıllı cevap ver ──
  if (lastIsFromRealUser && (now - (lastMsg?.timestamp ?? 0)) < 15 * 60 * 1000) {
    const smartReply = generateSmartReply(lastMsg.text, recentTexts);
    if (smartReply) {
      // Türkçe soruya Türkçe isimli bot cevap versin
      const { isTurkishBotName } = require("./botChat");
      const isTrQuestion = /[çğıöşüÇĞİÖŞÜ]/.test(lastMsg.text ?? '') || /\b(mı|mi|mu|mü|ne|nasıl|hangisi|var|yok|bilen|sizce|beyler)\b/i.test(lastMsg.text ?? '');
      let candidates = bots;
      if (isTrQuestion) {
        const trBots = bots.filter(b => isTurkishBotName(b.name));
        if (trBots.length > 0) candidates = trBots;
      }
      const bot = candidates[Math.floor(Math.random() * candidates.length)];
      await db.collection("globalChat").add({
        senderUid: bot.uid,
        senderName: bot.name,
        allianceTag: bot.allianceTag,
        text: smartReply,
        isQuestion: false,
        timestamp: now,
      });
      sent++;
    }
  }
  // ── ÖNCELİK 2: Bot sorusuna başka bot cevap versin ──
  else if (lastIsFromBot && lastIsQuestion && (now - (lastMsg?.timestamp ?? 0)) < 10 * 60 * 1000) {
    const responder = bots.filter(b => b.uid !== lastSenderUid);
    if (responder.length > 0) {
      const bot = responder[Math.floor(Math.random() * responder.length)];
      const msg = generateMessage('answer', bot.hqLevel, bot.name, recentTexts);
      await db.collection("globalChat").add({
        senderUid: bot.uid,
        senderName: bot.name,
        allianceTag: bot.allianceTag,
        text: msg.text,
        isQuestion: false,
        timestamp: now,
      });
      sent++;

      // Soruyu soran bot kısa teşekkür tepkisi versin (sadece soran bot, başkası değil)
      const originalAsker = bots.find(b => b.uid === lastSenderUid);
      if (originalAsker) {
        const reply = generateMessage('reply', originalAsker.hqLevel, originalAsker.name, recentTexts);
        await db.collection("globalChat").add({
          senderUid: originalAsker.uid,
          senderName: originalAsker.name,
          allianceTag: originalAsker.allianceTag,
          text: reply.text,
          isQuestion: false,
          timestamp: now + 2000 + Math.floor(Math.random() * 5000),
        });
        sent++;
      }
    }
  }
  // ── ÖNCELİK 3: Yeni mesaj at ──
  else {
    // Yeni mesaj at (soru, yorum, veya ittifak arama)
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const roll = Math.random();
    let type;
    if (roll < 0.4) type = 'question';        // %40 soru
    else if (roll < 0.75) type = 'comment';    // %35 yorum
    else if (roll < 0.9) type = 'alliance';    // %15 ittifak arama
    else type = 'comment';                     // %10 yorum

    // Son mesajı kendisi attıysa farklı bot seç
    let sender = bot;
    if (sender.uid === lastSenderUid) {
      const others = bots.filter(b => b.uid !== lastSenderUid);
      if (others.length > 0) sender = others[Math.floor(Math.random() * others.length)];
    }

    const msg = generateMessage(type, sender.hqLevel, sender.name, recentTexts);
    await db.collection("globalChat").add({
      senderUid: sender.uid,
      senderName: sender.name,
      allianceTag: sender.allianceTag,
      text: msg.text,
      isQuestion: msg.isQuestion,
      timestamp: now,
    });
    sent++;
  }

  // Eski mesajları temizle (100'den fazlaysa)
  const totalSnap = await db.collection("globalChat").orderBy("timestamp", "asc").get();
  if (totalSnap.size > 150) {
    const toDelete = totalSnap.size - 100;
    let deleted = 0;
    for (const doc of totalSnap.docs) {
      if (deleted >= toDelete) break;
      await doc.ref.delete();
      deleted++;
    }
  }

  return { sent };
}

// 5 dakikada bir bot sohbet
exports.simulateBotChatScheduled = onSchedule(
  { schedule: "every 15 minutes", region: "us-central1", timeoutSeconds: 30 },
  async () => {
    const result = await runBotChat();
    console.log("[BotChat]", result);
  }
);

// Manuel tetikleme
exports.simulateBotChat = onRequest(
  { region: "us-central1", timeoutSeconds: 30 },
  async (req, res) => {
    const result = await runBotChat();
    res.json({ success: true, ...result });
  }
);
