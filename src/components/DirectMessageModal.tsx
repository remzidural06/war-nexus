/**
 * DirectMessageModal — Özel mesajlaşma sistemi
 * Konuşma listesi + Chat ekranı
 */
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import type { DMConversation, DMMessage } from '../state/useDirectMessages';

interface Props {
  visible: boolean;
  onClose: () => void;
  uid: string | null;
  conversations: DMConversation[];
  activeChat: { conversationId: string; otherUid: string; otherName: string } | null;
  messages: DMMessage[];
  onOpenChat: (otherUid: string, otherName: string) => void;
  onCloseChat: () => void;
  onSendMessage: (text: string) => Promise<string | undefined>;
  onDeleteConversation: (convId: string) => void;
}

function formatTime(ts: number): string {
  const ago = Math.floor((Date.now() - ts) / 60000);
  if (ago < 1) return t('dm.timeJustNow');
  if (ago < 60) return t('dm.timeMinutesAgo', { n: String(ago) });
  if (ago < 1440) return t('dm.timeHoursAgo', { n: String(Math.floor(ago / 60)) });
  return t('dm.timeDaysAgo', { n: String(Math.floor(ago / 1440)) });
}

export function DirectMessageModal(props: Props) {
  const { visible, onClose, uid, conversations, activeChat, messages, onOpenChat, onCloseChat, onSendMessage, onDeleteConversation } = props;

  if (activeChat) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <ChatView
          uid={uid}
          otherName={activeChat.otherName}
          messages={messages}
          onBack={onCloseChat}
          onSend={onSendMessage}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={s.root}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('dm.title')}</Text>
          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={s.body}>
          {conversations.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.emptyText}>{t('dm.noConversations')}</Text>
            </View>
          ) : (
            conversations.map(conv => (
              <Pressable
                key={conv.id}
                style={s.convRow}
                onPress={() => onOpenChat(conv.otherUid, conv.otherName)}
                onLongPress={() => {
                  onDeleteConversation(conv.id);
                }}
              >
                <View style={s.convAvatar}>
                  <Text style={s.convAvatarText}>{conv.otherName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.convInfo}>
                  <View style={s.convTopRow}>
                    <Text style={s.convName} numberOfLines={1}>{conv.otherName}</Text>
                    <Text style={s.convTime}>{formatTime(conv.lastMessageAt)}</Text>
                  </View>
                  <Text style={s.convLastMsg} numberOfLines={1}>
                    {conv.lastMessage || '...'}
                  </Text>
                </View>
                {conv.unreadCount > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadText}>{conv.unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Chat Ekranı ──────────────────────────────────────────────
function ChatView({ uid, otherName, messages, onBack, onSend }: {
  uid: string | null;
  otherName: string;
  messages: DMMessage[];
  onBack: () => void;
  onSend: (text: string) => Promise<string | undefined>;
}) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    setError('');
    const result = await onSend(inputText.trim());
    if (result === 'spam') setError(t('dm.spamWarning'));
    else if (result === 'too_long') setError(t('dm.messageTooLong'));
    else setInputText('');
    setSending(false);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View style={s.chatHeaderInfo}>
          <View style={s.chatAvatar}>
            <Text style={s.chatAvatarText}>{otherName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{otherName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView ref={scrollRef} style={s.chatBody} contentContainerStyle={{ paddingVertical: 12 }}>
        {messages.length === 0 ? (
          <Text style={s.chatEmpty}>{t('dm.empty')}</Text>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderUid === uid;
            return (
              <View key={msg.id} style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                {!isMe && <Text style={s.bubbleName}>{msg.senderName}</Text>}
                <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{msg.text}</Text>
                <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>{formatTime(msg.timestamp)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('dm.placeholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          multiline
        />
        <Pressable
          style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Text style={s.sendBtnText}>{sending ? t('dm.sending') : t('dm.send')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 50,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
  },
  headerTitle: { color: colors.sand, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { padding: 8 },
  closeText: { color: colors.textMuted, fontSize: 22 },
  backBtn: { padding: 8, paddingRight: 12 },
  backText: { color: colors.sand, fontSize: 28, fontWeight: '300' },
  chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chatAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.military, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.sand,
  },
  chatAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  body: { flex: 1, padding: 12 },
  // Conversation list
  convRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder,
  },
  convAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.military, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: colors.panelBorder,
  },
  convAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  convTime: { color: colors.textMuted, fontSize: 10 },
  convLastMsg: { color: colors.textSecondary, fontSize: 12 },
  unreadBadge: {
    backgroundColor: colors.sand, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8,
  },
  unreadText: { color: colors.background, fontSize: 11, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  // Chat
  chatBody: { flex: 1, paddingHorizontal: 12 },
  chatEmpty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
  bubble: {
    maxWidth: '78%' as any, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, marginBottom: 6,
  },
  bubbleMe: {
    alignSelf: 'flex-end', backgroundColor: '#2C4A1E',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start', backgroundColor: colors.surface,
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.panelBorder,
  },
  bubbleName: { color: colors.sand, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  bubbleText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#E8F5E9' },
  bubbleTime: { color: colors.textMuted, fontSize: 9, marginTop: 3, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: '#81C784' },
  errorText: { color: colors.danger, fontSize: 11, textAlign: 'center', paddingVertical: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.panelBorder, backgroundColor: colors.surface,
    paddingBottom: 30,
  },
  input: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, color: colors.textPrimary,
    fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: colors.panelBorder,
  },
  sendBtn: {
    marginLeft: 8, backgroundColor: colors.sand, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.background, fontSize: 14, fontWeight: '700' },
});
