import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/utils/auth/useAuth';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { signInWithEmail, registerWithEmail, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [errorMessage, setErrorMessage] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        signInWithGoogle(idToken).then((ok) => {
          if (ok) {
            router.back();
          } else {
            alert('Erro ao fazer login com Google');
          }
        });
      }
    }
  }, [response, signInWithGoogle]);

  async function handleLogin() {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Preencha email e senha.');
      return;
    }

    const emailValue = email.trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (!emailOk) {
      setErrorMessage('Email inválido.');
      return;
    }

    if (password.trim().length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Preencha seu nome.');
      return;
    }

    const success =
      mode === 'register'
        ? await registerWithEmail(
            name.trim(),
            emailValue,
            password,
          )
        : await signInWithEmail(emailValue, password);

    if (success) {
      router.back();
    } else {
      setErrorMessage(
        mode === 'register'
          ? 'Erro ao criar conta. Verifique seus dados.'
          : 'Email ou senha incorretos.',
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>⚽ GolMaster</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>
      </View>

      <View style={styles.card}>
        {mode === 'register' && (
          <>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Seu nome"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="seu@email.com"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Sua senha"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {loading
              ? mode === 'register'
                ? 'Cadastrando...'
                : 'Entrando...'
              : mode === 'register'
                ? 'Criar conta'
                : 'Entrar'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          onPress={() => promptAsync()}
          disabled={!request || loading}
          style={[
            styles.googleButton,
            (!request || loading) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.googleButtonText}>Entrar com Google</Text>
        </TouchableOpacity>

        {mode === 'login' && (
          <TouchableOpacity
            onPress={() =>
              setErrorMessage(
                'Recuperação de senha ainda não habilitada. Use o cadastro ou Google.',
              )
            }
            style={styles.linkButton}
          >
            <Text style={styles.linkButtonText}>Esqueci minha senha</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={styles.linkButton}
        >
          <Text style={styles.linkButtonText}>
            {mode === 'login'
              ? 'Nao tem conta? Cadastre-se'
              : 'Ja tem conta? Fazer login'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helperText}>
        Use seu Google para acessar rapidamente.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#15803D',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    marginTop: 4,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
  },
});
