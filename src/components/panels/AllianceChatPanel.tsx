import React, { useState, useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n';
import { styles } from '../../screens/AllianceScreen.styles';

interface ChatTabProps {
  messages: { id: string; senderName: string; text: string; timestamp: number; type: 'chat' | 'system' }[];
  onSend: (text: string) => Promise<void>;
}

export function ChatTab({ messages, onSend }: ChatTabProps) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setSending(true);
    setInputText('');
    await onSend(text);
    setSending(false);
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.chatContainer}>
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && (
          <Text style={styles.chatEmptyText}>{t('alliance.chatEmpty')}</Text>
        )}
        {messages.map(msg => {
          if (msg.type === 'system') {
            return (
              <View key={msg.id} style={styles.systemMsgRow}>
                <Text style={styles.systemMsgText}>{msg.text}</Text>
              </View>
            );
          }
          return (
            <View key={msg.id} style={styles.chatMsgRow}>
              <Text style={styles.chatMsgName}>{msg.senderName}</Text>
              <Text style={styles.chatMsgTime}>{formatTime(msg.timestamp)}</Text>
              <Text style={styles.chatMsgText}>{msg.text}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder={t('alliance.chatPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!sending}
        />
        <Pressable
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? t('alliance.chatSending') : t('alliance.chatSend')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
