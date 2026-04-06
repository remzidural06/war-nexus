// ============================================================
// Desert Strike — Master Type Definitions
// ============================================================

// ─── Resources ──────────────────────────────────────────────
export type ResourceKey = 'cash' | 'oil' | 'ore' | 'gold';

export interface Resource {
  key: ResourceKey;
  label: string;
  amount: number;
  capacity: number;
  productionPerHour: number;
  icon: string;
}

// ─── Research ────────────────────────────────────────────────
export type ResearchBranch = 'land' | 'air' | 'naval' | 'defense';

export type ResearchTier = 1 | 2 | 3 | 4;

export interface ResearchNode {
  id: string;
  branch: ResearchBranch;
  tier: ResearchTier;
  label: string;
  description: string;
  unlocks: string[]; // unit IDs or building feature IDs
  requires: string[]; // prerequisite research node IDs
  costCash: number;
  costOil: number;
  costOre: number;
  researchSeconds: number;
}

export interface ResearchState {
  nodeId: string;
  completed: boolean;
  inProgress: boolean;
  secondsRemaining: number;
}

// ─── Buildings ───────────────────────────────────────────────
export type BuildingId =
  | 'hq'
  | 'barracks'
  | 'tankFactory'
  | 'airport'
  | 'shipyard'
  | 'oilField'
  | 'mine'
  | 'bank'
  | 'researchLab'
  | 'defenseTower'
  | 'radar'
  | 'houses';

export type BuildingCategory = 'military' | 'economy' | 'support';

export interface BuildingDefinition {
  id: BuildingId;
  label: string;
  category: BuildingCategory;
  maxLevel: number;
  researchBranch?: ResearchBranch;
  produceResource?: ResourceKey;
  baseProdPerHour?: number;    // seviye başına üretim (seviye ile çarpılır)
  interestRatePerLevel?: number; // banka faiz oranı: stored * level * rate / 3600 per second
  lossReductionPerLevel?: number; // savunma: kayıp çarpanı azaltma (0.04 = %4/seviye)
  baseCostCash: number;
  baseCostOil: number;
  baseCostOre: number;
  baseUpgradeSeconds: number;
  costScaleFactor: number; // multiplier per level
  timeScaleFactor: number;
  description: string;
}

export interface BuildingState {
  id: BuildingId;
  level: number;
  upgradeSecondsRemaining: number;
  isUpgrading: boolean;
  researchSecondsRemaining: number;
  activeResearchNodeId: string | null;
  trainedUnits: Record<string, number>; // unitId → count
  trainingQueue: TrainingQueueItem[];
}

export interface TrainingQueueItem {
  unitId: string;
  quantity: number;
  secondsRemaining: number;
  totalSeconds: number;
}

// ─── Units ───────────────────────────────────────────────────
export type UnitBranch =
  | 'infantry'
  | 'armor'
  | 'artillery'
  | 'uav'
  | 'helicopter'
  | 'fixedWing'
  | 'bomber'
  | 'naval'
  | 'airDefense';

export interface UnitDefinition {
  id: string;
  label: string;
  labelEn?: string;
  branch: UnitBranch;
  researchBranch: ResearchBranch;
  tier: ResearchTier;
  requiredResearchNodeId: string; // '' = no research required
  minBuildingLevel: number;       // building must be >= this level
  requiredBuildingId: BuildingId;
  attackPower: number;
  defensePower: number;
  costCash: number;
  costOil: number;
  costOre: number;
  trainingSeconds: number; // per unit
  icon: string;
  imageUri?: string;
  description: string;
}

// ─── Map / Combat ─────────────────────────────────────────────
export type TargetDifficulty = 'easy' | 'medium' | 'hard' | 'elite';

export interface DefenseUnit {
  unitId: string;
  count: number;
}

export interface MapTarget {
  id: string;
  name: string;
  player: string;
  difficulty: TargetDifficulty;
  defenseRating: number;
  defenseUnits?: DefenseUnit[];
  rewardCash: number;
  rewardOil: number;
  rewardOre: number;
  travelSeconds: number;
  available: boolean;
  minHQLevel?: number;
  coordinate: string;
}

export interface BirlikSlot { unitId: string; buildingId: string; icon: string; label: string; imageUri?: string; count: number; }
export interface Birlik { id: string; name: string; slots: BirlikSlot[]; }

export type MarchType = 'attack' | 'return';

export interface MarchUnit {
  unitId: string;
  count: number;
  buildingId: string;
}

export interface March {
  id: string;
  targetId: string;
  targetName: string;
  type: MarchType;
  committedUnits: number;
  totalSeconds: number;
  secondsRemaining: number;
  attackPower: number;
  marchUnits?: MarchUnit[];
  marchCost?: { cash: number; oil: number; ore: number };
  savedAt?: number;
  isWarAttack?: boolean;
}

export interface UnitBattleResult {
  unitId: string;
  branch: string;
  deployed: number;
  losses: number;
  damageDealt: number;
}

export interface DefenseUnitResult {
  unitId: string;
  branch: string;
  count: number;
  destroyed: number;
}

export interface BattleReport {
  id: string;
  targetId: string;
  targetName: string;
  timestamp: number;
  won: boolean;
  attackPower: number;
  defensePower: number;
  unitsLost: number;
  rewardCash: number;
  rewardOil: number;
  rewardOre: number;
  powerChange?: number;
  attackerResults?: UnitBattleResult[];
  defenderResults?: DefenseUnitResult[];
}

export interface IncomingAttack {
  id: string;
  attackerUid?: string;
  attackerName: string;
  unitCount: number;
  attackUnits: DefenseUnit[];
  totalSeconds: number;
  secondsRemaining: number;
  isWarAttack?: boolean;
  warAllianceId?: string;
  warEnemyAllianceId?: string;
}

// ─── Alliance ─────────────────────────────────────────────────
export interface AllianceMember {
  id: string;
  name: string;
  rank: string;
  contribution: number;
  power: number;
  online: boolean;
}

export interface AllianceHelpRequest {
  id: string;
  memberId: string;
  memberName: string;
  buildingId: BuildingId;
  reductionSeconds: number;
  timestamp: number;
}

// ─── Missions ─────────────────────────────────────────────────
export type MissionType = 'upgrade' | 'train' | 'attack' | 'research' | 'donate';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  rewardCash: number;
  rewardOil: number;
  rewardOre: number;
  rewardGold?: number;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  claimed: boolean;
  targetBuildingId?: BuildingId;
  targetUnitId?: string;
  requiresWin?: boolean;
  order: number; // Sıra numarası — düşük önce gösterilir
}

// ─── Persisted State ──────────────────────────────────────────
export interface PersistedGameState {
  schemaVersion: number;
  lastSavedAt: number;
  resources: Resource[];
  buildings: BuildingState[];
  researchStates: ResearchState[];
  march: March | null;
  battleReports: BattleReport[];
  allianceContribution: number;
  missions: Mission[];
  warPower?: number;
  birlikler?: Birlik[];
  pvpCooldowns?: Record<string, number>;
  revengeTargets?: Record<string, number>;
  shieldUntil?: number;
  wins?: number;
  losses?: number;
}

// ─── Context Values ───────────────────────────────────────────
export interface ResourceContextValue {
  resources: Resource[];
  getResource: (key: ResourceKey) => Resource;
  canAfford: (cash: number, oil: number, ore: number) => boolean;
  deductCost: (cash: number, oil: number, ore: number) => void;
  addResource: (key: ResourceKey, amount: number) => void;
}

export interface BuildingContextValue {
  buildings: BuildingState[];
  getBuilding: (id: BuildingId) => BuildingState | undefined;
  canUpgradeBuilding: (id: BuildingId) => boolean;
  upgradeBuilding: (id: BuildingId) => void;
  getBuildingUpgradeCost: (id: BuildingId) => { cash: number; oil: number; ore: number };
  getBuildingUpgradeTime: (id: BuildingId) => number;
}

export interface ResearchContextValue {
  researchStates: ResearchState[];
  getResearchState: (nodeId: string) => ResearchState | undefined;
  isResearched: (nodeId: string) => boolean;
  canStartResearch: (buildingId: BuildingId, nodeId: string) => boolean;
  startResearch: (buildingId: BuildingId, nodeId: string) => void;
  getAvailableResearch: (buildingId: BuildingId) => ResearchNode[];
  getUnlockedUnitsForBuilding: (buildingId: BuildingId) => UnitDefinition[];
}

export interface UnitContextValue {
  getTrainedCount: (buildingId: BuildingId, unitId: string) => number;
  getTotalTrainedUnits: () => number;
  canStartTraining: (buildingId: BuildingId, unitId: string, qty: number) => boolean;
  startTraining: (buildingId: BuildingId, unitId: string, qty: number) => void;
  getTrainingCost: (unitId: string, qty: number) => { cash: number; oil: number; ore: number };
}

export interface MapContextValue {
  targets: MapTarget[];
  activeMarch: March | null;
  battleReports: BattleReport[];
  getTotalAttackPower: (committedUnits: number) => number;
  canAttack: (targetId: string, committedUnits: number) => boolean;
  attackTarget: (targetId: string, targetName: string, committedUnits: number, marchUnits?: MarchUnit[]) => void;
}

export interface AllianceContextValue {
  allianceContribution: number;
  canDonate: (resource: ResourceKey, amount: number) => boolean;
  donate: (resource: ResourceKey, amount: number) => void;
  canRequestHelp: () => boolean;
  requestHelp: () => void;
}

// ─── Alliance (Real) ─────────────────────────────────────────
export type AllianceRank = 'leader' | 'officer' | 'foreign' | 'economy' | 'interior' | 'defense' | 'member';
export type AllianceJoinType = 'open' | 'approval';

export interface AllianceData {
  id: string;
  name: string;
  nameLower?: string;
  tag: string;
  description: string;
  leaderUid: string;
  leaderName: string;
  joinType: AllianceJoinType;
  memberCount: number;
  maxMembers: number;
  totalPower: number;
  treasury: { cash: number; oil: number; ore: number };
  allianceLevel?: number;
  allianceXp?: number;
  activeBoost?: { type: string; endsAt: number } | null;
  createdAt: number;
  activeWar?: AllianceWar | null;
  warHistory?: AllianceWarHistory[];
}

export interface AllianceDonationRequest {
  id: string;
  requesterUid: string;
  requesterName: string;
  resource: 'cash' | 'oil' | 'ore';
  amount: number;
  filled: number;
  createdAt: number;
  donors: { uid: string; name: string; amount: number }[];
}

export interface AllianceMemberData {
  uid: string;
  displayName: string;
  rank: AllianceRank;
  power: number;
  contribution: number;
  joinedAt: number;
  lastOnline: number;
}

export interface AllianceJoinRequest {
  uid: string;
  displayName: string;
  power: number;
  hqLevel: number;
  requestedAt: number;
}

export interface AllianceChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system';
}

export interface AllianceWarAttackLog {
  attackerName: string;
  defenderName: string;
  won: boolean;
  score: number;
  timestamp: number;
}

export interface AllianceWar {
  enemyAllianceId: string;
  enemyName: string;
  enemyTag: string;
  startedAt: number;
  endsAt: number;
  ourScore: number;
  theirScore: number;
  lastAttack?: AllianceWarAttackLog | null;
}

export interface AllianceWarHistory {
  enemyName: string;
  enemyTag: string;
  ourScore: number;
  theirScore: number;
  won: boolean;
  endedAt: number;
}

export interface AllianceWarMemberStat {
  uid: string;
  name: string;
  attacks: number;
  wins: number;
  losses: number;
  score: number;
}

export interface AllianceWarReport {
  type: 'warResult';
  timestamp: number;
  // Ittifak bilgileri
  ourName: string;
  ourTag: string;
  enemyName: string;
  enemyTag: string;
  // Sonuc
  won: boolean;
  ourScore: number;
  theirScore: number;
  startedAt: number;
  endedAt: number;
  // Oduller
  rewards: {
    treasury: { cash: number; oil: number; ore: number };
    perMember: string;
    mvpBonus: string;
  } | null;
  // MVP
  mvp: string | null;
  mvpScore: number;
  // Uye istatistikleri (skora gore siralanmis)
  memberStats: AllianceWarMemberStat[];
  // Toplam
  totalAttacks: number;
  totalWins: number;
}
