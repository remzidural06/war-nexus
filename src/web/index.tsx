import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActivityIndicator, Image, View, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BaseScreen } from '../screens/BaseScreen';
import { MapScreen } from '../screens/MapScreen';
import { AllianceScreen } from '../screens/AllianceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { UsernameScreen } from '../screens/UsernameScreen';
import { TopBar } from '../components/TopBar';
import { BottomTabs, type RootTab } from '../components/BottomTabs';
import { DesertGameProvider, useDesertGame } from '../state/DesertGameContext';
import { IncomingAttackBanner } from '../components/IncomingAttackBanner';
import { OutgoingAttackBanner } from '../components/OutgoingAttackBanner';
import { BattleResultModal } from '../components/BattleResultModal';
import { GlobalChatModal } from '../components/GlobalChatModal';
import { DirectMessageModal } from '../components/DirectMessageModal';
import { useDirectMessages } from '../state/useDirectMessages';
import { onAuthStateChanged, hasPlayerProfile } from '../services/authService';
import type { AuthUser } from '../services/authService';
import { colors } from '../theme/colors';



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
    <View style={s.loading}>
      <ActivityIndicator size="large" color={colors.sand} />
    </View>
  );
}

function WebApp() {
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
          setNeedsUsername(false);
        }
      } else {
        setNeedsUsername(false);
      }
      setInitializing(false);
    });
    // Firebase auth hic yanit vermezse 5sn sonra auth ekranina gec
    const timeout = setTimeout(() => setInitializing(false), 5000);
    return () => { unsubscribe(); clearTimeout(timeout); };
  }, []);

  if (initializing) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (needsUsername) {
    return <UsernameScreen uid={user.uid} onComplete={() => setNeedsUsername(false)} />;
  }

  return <GameApp uid={user.uid} />;
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  app: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 340, height: 250 },
  splashSpinner: { marginTop: 24 },
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <SafeAreaProvider>
    <WebApp />
  </SafeAreaProvider>
);
