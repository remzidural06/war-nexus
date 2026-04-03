import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { UNIT_IMAGES } from '../assets/base/units';

export function UnitImage({
  uri,
  unitId,
  icon,
  style,
  banner,
}: {
  uri?: string;
  unitId?: string;
  icon: string;
  style: object;
  banner?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  // Önce lokal asset dene
  const localSource = unitId ? UNIT_IMAGES[unitId] : undefined;

  if (failed || (!localSource && !uri)) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }]}>
        <Text style={{ fontSize: banner ? 40 : 22 }}>{icon}</Text>
      </View>
    );
  }

  // Lokal asset varsa kullan
  if (localSource) {
    return (
      <Image
        source={typeof localSource === 'string' ? { uri: localSource } : localSource}
        style={style}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: uzak URL (wsrv.nl proxy)
  const proxyUrl = banner
    ? `https://wsrv.nl/?url=${uri!.replace('https://', '')}&w=600&h=200&fit=cover&q=80`
    : `https://wsrv.nl/?url=${uri!.replace('https://', '')}&w=120&h=80&fit=cover&q=70`;

  return (
    <Image
      source={{ uri: proxyUrl }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
