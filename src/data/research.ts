import type { ResearchNode } from '../state/types';

// Her tamamlanan araştırma düğümü, ilgili dalın saldırı gücüne +%12 ekler.
// Toplam bonus: tamamlanan düğüm sayısı × 0.12 (ör. 3 düğüm = +%36).
// Her dal: T1×2 → T2×2 → T3×2 → T4×1 (kapstone) = 7 araştırma × 4 dal = 28

export const RESEARCH_NODES: ResearchNode[] = [
  // ═══════════════════════════════════════════════════════════════
  // ── KARA KUVVETLERİ (7) ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  // ── Kara T1 ─────────────────────────────────────────────────
  {
    id: 'land_t1_tactics',
    branch: 'land',
    tier: 1,
    label: 'Piyade Taktikleri',
    description: 'Gelişmiş muharebe taktikleri. Tüm kara birimi saldırısına +%12.',
    unlocks: [],
    requires: [],
    costCash: 500,
    costOil: 0,
    costOre: 100,
    researchSeconds: 60,
  },
  {
    id: 'land_t1_armor',
    branch: 'land',
    tier: 1,
    label: 'Reaktif Zırh',
    description: 'Modüler patlayıcı reaktif zırh. Kara birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 600,
    costOil: 200,
    costOre: 150,
    researchSeconds: 90,
  },

  // ── Kara T2 ─────────────────────────────────────────────────
  {
    id: 'land_t2_precision',
    branch: 'land',
    tier: 2,
    label: 'Hassas Atış Sistemleri',
    description: 'Lazer güdümlü mühimmat. Kara birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['land_t1_tactics'],
    costCash: 1000,
    costOil: 0,
    costOre: 200,
    researchSeconds: 180,
  },
  {
    id: 'land_t2_logistics',
    branch: 'land',
    tier: 2,
    label: 'Lojistik Optimizasyon',
    description: 'Saha ikmal hızlandırması. Kara birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['land_t1_armor'],
    costCash: 1500,
    costOil: 500,
    costOre: 400,
    researchSeconds: 300,
  },

  // ── Kara T3 ─────────────────────────────────────────────────
  {
    id: 'land_t3_networkwar',
    branch: 'land',
    tier: 3,
    label: 'Ağ Merkezli Harp',
    description: 'C4ISR entegrasyonu. Kara birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['land_t2_precision'],
    costCash: 3000,
    costOil: 500,
    costOre: 600,
    researchSeconds: 600,
  },
  {
    id: 'land_t3_artillery',
    branch: 'land',
    tier: 3,
    label: 'Uzun Menzilli Topçu',
    description: 'MLRS ve hassas balistik. Kara birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['land_t2_logistics'],
    costCash: 4000,
    costOil: 1200,
    costOre: 1000,
    researchSeconds: 900,
  },

  // ── Kara T4 (Kapstone) ─────────────────────────────────────
  {
    id: 'land_t4_combined',
    branch: 'land',
    tier: 4,
    label: 'Müşterek Kara Harekâtı',
    description: 'Tüm kara unsurlarının tam entegrasyonu. Kara birimlerine +%15 saldırı.',
    unlocks: [],
    requires: ['land_t3_networkwar', 'land_t3_artillery'],
    costCash: 8000,
    costOil: 2500,
    costOre: 2000,
    researchSeconds: 1800,
  },

  // ═══════════════════════════════════════════════════════════════
  // ── HAVA KUVVETLERİ (7) ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  // ── Hava T1 ─────────────────────────────────────────────────
  {
    id: 'air_t1_avionics',
    branch: 'air',
    tier: 1,
    label: 'Gelişmiş Aviyonik',
    description: 'AESA radar ve dijital kokpit. Hava birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 1000,
    costOil: 400,
    costOre: 100,
    researchSeconds: 120,
  },
  {
    id: 'air_t1_engines',
    branch: 'air',
    tier: 1,
    label: 'Turbofan Motor Teknolojisi',
    description: 'Yüksek verimli jet motorları. Hava birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 1200,
    costOil: 500,
    costOre: 150,
    researchSeconds: 120,
  },

  // ── Hava T2 ─────────────────────────────────────────────────
  {
    id: 'air_t2_bvr',
    branch: 'air',
    tier: 2,
    label: 'BVR Muharebe',
    description: 'Görüş ötesi hava-hava füzeleri. Hava birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['air_t1_avionics'],
    costCash: 2500,
    costOil: 900,
    costOre: 200,
    researchSeconds: 360,
  },
  {
    id: 'air_t2_precision_bombing',
    branch: 'air',
    tier: 2,
    label: 'Hassas Bombardıman',
    description: 'GPS/INS güdümlü bomba teknolojisi. Hava birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['air_t1_engines'],
    costCash: 2800,
    costOil: 1000,
    costOre: 300,
    researchSeconds: 400,
  },

  // ── Hava T3 ─────────────────────────────────────────────────
  {
    id: 'air_t3_stealth',
    branch: 'air',
    tier: 3,
    label: 'Stealth Kaplama',
    description: 'LO radar kesit alanı azaltma. Hava birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['air_t2_bvr'],
    costCash: 5000,
    costOil: 2000,
    costOre: 500,
    researchSeconds: 900,
  },
  {
    id: 'air_t3_drone_swarm',
    branch: 'air',
    tier: 3,
    label: 'İHA Sürü Teknolojisi',
    description: 'Otonom drone koordinasyonu. Hava birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['air_t2_precision_bombing'],
    costCash: 5500,
    costOil: 1800,
    costOre: 800,
    researchSeconds: 1000,
  },

  // ── Hava T4 (Kapstone) ─────────────────────────────────────
  {
    id: 'air_t4_supremacy',
    branch: 'air',
    tier: 4,
    label: 'Hava Üstünlüğü Doktrini',
    description: 'Tam hava hâkimiyeti doktrini. Hava birimlerine +%15 saldırı.',
    unlocks: [],
    requires: ['air_t3_stealth', 'air_t3_drone_swarm'],
    costCash: 10000,
    costOil: 4000,
    costOre: 1500,
    researchSeconds: 2100,
  },

  // ═══════════════════════════════════════════════════════════════
  // ── DENİZ KUVVETLERİ (7) ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  // ── Deniz T1 ────────────────────────────────────────────────
  {
    id: 'naval_t1_sonar',
    branch: 'naval',
    tier: 1,
    label: 'Aktif Sonar',
    description: 'Sualtı hedef tespiti. Deniz birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 800,
    costOil: 300,
    costOre: 200,
    researchSeconds: 120,
  },
  {
    id: 'naval_t1_hull',
    branch: 'naval',
    tier: 1,
    label: 'Kompozit Gövde Zırhı',
    description: 'Hafif ama dayanıklı gemi zırhı. Deniz birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 900,
    costOil: 350,
    costOre: 250,
    researchSeconds: 140,
  },

  // ── Deniz T2 ────────────────────────────────────────────────
  {
    id: 'naval_t2_missile',
    branch: 'naval',
    tier: 2,
    label: 'Denizden Karaya Füze',
    description: 'Seyir füzesi salvo sistemi. Deniz birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['naval_t1_sonar'],
    costCash: 2000,
    costOil: 800,
    costOre: 500,
    researchSeconds: 480,
  },
  {
    id: 'naval_t2_ciws',
    branch: 'naval',
    tier: 2,
    label: 'CIWS Yakın Savunma',
    description: 'Otomatik yakın hava savunma sistemi. Deniz birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['naval_t1_hull'],
    costCash: 2200,
    costOil: 700,
    costOre: 600,
    researchSeconds: 500,
  },

  // ── Deniz T3 ────────────────────────────────────────────────
  {
    id: 'naval_t3_nuclear',
    branch: 'naval',
    tier: 3,
    label: 'Nükleer Tahrik',
    description: 'Sınırsız menzil ve sualtı dayanıklılığı. Deniz birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['naval_t2_missile'],
    costCash: 6000,
    costOil: 2500,
    costOre: 1000,
    researchSeconds: 1200,
  },
  {
    id: 'naval_t3_aegis',
    branch: 'naval',
    tier: 3,
    label: 'Aegis Muharebe Sistemi',
    description: 'Entegre hava savunma ve komuta sistemi. Deniz birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['naval_t2_ciws'],
    costCash: 6500,
    costOil: 2200,
    costOre: 1200,
    researchSeconds: 1300,
  },

  // ── Deniz T4 (Kapstone) ────────────────────────────────────
  {
    id: 'naval_t4_bluewater',
    branch: 'naval',
    tier: 4,
    label: 'Açık Deniz Hâkimiyeti',
    description: 'Okyanus çapında güç projeksiyonu. Deniz birimlerine +%15 saldırı.',
    unlocks: [],
    requires: ['naval_t3_nuclear', 'naval_t3_aegis'],
    costCash: 12000,
    costOil: 5000,
    costOre: 2500,
    researchSeconds: 2400,
  },

  // ═══════════════════════════════════════════════════════════════
  // ── SAVUNMA (7) ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  // ── Savunma T1 ──────────────────────────────────────────────
  {
    id: 'defense_t1_radar',
    branch: 'defense',
    tier: 1,
    label: 'Erken Uyarı Radarı',
    description: 'Düşman tespitini hızlandırır. Savunma birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 700,
    costOil: 200,
    costOre: 300,
    researchSeconds: 120,
  },
  {
    id: 'defense_t1_fortification',
    branch: 'defense',
    tier: 1,
    label: 'Gelişmiş Tahkimat',
    description: 'Güçlendirilmiş sığınak ve mevzi. Savunma birimlerine +%12 saldırı.',
    unlocks: [],
    requires: [],
    costCash: 600,
    costOil: 150,
    costOre: 350,
    researchSeconds: 100,
  },

  // ── Savunma T2 ──────────────────────────────────────────────
  {
    id: 'defense_t2_ecm',
    branch: 'defense',
    tier: 2,
    label: 'Elektronik Karıştırma',
    description: 'Düşman güdümlü mühimmatını şaşırtır. Savunma birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['defense_t1_radar'],
    costCash: 2000,
    costOil: 600,
    costOre: 800,
    researchSeconds: 400,
  },
  {
    id: 'defense_t2_sam',
    branch: 'defense',
    tier: 2,
    label: 'SAM Bataryası Teknolojisi',
    description: 'Çok katmanlı hava savunma füzesi. Savunma birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['defense_t1_fortification'],
    costCash: 2200,
    costOil: 700,
    costOre: 900,
    researchSeconds: 450,
  },

  // ── Savunma T3 ──────────────────────────────────────────────
  {
    id: 'defense_t3_iron_dome',
    branch: 'defense',
    tier: 3,
    label: 'Demir Kubbe Sistemi',
    description: 'Kısa menzilli roket/mermi önleme. Savunma birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['defense_t2_ecm'],
    costCash: 5000,
    costOil: 1800,
    costOre: 1500,
    researchSeconds: 1000,
  },
  {
    id: 'defense_t3_cyber',
    branch: 'defense',
    tier: 3,
    label: 'Siber Savunma Operasyonları',
    description: 'Düşman komuta ağını felç eder. Savunma birimlerine +%12 saldırı.',
    unlocks: [],
    requires: ['defense_t2_sam'],
    costCash: 4500,
    costOil: 1500,
    costOre: 1200,
    researchSeconds: 1100,
  },

  // ── Savunma T4 (Kapstone) ──────────────────────────────────
  {
    id: 'defense_t4_shield',
    branch: 'defense',
    tier: 4,
    label: 'Entegre Kalkan Doktrini',
    description: 'Tüm savunma sistemlerinin tek komuta altında birleşmesi. Savunma birimlerine +%15 saldırı.',
    unlocks: [],
    requires: ['defense_t3_iron_dome', 'defense_t3_cyber'],
    costCash: 9000,
    costOil: 3500,
    costOre: 3000,
    researchSeconds: 2200,
  },
];

export const RESEARCH_MAP: Record<string, ResearchNode> = Object.fromEntries(
  RESEARCH_NODES.map(n => [n.id, n]),
);
