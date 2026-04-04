/**
 * GlobalChatModal — Genel sohbet modalı.
 * Tüm oyuncular birbirleriyle yazışabilir, ittifak arayabilir.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import { db } from '../services/firebase';
import { filterProfanity } from '../data/profanityFilter';
import { useDesertGame } from '../state/DesertGameContext';

interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  allianceTag?: string;
  text: string;
  timestamp: number;
}

const MAX_MESSAGES = 100;
const SPAM_COOLDOWN_MS = 5000;

export function GlobalChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { uid, displayName, alliance } = useDesertGame();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!uid) return;
    db.players().doc(uid).get().then(doc => {
      setIsAdmin(doc.exists() && doc.data()?.isAdmin === true);
    }).catch(() => {});
  }, [uid]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Mesajları dinle
  useEffect(() => {
    if (!visible) return;
    const unsub = db.globalChat()
      .orderBy('timestamp', 'asc')
      .limitToLast(MAX_MESSAGES)
      .onSnapshot(snap => {
        if (!snap) return;
        const msgs: ChatMessage[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          msgs.push({
            id: doc.id,
            senderUid: d.senderUid,
            senderName: d.senderName,
            allianceTag: d.allianceTag,
            text: filterProfanity(d.text ?? ''),
            timestamp: d.timestamp ?? 0,
          });
        });
        setMessages(msgs);
      });
    return () => unsub?.();
  }, [visible]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !uid) return;

    // Spam koruması
    const now = Date.now();
    if (now - lastSentAt < SPAM_COOLDOWN_MS) return;

    setSending(true);
    setInputText('');
    setLastSentAt(now);

    try {
      await db.globalChat().add({
        senderUid: uid,
        senderName: displayName,
        allianceTag: alliance?.myAllianceData?.tag ?? null,
        text: filterProfanity(text),
        timestamp: now,
      });
    } catch (err) {
      console.warn('[GlobalChat] Send failed:', err);
    }
    setSending(false);
  }

  async function handleDelete(msgId: string) {
    if (!isAdmin) return;
    try {
      await db.globalChat().doc(msgId).delete();
    } catch {}
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('chat.title')}</Text>
          <Text style={styles.subtitle}>{t('chat.messageCount', { count: String(messages.length) })}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Mesajlar */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && (
            <Text style={styles.emptyText}>{t('chat.empty')}</Text>
          )}
          {messages.map(msg => (
            <Pressable
              key={msg.id}
              style={styles.msgRow}
              onLongPress={() => isAdmin ? handleDelete(msg.id) : undefined}
            >
              <View style={styles.msgHeader}>
                <Text style={styles.msgName}>
                  {msg.allianceTag ? (
                    <Text style={styles.allianceTag}>[{msg.allianceTag}] </Text>
                  ) : null}
                  {msg.senderName}
                </Text>
                <Text style={styles.msgTime}>{formatTime(msg.timestamp)}</Text>
              </View>
              <Text style={styles.msgText}>{msg.text}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!sending}
            maxLength={200}
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Text style={styles.sendBtnText}>{sending ? t('chat.sending') : t('chat.send')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  title: {
    color: colors.sand,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginRight: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 12,
    gap: 6,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  msgRow: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  msgName: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
  },
  allianceTag: {
    color: colors.military,
    fontWeight: '800',
  },
  msgTime: {
    color: colors.textMuted,
    fontSize: 10,
  },
  msgText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: colors.military,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
