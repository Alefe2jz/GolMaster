import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '@/utils/auth/useAuth';

type Mode = 'login' | 'register';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
WebBrowser.maybeCompleteAuthSession();

// Architecture: authentication screen (email/password + Google OAuth entrypoint).
export default function Login() {
  const { signInWithEmail, registerWithEmail, signInWithGoogle, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleEnabled = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_LOGIN === 'true';
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const canUseGoogle =
    googleEnabled && !!googleAndroidClientId && !!googleWebClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    scopes: ['profile', 'email'],
    selectAccount: true,
  });

  const title = useMemo(() => (mode === 'login' ? 'Entrar na conta' : 'Criar conta'), [mode]);
  const actionLabel = useMemo(() => (mode === 'login' ? 'Entrar' : 'Criar conta'), [mode]);

  useEffect(() => {
    if (!response) return;

    const run = async () => {
      if (response.type !== 'success') {
        if (response.type !== 'dismiss') {
          setErrorMessage('Nao foi possivel completar o login com Google.');
        }
        return;
      }

      const idToken =
        response.params?.id_token || response.authentication?.idToken || null;

      if (!idToken) {
        setErrorMessage('Google nao retornou token de autenticacao.');
        return;
      }

      setGoogleLoading(true);
      const result = await signInWithGoogle(idToken);
      setGoogleLoading(false);

      if (!result.ok) {
        setErrorMessage(result.error || 'Falha no login com Google.');
        return;
      }

      router.replace('/(tabs)');
    };

    run();
  }, [response, signInWithGoogle]);

  function validateForm() {
    const emailValue = email.trim().toLowerCase();

    if (mode === 'register' && !name.trim()) {
      return { ok: false, message: 'Informe seu nome.' };
    }

    if (!emailValue || !password.trim()) {
      return { ok: false, message: 'Preencha email e senha.' };
    }

    if (!EMAIL_REGEX.test(emailValue)) {
      return { ok: false, message: 'Email invalido.' };
    }

    if (password.trim().length < 6) {
      return { ok: false, message: 'A senha deve ter ao menos 6 caracteres.' };
    }

    return { ok: true, message: '', emailValue };
  }

  async function handleSubmit() {
    setErrorMessage('');

    const validation = validateForm();
    if (!validation.ok || !validation.emailValue) {
      setErrorMessage(validation.message);
      return;
    }

    const result =
      mode === 'register'
        ? await registerWithEmail(name.trim(), validation.emailValue, password)
        : await signInWithEmail(validation.emailValue, password);

    if (!result.ok) {
      setErrorMessage(result.error || 'Falha na autenticacao.');
      return;
    }

    router.replace('/(tabs)');
  }

  async function handleGoogleSignIn() {
    setErrorMessage('');

    if (!canUseGoogle) {
      setErrorMessage('Google login nao configurado para esta build.');
      return;
    }

    if (!request) {
      setErrorMessage('Inicializacao do Google ainda nao concluida. Tente novamente.');
      return;
    }

    try {
      await promptAsync({ showInRecents: true });
    } catch {
      setErrorMessage('Falha ao abrir autenticacao do Google.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>GolMaster</Text>
          <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>

          {mode === 'register' ? (
            <>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder="Seu nome"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            autoCorrect={false}
            placeholder="seu@email.com"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Sua senha"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Carregando...' : actionLabel}
            </Text>
          </Pressable>

          {googleEnabled ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.divider} />
              </View>
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={loading || googleLoading || !canUseGoogle || !request}
                style={({ pressed }) => [
                  styles.googleButton,
                  (pressed || loading || googleLoading || !canUseGoogle || !request) &&
                    styles.buttonDisabled,
                ]}
              >
                <Text style={styles.googleButtonText}>
                  {googleLoading ? 'Conectando com Google...' : 'Entrar com Google'}
                </Text>
              </Pressable>
              {!canUseGoogle ? (
                <Text style={styles.warningText}>
                  Configure EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID e EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
                </Text>
              ) : null}
            </>
          ) : null}

          {mode === 'login' ? (
            <Pressable onPress={() => setErrorMessage('Recuperacao de senha ainda nao habilitada.')}>
              <Text style={styles.linkText}>Esqueci minha senha</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              setErrorMessage('');
              setMode((prev) => (prev === 'login' ? 'register' : 'login'));
            }}
          >
            <Text style={styles.linkText}>
              {mode === 'login'
                ? 'Nao tem conta? Crie agora'
                : 'Ja tem conta? Entre aqui'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  brand: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 14,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  errorText: {
    marginTop: 10,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: '#166534',
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 12,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  linkText: {
    marginTop: 13,
    textAlign: 'center',
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  warningText: {
    marginTop: 8,
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
  },
});
