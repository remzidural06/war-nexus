/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/state/BaseGameContext', () => {
  const React = require('react');

  return {
    BaseGameProvider: ({ children }: { children: React.ReactNode }) => children,
    useBaseGame: () => ({
      commanderName: 'Komutan Vela',
      hqLevel: 5,
      powerScore: '18.4K',
      resources: [
        { key: 'oil', amount: 1300, capacity: 2000 },
        { key: 'power', amount: 1600, capacity: 2000 },
        { key: 'ammo', amount: 740, capacity: 1500 },
        { key: 'cash', amount: 2400, capacity: 5000 },
      ],
      buildings: [
        {
          id: 'hq',
          nameKey: 'buildings.hq.name',
          descriptionKey: 'buildings.hq.description',
          statusKey: 'common.ready',
          position: { left: '34%', top: '30%' },
          footprint: 'command',
          accent: 'accent',
          level: 5,
          tier: 3,
          timerLabel: 'Ready',
          upgradeSecondsRemaining: 0,
          upgradeDurationSeconds: 90,
          upgradeCost: {},
        },
      ],
      missions: [],
      reports: [],
      selectedBuildingId: 'hq',
      activeMarch: null,
      activeRaid: null,
      defenseScore: 120,
      isHydrated: true,
      setSelectedBuildingId: jest.fn(),
      upgradeBuilding: jest.fn(),
      collectBuildingOutput: jest.fn(),
      startTraining: jest.fn(),
      startResearch: jest.fn(),
      healUnits: jest.fn(),
      scoutTarget: jest.fn(),
      attackTarget: jest.fn(),
      estimateAttackChance: jest.fn(() => 75),
      estimateDefenseHold: jest.fn(() => 88),
      canUpgradeBuilding: jest.fn(() => true),
      canCollectBuildingOutput: jest.fn(() => false),
      canStartTraining: jest.fn(() => false),
      canStartResearch: jest.fn(() => false),
      canHealUnits: jest.fn(() => false),
      getUpgradeLockReason: jest.fn(() => null),
      getBuildingLockReason: jest.fn(() => null),
      getBuildingPrimaryActionLabel: jest.fn(() => 'Upgrade'),
      getBuildingSecondaryActionLabel: jest.fn(() => 'Upgrade'),
    }),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
