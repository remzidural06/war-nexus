import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { BuildingId } from '../../state/types';

function toSource(img: any) {
  return typeof img === 'string' ? { uri: img } : img;
}

// Statik require map — Metro'da number, web'de string URL olur
const BUILDING_IMAGES: Record<BuildingId, any> = {
  hq:            toSource(require('./buildings/hq.jpg')),
  barracks:      toSource(require('./buildings/barracks.jpg')),
  tankFactory:   toSource(require('./buildings/tankFactory.jpg')),
  airport:       toSource(require('./buildings/airport.jpg')),
  shipyard:      toSource(require('./buildings/shipyard.jpg')),
  oilField:      toSource(require('./buildings/oilField.jpg')),
  mine:          toSource(require('./buildings/mine.jpg')),
  bank:          toSource(require('./buildings/bank.jpg')),
  researchLab:   toSource(require('./buildings/researchLab.jpg')),
  defenseTower:  toSource(require('./buildings/defenseTower.jpg')),
  radar:         toSource(require('./buildings/radar.jpg')),
  houses:        toSource(require('./buildings/houses.jpg')),
};

interface Props {
  buildingId: BuildingId;
  size?: number;
}

export function BuildingSprite({ buildingId, size = 48 }: Props) {
  const src = BUILDING_IMAGES[buildingId];
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={src}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
