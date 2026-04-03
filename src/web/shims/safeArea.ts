import React from 'react';
import { View } from 'react-native';

export const SafeAreaProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, { style: { flex: 1 } }, children);

export const SafeAreaView = ({ children, style }: { children: React.ReactNode; style?: any }) =>
  React.createElement(View, { style: [{ flex: 1 }, style] }, children);
