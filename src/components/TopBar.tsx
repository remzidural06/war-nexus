import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { ResourceBar } from './ResourceBar';
import { useDesertGame } from '../state/DesertGameContext';

interface Props {
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
  onOpenHelp: () => void;
  onOpenGlobalChat: () => void;
  onOpenDM?: () => void;
  dmUnreadCount?: number;
}

export function TopBar({ onOpenProfile, onOpenAdmin, onOpenHelp, onOpenGlobalChat, onOpenDM, dmUnreadCount }: Props) {
  const { displayName } = useDesertGame();
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WAR NEXUS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onOpenAdmin && (
            <Pressable onPress={onOpenAdmin} style={styles.profileBtn}>
              <Text style={{ color: '#FFD700', fontSize: 16 }}>⚙️</Text>
            </Pressable>
          )}
          <Pressable onPress={onOpenGlobalChat} style={styles.profileBtn}>
            <Text style={{ fontSize: 16 }}>💬</Text>
          </Pressable>
          {onOpenDM && (
            <Pressable onPress={onOpenDM} style={styles.profileBtn}>
              <Text style={{ fontSize: 16 }}>✉️</Text>
              {(dmUnreadCount ?? 0) > 0 && (
                <View style={styles.dmBadge}>
                  <Text style={styles.dmBadgeText}>{dmUnreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
          <Pressable onPress={onOpenHelp} style={styles.profileBtn}>
            <Text style={{ fontSize: 16 }}>❓</Text>
          </Pressable>
          <Pressable onPress={onOpenProfile} style={styles.profileBtn}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </Pressable>
        </View>
      </View>
      <ResourceBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    color: colors.sand,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  profileBtn: {
    padding: 2,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.military,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.sand,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  dmBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dmBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
