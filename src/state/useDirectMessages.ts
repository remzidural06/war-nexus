/**
 * useDirectMessages — Oyuncular arası özel mesajlaşma hook'u
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { db, firestore } from '../services/firebase';
import { filterProfanity } from '../data/profanityFilter';

export interface DMConversation {
  id: string;
  participants: string[];
  otherUid: string;
  otherName: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface DMMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
  read: boolean;
}

/** İki UID'den deterministik conversationId oluştur */
function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export function useDirectMessages(uid: string | null, displayName: string) {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [activeChat, setActiveChat] = useState<{ conversationId: string; otherUid: string; otherName: string } | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const lastSendRef = useRef(0);
  const SPAM_COOLDOWN = 5000;

  // Konuşma listesini dinle
  useEffect(() => {
    if (!uid) return;
    let unsub: (() => void) | undefined;
    try {
    unsub = db.directMessages()
      .where('participants', 'array-contains', uid)
      .limit(50)
      .onSnapshot(snap => {
        const convs: DMConversation[] = [];
        let unread = 0;
        snap.forEach(doc => {
          const data = doc.data();
          const otherUid = (data.participants ?? []).find((p: string) => p !== uid) ?? '';
          const unreadKey = `unread_${uid}`;
          const unreadCount = data[unreadKey] ?? 0;
          unread += unreadCount;
          convs.push({
            id: doc.id,
            participants: data.participants ?? [],
            otherUid,
            otherName: data[`name_${otherUid}`] ?? otherUid.slice(0, 8),
            lastMessage: data.lastMessage ?? '',
            lastMessageAt: data.lastMessageAt ?? 0,
            unreadCount,
          });
        });
        convs.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        setConversations(convs);
        setTotalUnread(unread);
      }, (err) => { console.warn('[DM] Conversation listener error:', err?.message); });
    } catch (err: any) { console.warn('[DM] Setup error:', err?.message); }
    return () => { if (unsub) unsub(); };
  }, [uid]);

  // Aktif chat mesajlarını dinle
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    const unsub = db.dmMessages(activeChat.conversationId)
      .orderBy('timestamp', 'asc')
      .limitToLast(100)
      .onSnapshot(snap => {
        const msgs: DMMessage[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          msgs.push({ id: doc.id, senderUid: d.senderUid, senderName: d.senderName, text: d.text, timestamp: d.timestamp, read: d.read ?? false });
        });
        setMessages(msgs);
      }, () => {});
    // Okunmamışları sıfırla
    if (uid) {
      db.directMessages().doc(activeChat.conversationId).set({
        [`unread_${uid}`]: 0,
      }, { merge: true }).catch(() => {});
    }
    return unsub;
  }, [activeChat?.conversationId, uid]);

  // Mesaj gönder
  const sendMessage = useCallback(async (text: string) => {
    if (!uid || !activeChat || !text.trim()) return;
    const now = Date.now();
    if (now - lastSendRef.current < SPAM_COOLDOWN) return 'spam';
    if (text.length > 200) return 'too_long';
    lastSendRef.current = now;

    const filtered = filterProfanity(text.trim());
    const convId = activeChat.conversationId;

    // Mesajı ekle
    await db.dmMessages(convId).add({
      senderUid: uid,
      senderName: displayName,
      text: filtered,
      timestamp: now,
      read: false,
    });

    // Konuşma meta verisini güncelle
    const otherUnreadKey = `unread_${activeChat.otherUid}`;
    await db.directMessages().doc(convId).set({
      participants: [uid, activeChat.otherUid].sort(),
      [`name_${uid}`]: displayName,
      lastMessage: filtered,
      lastMessageAt: now,
      [otherUnreadKey]: firestore.FieldValue.increment(1),
    }, { merge: true });

    return 'ok';
  }, [uid, displayName, activeChat]);

  // Yeni konuşma başlat
  const openChat = useCallback(async (otherUid: string, otherName: string) => {
    if (!uid || otherUid === uid) return;
    const convId = getConversationId(uid, otherUid);

    // Konuşma yoksa oluştur
    const snap = await db.directMessages().doc(convId).get();
    if (!snap.exists) {
      await db.directMessages().doc(convId).set({
        participants: [uid, otherUid].sort(),
        [`name_${uid}`]: displayName,
        [`name_${otherUid}`]: otherName,
        lastMessage: '',
        lastMessageAt: Date.now(),
        [`unread_${uid}`]: 0,
        [`unread_${otherUid}`]: 0,
      });
    } else {
      // İsmi güncelle
      await db.directMessages().doc(convId).set({
        [`name_${uid}`]: displayName,
        [`name_${otherUid}`]: otherName,
      }, { merge: true });
    }

    setActiveChat({ conversationId: convId, otherUid, otherName });
  }, [uid, displayName]);

  // Chat kapat
  const closeChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
  }, []);

  // Konuşma sil
  const deleteConversation = useCallback(async (convId: string) => {
    try {
      // Mesajları sil
      const msgSnap = await db.dmMessages(convId).limit(500).get();
      msgSnap.forEach((doc: any) => doc.ref?.delete?.());
      // Konuşmayı sil
      await db.directMessages().doc(convId).delete();
      if (activeChat?.conversationId === convId) closeChat();
    } catch {}
  }, [activeChat, closeChat]);

  return {
    conversations,
    activeChat,
    messages,
    totalUnread,
    sendMessage,
    openChat,
    closeChat,
    deleteConversation,
  };
}
