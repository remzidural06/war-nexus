import { RESEARCH_NODES } from '../data/research';

const VALID_BRANCHES = ['land', 'air', 'naval', 'defense'];
const VALID_TIERS = [1, 2, 3, 4];

// ─── Research data integrity ─────────────────────────────────
describe('research data integrity', () => {
  test('no duplicate research node IDs', () => {
    const ids = RESEARCH_NODES.map(n => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('every node has a valid branch', () => {
    for (const node of RESEARCH_NODES) {
      expect(VALID_BRANCHES).toContain(node.branch);
    }
  });

  test('every node has a valid tier (1-4)', () => {
    for (const node of RESEARCH_NODES) {
      expect(VALID_TIERS).toContain(node.tier);
    }
  });

  test('every node has positive research time', () => {
    for (const node of RESEARCH_NODES) {
      expect(node.researchSeconds).toBeGreaterThan(0);
    }
  });

  test('every node has non-negative costs', () => {
    for (const node of RESEARCH_NODES) {
      expect(node.costCash).toBeGreaterThanOrEqual(0);
      expect(node.costOil).toBeGreaterThanOrEqual(0);
      expect(node.costOre).toBeGreaterThanOrEqual(0);
    }
  });

  test('at least one node has non-zero total cost', () => {
    const hasAnyCost = RESEARCH_NODES.some(
      n => n.costCash + n.costOil + n.costOre > 0,
    );
    expect(hasAnyCost).toBe(true);
  });

  test('all 4 branches are represented', () => {
    const branches = new Set(RESEARCH_NODES.map(n => n.branch));
    for (const b of VALID_BRANCHES) {
      expect(branches.has(b)).toBe(true);
    }
  });

  test('each branch has nodes across multiple tiers', () => {
    for (const branch of VALID_BRANCHES) {
      const tiers = new Set(
        RESEARCH_NODES.filter(n => n.branch === branch).map(n => n.tier),
      );
      expect(tiers.size).toBeGreaterThanOrEqual(2);
    }
  });
});

// ─── Prerequisite validation ─────────────────────────────────
describe('research prerequisites', () => {
  const nodeIds = new Set(RESEARCH_NODES.map(n => n.id));

  test('all prerequisite IDs reference existing nodes', () => {
    for (const node of RESEARCH_NODES) {
      for (const req of node.requires) {
        expect(nodeIds.has(req)).toBe(true);
      }
    }
  });

  test('T1 nodes have no prerequisites', () => {
    const t1Nodes = RESEARCH_NODES.filter(n => n.tier === 1);
    for (const node of t1Nodes) {
      expect(node.requires.length).toBe(0);
    }
  });

  test('T2+ nodes have at least one prerequisite', () => {
    const higherNodes = RESEARCH_NODES.filter(n => n.tier >= 2);
    for (const node of higherNodes) {
      expect(node.requires.length).toBeGreaterThan(0);
    }
  });

  test('no node requires itself', () => {
    for (const node of RESEARCH_NODES) {
      expect(node.requires).not.toContain(node.id);
    }
  });
});
