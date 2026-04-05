/**
 * War Nexus — Native entry point (Android / iOS)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreen } from './src/screens/AuthScreen';
import { UsernameScreen } from './src/screens/UsernameScreen';
import { BaseScreen } from './src/screens/BaseScreen';
import { MapScreen } from './src/screens/MapScreen';
import { AllianceScreen } from './src/screens/AllianceScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { TopBar } from './src/components/TopBar';
import { BottomTabs, type RootTab } from './src/components/BottomTabs';
import { DesertGameProvider, useDesertGame } from './src/state/DesertGameContext';
import { IncomingAttackBanner } from './src/components/IncomingAttackBanner';
import { OutgoingAttackBanner } from './src/components/OutgoingAttackBanner';
import { BattleResultModal } from './src/components/BattleResultModal';
import { GlobalChatModal } from './src/components/GlobalChatModal';
import { DirectMessageModal } from './src/components/DirectMessageModal';
import { useDirectMessages } from './src/state/useDirectMessages';
import { onAuthStateChanged, hasPlayerProfile } from './src/services/authService';
import type { AuthUser } from './src/services/authService';
import { colors } from './src/theme/colors';

function IncomingAttackOverlay() {
  const { incomingAttack, getTotalTrainedUnits } = useDesertGame();
  if (!incomingAttack) return null;
  return <IncomingAttackBanner attack={incomingAttack} totalDefenders={getTotalTrainedUnits()} />;
}

function OutgoingAttackOverlay() {
  const { activeMarch, incomingAttack, cancelMarch } = useDesertGame();
  if (!activeMarch) return null;
  const topOffset = incomingAttack ? 140 : 80;
  return <OutgoingAttackBanner march={activeMarch} topOffset={topOffset} onCancel={cancelMarch} />;
}

function BattleResultOverlay() {
  const { lastBattleReport, clearLastBattleReport } = useDesertGame();
  if (!lastBattleReport) return null;
  return <BattleResultModal report={lastBattleReport} onClose={clearLastBattleReport} />;
}

function GameAppInner() {
  const { uid, displayName } = useDesertGame();
  const [activeTab, setActiveTab] = useState<RootTab>('base');
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [showDM, setShowDM] = useState(false);

  const dm = useDirectMessages(uid ?? null, displayName ?? '');
  const dmOpenChatRef = useRef(dm.openChat);
  dmOpenChatRef.current = dm.openChat;

  const handleOpenDM = useCallback((otherUid: string, otherName: string) => {
    dmOpenChatRef.current(otherUid, otherName);
    setShowDM(true);
  }, []);

  const screen = useMemo(() => {
    switch (activeTab) {
      case 'map': return <MapScreen />;
      case 'alliance': return <AllianceScreen />;
      case 'settings': return <SettingsScreen />;
      case 'leaderboard': return <LeaderboardScreen onOpenDM={handleOpenDM} />;
      case 'shop': return <ShopScreen />;
      case 'help': return <HelpScreen />;
      case 'profile': return <ProfileScreen />;
      case 'base': default: return <BaseScreen />;
    }
  }, [activeTab, handleOpenDM]);

  return (
    <>
      <TopBar
        onOpenProfile={() => setActiveTab(activeTab === 'profile' ? 'base' : 'profile')}
        onOpenHelp={() => setActiveTab(activeTab === 'help' ? 'base' : 'help')}
        onOpenGlobalChat={() => setShowGlobalChat(true)}
        onOpenDM={() => setShowDM(true)}
        dmUnreadCount={dm.totalUnread}
      />
      <View style={s.content}>{screen}</View>
      <IncomingAttackOverlay />
      <OutgoingAttackOverlay />
      <BattleResultOverlay />
      <GlobalChatModal visible={showGlobalChat} onClose={() => setShowGlobalChat(false)} />
      <DirectMessageModal
        visible={showDM}
        onClose={() => setShowDM(false)}
        uid={uid}
        conversations={dm.conversations}
        activeChat={dm.activeChat}
        messages={dm.messages}
        onOpenChat={dm.openChat}
        onCloseChat={dm.closeChat}
        onSendMessage={dm.sendMessage}
        onDeleteConversation={dm.deleteConversation}
      />
      <BottomTabs activeTab={activeTab} onChange={setActiveTab as any} />
    </>
  );
}

function GameApp({ uid }: { uid: string }) {
  return (
    <DesertGameProvider uid={uid}>
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={s.app}>
          <GameAppInner />
        </View>
      </SafeAreaView>
    </DesertGameProvider>
  );
}

function SplashScreen() {
  return (
    <View style={s.splash}>
      <ActivityIndicator size="large" color={colors.sand} />
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (u: AuthUser | null) => {
      setUser(u);
      if (u) {
        try {
          const hasProfile = await hasPlayerProfile(u.uid);
          setNeedsUsername(!hasProfile);
        } catch {
          // Firestore hata verirse profil var kabul et — UsernameScreen gosterme
          setNeedsUsername(false);
        }
      } else {
        setNeedsUsername(false);
      }
      setInitializing(false);
    });
    const timeout = setTimeout(() => setInitializing(false), 5000);
    return () => { unsubscribe(); clearTimeout(timeout); };
  }, []);

  if (initializing) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  if (needsUsername) {
    return (
      <SafeAreaProvider>
        <UsernameScreen uid={user.uid} onComplete={() => setNeedsUsername(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GameApp uid={user.uid} />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  app: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: { width: 340, height: 250 },
  splashSpinner: { marginTop: 24 },
});
