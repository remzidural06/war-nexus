import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset } from '../services/authService';
import { t, setLocale, getLocale, LOCALES, type Locale } from '../i18n';

const REMEMBER_KEY = 'war-nexus-remember';

export function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [lang, setLang] = useState<Locale>(getLocale());

  // Beni Hatırla: kayıtlı email/şifreyi yükle
  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_KEY).then(val => {
      if (val) {
        try {
          const { email: e, password: p } = JSON.parse(val);
          if (e) setEmail(e);
          if (p) setPassword(p);
          setRememberMe(true);
        } catch {}
      }
    });
  }, []);

  const handleEmail = async () => {
    if (mode === 'register' && !username.trim()) {
      setError(t('auth.errorUsernameRequired'));
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError(t('auth.errorEmailPasswordRequired'));
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError(t('auth.errorPasswordTooShort'));
      return;
    }
    if (mode === 'register' && password !== password2) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (mode === 'register') {
        await signUpWithEmail(email.trim(), password, username.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      // Beni Hatırla: başarılı girişte kaydet veya sil
      if (rememberMe) {
        AsyncStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email.trim(), password }));
      } else {
        AsyncStorage.removeItem(REMEMBER_KEY);
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/email-already-in-use') setError(t('auth.errorEmailInUse'));
      else if (code === 'auth/invalid-email') setError(t('auth.errorInvalidEmail'));
      else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError(t('auth.errorWrongPassword'));
      else if (code === 'auth/user-not-found') setError(t('auth.errorUserNotFound'));
      else if (code === 'auth/weak-password') setError(t('auth.errorWeakPassword'));
      else setError(err?.message ?? t('auth.errorGeneric'));
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(t('auth.errorEmailRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await sendPasswordReset(email.trim());
      setSuccessMsg(t('auth.resetSent'));
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found') setError(t('auth.errorUserNotFound'));
      else if (code === 'auth/invalid-email') setError(t('auth.errorInvalidEmail'));
      else setError(err?.message ?? t('auth.errorGeneric'));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? t('auth.errorGoogleFailed'));
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.logoBox}>
        <Image source={require('../assets/logo.jpg')} style={s.logo} resizeMode="contain" />
        <Text style={s.tagline}>{t('auth.tagline')}</Text>
      </View>

      <View style={s.formBox}>
        {/* Mode Toggle */}
        <View style={s.toggleRow}>
          <Pressable
            style={[s.toggleBtn, mode === 'login' && s.toggleActive]}
            onPress={() => { setMode('login'); setError(null); }}
          >
            <Text style={[s.toggleText, mode === 'login' && s.toggleTextActive]}>{t('auth.login')}</Text>
          </Pressable>
          <Pressable
            style={[s.toggleBtn, mode === 'register' && s.toggleActive]}
            onPress={() => { setMode('register'); setError(null); }}
          >
            <Text style={[s.toggleText, mode === 'register' && s.toggleTextActive]}>{t('auth.register')}</Text>
          </Pressable>
        </View>

        {/* Email/Password */}
        {mode === 'register' && (
          <TextInput
            style={s.input}
            placeholder={t('auth.placeholderUsername')}
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={20}
          />
        )}
        <TextInput
          style={s.input}
          placeholder={t('auth.placeholderEmail')}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder={t('auth.placeholderPassword')}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {mode === 'register' && (
          <TextInput
            style={s.input}
            placeholder={t('auth.placeholderPasswordRepeat')}
            placeholderTextColor={colors.textMuted}
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry
          />
        )}

        {/* Beni Hatırla + Şifremi Unuttum */}
        {mode === 'login' && (
          <View style={s.rememberRow}>
            <Pressable style={s.rememberBtn} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[s.checkbox, rememberMe && s.checkboxActive]}>
                {rememberMe && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.rememberText}>{t('auth.rememberMe')}</Text>
            </Pressable>
            <Pressable onPress={handleForgotPassword}>
              <Text style={s.forgotText}>{t('auth.forgotPassword')}</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={[s.btn, s.emailBtn]}
          onPress={handleEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>
              {mode === 'register' ? t('auth.register') : t('auth.login')}
            </Text>
          )}
        </Pressable>

        {error && <Text style={s.errorText}>{error}</Text>}
        {successMsg && <Text style={s.successText}>{successMsg}</Text>}

        {/* Divider + Google */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>{t('auth.divider')}</Text>
          <View style={s.dividerLine} />
        </View>
        <Pressable style={[s.btn, s.googleBtn]} onPress={handleGoogle} disabled={loading}>
          <View style={s.googleRow}>
            <View style={s.googleLogoBox}>
              <Text style={s.googleG}>
                <Text style={{ color: '#4285F4' }}>G</Text>
                <Text style={{ color: '#EA4335' }}>o</Text>
                <Text style={{ color: '#FBBC05' }}>o</Text>
                <Text style={{ color: '#4285F4' }}>g</Text>
                <Text style={{ color: '#34A853' }}>l</Text>
                <Text style={{ color: '#EA4335' }}>e</Text>
              </Text>
            </View>
            <Text style={s.googleBtnText}>{t('auth.googleButton')}</Text>
          </View>
        </Pressable>

      </View>

      <View style={s.langRow}>
        {(Object.keys(LOCALES) as Locale[]).map(l => (
          <Pressable
            key={l}
            style={[s.langBtn, lang === l && s.langBtnActive]}
            onPress={() => { setLocale(l); setLang(l); }}
          >
            <Text style={[s.langBtnText, lang === l && s.langBtnTextActive]}>
              {l.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.version}>{t('auth.version')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  logoBox: { alignItems: 'center', marginBottom: 20, marginTop: -40 },
  logo: { width: 340, height: 250 },
  tagline: {
    color: '#C4A455',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: -10,
    textAlign: 'center',
  },
  formBox: { width: '100%', gap: 10 },
  toggleRow: { flexDirection: 'row', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.panelBorder,
  },
  toggleActive: { backgroundColor: colors.military, borderColor: colors.sand },
  toggleText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 15,
  },
  btn: { paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  emailBtn: { backgroundColor: colors.sand },
  googleBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  googleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  googleLogoBox: {},
  googleG: { fontSize: 18, fontWeight: '700' },
  googleBtnText: { color: '#444', fontSize: 15, fontWeight: '600' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  errorText: { color: colors.danger, fontSize: 12, textAlign: 'center' },
  successText: { color: colors.success, fontSize: 12, textAlign: 'center' },
  rememberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginVertical: 2,
  },
  rememberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 18, height: 18, borderRadius: 3,
    borderWidth: 1.5, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.sand, borderColor: colors.sand },
  checkmark: { color: '#000', fontSize: 12, fontWeight: '900', marginTop: -1 },
  rememberText: { color: colors.textSecondary, fontSize: 12 },
  forgotText: { color: colors.sand, fontSize: 12, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.panelBorder },
  dividerText: { color: colors.textMuted, fontSize: 12 },
  version: { color: colors.textMuted, fontSize: 10, position: 'absolute', bottom: 20 },
  langRow: {
    flexDirection: 'row', gap: 8,
    position: 'absolute', bottom: 38,
  },
  langBtn: {
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 4, borderWidth: 1, borderColor: colors.panelBorder,
  },
  langBtnActive: { borderColor: colors.sand, backgroundColor: colors.military },
  langBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  langBtnTextActive: { color: '#fff' },
});
