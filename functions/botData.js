/**
 * 30 Bot Oyuncu Profili — War Nexus
 * Gerçekçi isimler, HQ seviyesine uygun binalar/birimler
 */

const ALL_BUILDING_IDS = [
  'hq', 'barracks', 'tankFactory', 'airport', 'shipyard',
  'oilField', 'mine', 'bank', 'researchLab', 'defenseTower', 'radar', 'houses',
];

const MAX_LEVELS = {
  hq: 20, barracks: 15, tankFactory: 15, airport: 15, shipyard: 15,
  oilField: 20, mine: 20, bank: 20, researchLab: 10, defenseTower: 10, radar: 10, houses: 20,
};

const UNIT_CAP_TABLE = {
  1: 50, 2: 50, 3: 100, 4: 100, 5: 200, 6: 200,
  7: 350, 8: 350, 9: 500, 10: 500, 11: 700, 12: 700,
  13: 900, 14: 900, 15: 1100, 16: 1100, 17: 1300, 18: 1300,
  19: 1500, 20: 1500,
};

// Birimler — requiredBuildingId + minBuildingLevel
const UNITS_BY_BUILDING = {
  barracks: [
    { id: 'rifleman', min: 1, tier: 1 },
    { id: 'machineGunner', min: 1, tier: 1 },
    { id: 'antiTankOp', min: 3, tier: 2 },
    { id: 'manpadsOp', min: 5, tier: 2 },
    { id: 'sniper', min: 3, tier: 2 },
    { id: 'combatEngineer', min: 5, tier: 2 },
    { id: 'paradropper', min: 10, tier: 3 },
    { id: 'frogman', min: 8, tier: 3 },
    { id: 'droneOp', min: 8, tier: 3 },
    { id: 'specOps', min: 12, tier: 3 },
  ],
  tankFactory: [
    { id: 'kirpi', min: 1, tier: 1 },
    { id: 'cobra2', min: 1, tier: 1 },
    { id: 'kaplanIfv', min: 3, tier: 2 },
    { id: 'bradley', min: 3, tier: 2 },
    { id: 'puma', min: 5, tier: 2 },
    { id: 'leopard2a7', min: 8, tier: 3 },
    { id: 'm1a2sep3', min: 8, tier: 3 },
    { id: 't90m', min: 8, tier: 3 },
    { id: 'k2panther', min: 10, tier: 3 },
    { id: 'altay', min: 10, tier: 3 },
    { id: 't14armata', min: 12, tier: 3 },
    { id: 'merkava4', min: 12, tier: 3 },
    { id: 'firtina', min: 10, tier: 3 },
    { id: 'himars', min: 12, tier: 3 },
    { id: 'kasirga', min: 10, tier: 3 },
  ],
  airport: [
    { id: 'tb2', min: 1, tier: 1 },
    { id: 'mq9reaper', min: 1, tier: 1 },
    { id: 'akinci', min: 3, tier: 2 },
    { id: 'harop', min: 5, tier: 2 },
    { id: 'switchblade600', min: 5, tier: 2 },
    { id: 'uh60m', min: 1, tier: 1 },
    { id: 'ah1z', min: 3, tier: 2 },
    { id: 'ah64e', min: 5, tier: 2 },
    { id: 't129atak', min: 5, tier: 2 },
    { id: 'f16v', min: 5, tier: 2 },
    { id: 'f35a', min: 10, tier: 3 },
    { id: 'f22raptor', min: 12, tier: 3 },
    { id: 'kaan', min: 10, tier: 3 },
    { id: 'b2spirit', min: 12, tier: 3 },
    { id: 'b21raider', min: 14, tier: 3 },
  ],
  shipyard: [
    { id: 'heybeliada', min: 1, tier: 1 },
    { id: 'milgem', min: 1, tier: 1 },
    { id: 'tf2000', min: 5, tier: 2 },
    { id: 'f125', min: 5, tier: 2 },
    { id: 'constellation', min: 5, tier: 2 },
    { id: 'type212a', min: 8, tier: 2 },
    { id: 'arleighburke', min: 10, tier: 3 },
    { id: 'type055', min: 10, tier: 3 },
    { id: 'zumwalt', min: 12, tier: 3 },
    { id: 'virginiaclass', min: 12, tier: 3 },
    { id: 'qecarrier', min: 14, tier: 3 },
    { id: 'fordcarrier', min: 14, tier: 3 },
  ],
  defenseTower: [
    { id: 'stinger', min: 1, tier: 1 },
    { id: 'iglaS', min: 1, tier: 1 },
    { id: 'hisarA', min: 3, tier: 2 },
    { id: 'hisarO', min: 3, tier: 2 },
    { id: 'ironDome', min: 5, tier: 2 },
    { id: 'patriotPac3', min: 5, tier: 2 },
    { id: 'siper', min: 8, tier: 3 },
    { id: 's500', min: 8, tier: 3 },
    { id: 'thaad', min: 10, tier: 3 },
  ],
};

function makeResources(hqLevel) {
  const mult = hqLevel;
  return [
    { key: 'cash', label: 'Nakit', amount: Math.round(1500 * mult + Math.random() * 3000 * mult), capacity: 10000000, productionPerHour: 400, icon: '💵' },
    { key: 'oil', label: 'Petrol', amount: Math.round(800 * mult + Math.random() * 1500 * mult), capacity: 10000000, productionPerHour: 200, icon: '🛢️' },
    { key: 'ore', label: 'Cevher', amount: Math.round(500 * mult + Math.random() * 1200 * mult), capacity: 10000000, productionPerHour: 150, icon: '⛏️' },
    { key: 'gold', label: 'Altın', amount: Math.round(5 + Math.random() * 20), capacity: 1000000, productionPerHour: 0, icon: '🪙' },
  ];
}

function makeBuildings(hqLevel) {
  return ALL_BUILDING_IDS.map(id => {
    const maxLv = MAX_LEVELS[id] ?? 20;
    let level;
    if (id === 'hq') {
      level = hqLevel;
    } else if (['barracks', 'tankFactory', 'airport', 'shipyard', 'defenseTower'].includes(id)) {
      level = Math.max(1, Math.min(maxLv, hqLevel - Math.floor(Math.random() * 3)));
    } else {
      level = Math.max(1, Math.min(maxLv, hqLevel - Math.floor(Math.random() * 2)));
    }

    // Birim ekle — bina bazlı kapasite limitine uygun
    const cap = UNIT_CAP_TABLE[Math.min(hqLevel, 20)] ?? 50;
    const trainedUnits = {};
    const unitsForBuilding = UNITS_BY_BUILDING[id] ?? [];
    const available = unitsForBuilding.filter(u => level >= u.min);
    if (available.length > 0) {
      let remaining = Math.floor(cap * (0.3 + Math.random() * 0.5)); // cap'in %30-80'i kadar
      for (const u of available) {
        if (remaining <= 0) break;
        const share = Math.floor(remaining / available.length * (0.5 + Math.random()));
        const count = Math.min(share, remaining);
        if (count > 0) trainedUnits[u.id] = count;
        remaining -= count;
      }
    }

    return {
      id,
      level,
      isUpgrading: false,
      upgradeSecondsRemaining: 0,
      activeResearchNodeId: null,
      researchSecondsRemaining: 0,
      trainedUnits,
      trainingQueue: [],
    };
  });
}

function makeResearchStates(hqLevel) {
  // 4 dal, her dal T1-T4 (7 araştırma)
  const branches = ['land', 'air', 'naval', 'defense'];
  const states = [];
  for (const branch of branches) {
    for (let tier = 1; tier <= 4; tier++) {
      const tiers = tier === 1 ? 2 : tier === 2 ? 2 : tier === 3 ? 2 : 1;
      for (let i = 0; i < tiers; i++) {
        const nodeId = `${branch}_t${tier}_${i}`;
        // HQ seviyesine göre tamamlanma ihtimali
        const threshold = tier === 1 ? 2 : tier === 2 ? 5 : tier === 3 ? 9 : 13;
        const completed = hqLevel >= threshold + Math.floor(Math.random() * 3);
        states.push({
          nodeId,
          completed,
          inProgress: false,
          secondsRemaining: 0,
        });
      }
    }
  }
  return states;
}

const BOT_PROFILES = [
  // HQ 1-2 (5 bot)
  { name: 'Acemi_Komutan', hq: 1, coord: '1.2.3' },
  { name: 'Asker_Can', hq: 1, coord: '1.4.7' },
  { name: 'Rookie_TR', hq: 2, coord: '2.1.5' },
  { name: 'NovicePlayer', hq: 2, coord: '2.3.8' },
  { name: 'Caylak34', hq: 2, coord: '1.6.2' },

  // HQ 3-5 (10 bot)
  { name: 'Kurthan', hq: 3, coord: '3.1.4' },
  { name: 'DarkWolf', hq: 3, coord: '3.5.9' },
  { name: 'FırtınaGücü', hq: 4, coord: '4.2.6' },
  { name: 'IronFist88', hq: 4, coord: '4.7.1' },
  { name: 'Bozkurt_61', hq: 4, coord: '3.8.5' },
  { name: 'StormRider', hq: 5, coord: '5.3.2' },
  { name: 'CesurAslan', hq: 5, coord: '5.6.8' },
  { name: 'Phoenix_X', hq: 5, coord: '4.9.3' },
  { name: 'KomutanEmre', hq: 5, coord: '5.1.7' },
  { name: 'Shadow_VII', hq: 3, coord: '3.4.6' },

  // HQ 6-8 (8 bot)
  { name: 'Yıldırım42', hq: 6, coord: '6.2.4' },
  { name: 'NightHawk', hq: 6, coord: '6.5.1' },
  { name: 'AnadoluKartalı', hq: 7, coord: '7.3.8' },
  { name: 'WarMachine01', hq: 7, coord: '7.6.2' },
  { name: 'ThunderBolt', hq: 7, coord: '6.8.5' },
  { name: 'Reis_34', hq: 8, coord: '8.1.7' },
  { name: 'DragonSlyr', hq: 8, coord: '8.4.3' },
  { name: 'GhostRecon', hq: 8, coord: '7.9.6' },

  // HQ 9-11 (4 bot)
  { name: 'Alparslan99', hq: 9, coord: '9.2.5' },
  { name: 'WarlordTR', hq: 10, coord: '9.7.1' },
  { name: 'SteelViper', hq: 10, coord: '8.6.4' },
  { name: 'OsmanlıTorunu', hq: 11, coord: '9.5.8' },

  // HQ 12-14 (3 bot)
  { name: 'FatihSultan', hq: 12, coord: '9.8.2' },
  { name: 'Conqueror_X', hq: 13, coord: '9.9.6' },
  { name: 'KaraKuvvet', hq: 14, coord: '9.3.9' },

  // ═══ 100 YENİ BOT ═══
  // HQ 1-2 (15 bot)
  { name: 'Çaylak_Mehmet', hq: 1, coord: '2.3.7' },
  { name: 'NewbieKing', hq: 1, coord: '4.1.8' },
  { name: 'Taze_Kan', hq: 1, coord: '6.5.2' },
  { name: 'RookieStar', hq: 1, coord: '1.7.4' },
  { name: 'Acemi_Pilot', hq: 2, coord: '3.9.1' },
  { name: 'FreshWar', hq: 2, coord: '8.2.6' },
  { name: 'Yeni_Savaşçı', hq: 1, coord: '5.4.3' },
  { name: 'Başlangıç07', hq: 2, coord: '7.6.9' },
  { name: 'GreenHorn_TR', hq: 1, coord: '9.1.5' },
  { name: 'Deneme34', hq: 2, coord: '2.8.4' },
  { name: 'BabyCommander', hq: 2, coord: '4.3.1' },
  { name: 'İlkAdım', hq: 1, coord: '6.9.7' },
  { name: 'RawRecruit', hq: 2, coord: '1.5.8' },
  { name: 'Torik_Can', hq: 1, coord: '8.7.3' },
  { name: 'NovaSpark', hq: 2, coord: '3.2.6' },

  // HQ 3-5 (30 bot)
  { name: 'KurtAvcı', hq: 3, coord: '5.8.1' },
  { name: 'SilverBlade', hq: 3, coord: '7.4.9' },
  { name: 'Pençe_06', hq: 3, coord: '9.3.2' },
  { name: 'HunterMoon', hq: 4, coord: '1.6.5' },
  { name: 'Gölge_Reis', hq: 4, coord: '4.9.7' },
  { name: 'VortexStrike', hq: 3, coord: '2.1.4' },
  { name: 'Kaplan_TR', hq: 5, coord: '6.7.8' },
  { name: 'IronWolf23', hq: 5, coord: '8.5.3' },
  { name: 'Çelik_Yumruk', hq: 4, coord: '3.8.6' },
  { name: 'BlazeRunner', hq: 3, coord: '5.2.9' },
  { name: 'Kartal_55', hq: 5, coord: '7.1.4' },
  { name: 'NightStorm', hq: 4, coord: '9.6.1' },
  { name: 'YılmazHan', hq: 3, coord: '1.4.7' },
  { name: 'CrimsonAxe', hq: 5, coord: '4.7.2' },
  { name: 'SavaşÇı_61', hq: 4, coord: '6.3.5' },
  { name: 'TitanForce', hq: 3, coord: '8.9.8' },
  { name: 'Doruk_Bay', hq: 5, coord: '2.5.1' },
  { name: 'WraithX', hq: 4, coord: '3.6.4' },
  { name: 'OkçuBerk', hq: 3, coord: '5.1.6' },
  { name: 'StealthOps', hq: 5, coord: '7.8.3' },
  { name: 'Çakır_Efe', hq: 4, coord: '9.2.7' },
  { name: 'MaverickTR', hq: 3, coord: '1.9.2' },
  { name: 'Barut_Han', hq: 5, coord: '4.5.9' },
  { name: 'CobraStrike', hq: 4, coord: '6.1.3' },
  { name: 'Tuğrul_38', hq: 3, coord: '8.4.5' },
  { name: 'RazorEdge', hq: 5, coord: '2.7.8' },
  { name: 'Nişancı_TR', hq: 4, coord: '3.1.9' },
  { name: 'FrostBite', hq: 3, coord: '5.6.2' },
  { name: 'AteşKılıcı', hq: 5, coord: '7.3.6' },
  { name: 'Rogue_Hawk', hq: 4, coord: '9.8.4' },

  // HQ 6-8 (25 bot)
  { name: 'BurakSniper', hq: 6, coord: '1.2.9' },
  { name: 'Centurion_99', hq: 6, coord: '4.8.5' },
  { name: 'Volkan_Paşa', hq: 7, coord: '6.4.1' },
  { name: 'WardenPrime', hq: 7, coord: '8.1.7' },
  { name: 'Zırhlı_Koç', hq: 8, coord: '2.6.9' },
  { name: 'ApexHunter', hq: 6, coord: '5.9.4' },
  { name: 'Tümgeneral', hq: 7, coord: '7.2.8' },
  { name: 'BlackOps_51', hq: 8, coord: '9.5.6' },
  { name: 'Emir_Komutan', hq: 6, coord: '3.7.1' },
  { name: 'ValorKnight', hq: 7, coord: '1.3.5' },
  { name: 'Akrep_TR', hq: 8, coord: '4.6.7' },
  { name: 'Reaper_Doom', hq: 6, coord: '6.8.2' },
  { name: 'Cengiz_Han', hq: 7, coord: '8.3.9' },
  { name: 'OmegaWolf', hq: 8, coord: '2.9.3' },
  { name: 'Korkusuz_41', hq: 6, coord: '5.7.6' },
  { name: 'JuggernautX', hq: 7, coord: '7.5.1' },
  { name: 'Topçu_Serdar', hq: 8, coord: '9.4.8' },
  { name: 'HavocElite', hq: 7, coord: '1.8.2' },
  { name: 'Ozan_Bey', hq: 6, coord: '3.5.7' },
  { name: 'CypherNode', hq: 8, coord: '6.2.4' },
  { name: 'Yavuz_Sultan', hq: 7, coord: '8.6.5' },
  { name: 'Predator_90', hq: 6, coord: '4.2.3' },
  { name: 'ÇelikFırtına', hq: 8, coord: '2.4.6' },
  { name: 'NexusGuard', hq: 7, coord: '5.3.8' },
  { name: 'Boran_TR', hq: 8, coord: '7.9.1' },

  // HQ 9-11 (15 bot)
  { name: 'SultanMurat', hq: 9, coord: '1.1.6' },
  { name: 'OverlordX', hq: 9, coord: '3.4.8' },
  { name: 'Paşa_Komutan', hq: 10, coord: '6.6.3' },
  { name: 'TitaniumCore', hq: 10, coord: '8.8.1' },
  { name: 'Kılıçarslan', hq: 11, coord: '2.2.5' },
  { name: 'WarChief_77', hq: 9, coord: '4.4.9' },
  { name: 'Gazi_Ertuğrul', hq: 10, coord: '9.7.2' },
  { name: 'Devastator', hq: 11, coord: '5.5.4' },
  { name: 'Turgut_Alp', hq: 9, coord: '7.7.7' },
  { name: 'Colossus_TR', hq: 10, coord: '1.9.8' },
  { name: 'FelakET', hq: 11, coord: '3.3.1' },
  { name: 'MarshalFury', hq: 9, coord: '6.1.9' },
  { name: 'Kanuni_06', hq: 10, coord: '8.9.4' },
  { name: 'Nemesis_Zero', hq: 11, coord: '4.2.6' },
  { name: 'SultanSelim', hq: 11, coord: '9.9.3' },

  // HQ 12-14 (10 bot)
  { name: 'ImperatorVX', hq: 12, coord: '2.1.1' },
  { name: 'MeteHan_TR', hq: 12, coord: '5.8.7' },
  { name: 'Annihilator', hq: 13, coord: '7.6.2' },
  { name: 'Kağan_Börü', hq: 13, coord: '3.9.5' },
  { name: 'SupremeLord', hq: 14, coord: '9.4.3' },
  { name: 'Erlik_Han', hq: 12, coord: '1.6.8' },
  { name: 'AbsoluteZero', hq: 13, coord: '6.3.4' },
  { name: 'TuranHükümdar', hq: 14, coord: '8.1.9' },
  { name: 'Warlord_Kaan', hq: 12, coord: '4.7.6' },
  { name: 'Cihan_Fatih', hq: 14, coord: '2.5.3' },

  // HQ 15-18 (5 bot)
  { name: 'AttilaScourge', hq: 15, coord: '5.2.1' },
  { name: 'HakanImparator', hq: 16, coord: '7.9.5' },
  { name: 'Oblivion_TR', hq: 17, coord: '3.6.8' },
  { name: 'TanrıKurdu', hq: 18, coord: '9.1.4' },
  { name: 'Ragnarok_61', hq: 15, coord: '1.4.9' },
];

function getBotProfiles() {
  return BOT_PROFILES.map(p => {
    const buildings = makeBuildings(p.hq);
    const resources = makeResources(p.hq);
    const researchStates = makeResearchStates(p.hq);

    // Power hesapla
    const POWER_TIER = { 1: 10, 2: 30, 3: 60, 4: 100 };
    const buildingPower = buildings.reduce((s, b) => s + b.level * (b.level + 1) / 2 * 100, 0);
    const unitPower = buildings.reduce((s, b) => {
      for (const count of Object.values(b.trainedUnits ?? {})) {
        s += (count ?? 0) * 10; // Basit tahmin
      }
      return s;
    }, 0);
    const researchPower = researchStates.filter(r => r.completed).reduce((s) => s + 50, 0);
    const playerPower = buildingPower + unitPower + researchPower;

    return {
      uid: `bot_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      displayName: p.name,
      coordinate: p.coord,
      hqLevel: p.hq,
      buildings,
      resources,
      researchStates,
      warPower: 0,
      battleReports: [],
      birlikler: [],
      allianceContribution: 0,
      missions: [],
      schemaVersion: 'war-nexus/base-game/v1',
      lastSavedAt: Date.now(),
      playerPower,
      wins: Math.floor(3 + Math.random() * p.hq * 5),
      losses: Math.floor(1 + Math.random() * p.hq * 3),
    };
  });
}

module.exports = { getBotProfiles, UNITS_BY_BUILDING, ALL_BUILDING_IDS, MAX_LEVELS };
