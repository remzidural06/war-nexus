import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';
import { updateDisplayName, ensurePlayerProfilePublic } from '../services/authService';

interface Props {
  uid: string;
  onComplete: () => void;
}

export function UsernameScreen({ uid, onComplete }: Props) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const name = username.trim();
    if (!name) {
      setError(t('username.errorRequired'));
      return;
    }
    if (name.length < 3) {
      setError(t('username.errorTooShort'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ensurePlayerProfilePublic(uid, name);
      await updateDisplayName(uid, name);
      onComplete();
    } catch (err: any) {
      setError(err?.message ?? t('username.errorGeneric'));
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Image source={require('../assets/logo.jpg')} style={s.logo} resizeMode="contain" />
      <Text style={s.title}>{t('username.title')}</Text>
      <Text style={s.subtitle}>{t('username.subtitle')}</Text>

      <TextInput
        style={s.input}
        placeholder={t('username.placeholder')}
        placeholderTextColor={colors.textMuted}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        maxLength={20}
        autoFocus
      />

      {error && <Text style={s.errorText}>{error}</Text>}

      <Pressable style={s.btn} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>{t('username.start')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  logo: { width: 200, height: 140, marginBottom: 20 },
  title: { color: colors.sand, fontSize: 22, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 24, textAlign: 'center' },
  input: {
    width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 18, textAlign: 'center',
  },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 8 },
  btn: {
    width: '100%', paddingVertical: 14, borderRadius: 6,
    backgroundColor: colors.sand, alignItems: 'center', marginTop: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
