/**
 * Login screen — Google Sign-In + Email/Password.
 * Premium design with animated background and gradient buttons.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius, typography, shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/auth-store';
import { authApi } from '../../src/lib/api-client';
import { useAlert } from '../../src/components/AlertProvider';

type AuthMode = 'login' | 'register';

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const { setAuth, setLoading, setError } = useAuthStore();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLocalLoading] = useState(false);

  // ── Google Sign-In ──────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setLocalLoading(true);
    try {
      // In production, use @react-native-google-signin/google-signin
      // const { idToken } = await GoogleSignin.signIn();
      // const response = await authApi.googleAuth(idToken);
      showAlert(
        'Google Sign-In',
        'Google Sign-In requires a configured Google Cloud project.\n\nPlease set up your Google Cloud credentials in the .env file.'
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'Google Sign-In failed');
    } finally {
      setLocalLoading(false);
    }
  };

  // ── Email/Password ──────────────────────────────────────────────

  const handleEmailAuth = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    if (mode === 'register' && !displayName) {
      showAlert('Error', 'Please enter your name');
      return;
    }

    setLocalLoading(true);
    try {
      const response =
        mode === 'login'
          ? await authApi.login(email, password)
          : await authApi.register(email, password, displayName);

      await setAuth(
        {
          id: response.user.id,
          email: response.user.email,
          displayName: response.user.display_name,
          avatarUrl: response.user.avatar_url,
          googleConnected: response.user.google_connected,
          emailVerified: response.user.email_verified,
          autoBackupEnabled: response.user.auto_backup_enabled,
          backupFrequency: response.user.backup_frequency,
          lastBackupAt: response.user.last_backup_at,
          createdAt: response.user.created_at,
        },
        {
          accessToken: response.tokens.access_token,
          refreshToken: response.tokens.refresh_token,
          expiresIn: response.tokens.expires_in,
        }
      );
    } catch (e: any) {
      showAlert('Error', e.detail || 'Authentication failed');
    } finally {
      setLocalLoading(false);
    }
  };

  // ── Guest Mode ──────────────────────────────────────────────────

  const handleGuestLogin = async () => {
    setLocalLoading(true);
    try {
      await setAuth(
        {
          id: 'guest_user',
          email: 'guest@example.com',
          displayName: 'Guest User',
          avatarUrl: null,
          googleConnected: false,
          emailVerified: false,
          autoBackupEnabled: false,
          backupFrequency: 'manual',
          lastBackupAt: null,
          createdAt: new Date().toISOString(),
        },
        {
          accessToken: 'guest_token',
          refreshToken: 'guest_refresh',
          expiresIn: 3600,
        }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="document-text" size={64} color={theme.colors.primary} style={{ marginBottom: spacing.md }} />
          <Text style={[styles.appName, { color: theme.colors.text }]}>
            Notes
          </Text>
          <Text
            style={[styles.tagline, { color: theme.colors.textSecondary }]}
          >
            Your thoughts, beautifully organized
          </Text>
        </View>

        {/* Google Sign-In Button */}
        <View>
          <Pressable
            style={[
              styles.googleButton,
              {
                backgroundColor: isDark ? '#4285F420' : '#FFFFFF',
                borderColor: isDark ? '#4285F440' : '#DADCE0',
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text
              style={[
                styles.googleText,
                { color: isDark ? '#E8EAED' : '#3C4043' },
              ]}
            >
              Continue with Google
            </Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View
            style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
          />
          <Text style={[styles.dividerText, { color: theme.colors.textTertiary }]}>
            or
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
          />
        </View>

        {/* Email/Password Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.searchBar,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textTertiary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.searchBar,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.searchBar,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={theme.colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitText, { color: theme.colors.buttonPrimaryText }]}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Toggle Mode */}
        <View>
          <Pressable
            style={styles.toggleMode}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={[styles.toggleText, { color: theme.colors.textSecondary }]}>
              {mode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}
            </Text>
            <Text style={[styles.toggleLink, { color: theme.colors.primary }]}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Pressable>

          {/* Guest Mode */}
          <Pressable
            style={{ marginTop: spacing.xl, alignItems: 'center' }}
            onPress={handleGuestLogin}
            disabled={loading}
          >
            <Text style={[styles.toggleLink, { color: theme.colors.textSecondary, textDecorationLine: 'underline' }]}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  appName: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.sizes.base,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    ...shadows.sm,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: spacing.md,
  },
  googleText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: {
    marginHorizontal: spacing.base,
    fontSize: typography.sizes.sm,
  },
  form: { gap: spacing.md },
  input: {
    height: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    fontSize: typography.sizes.base,
    borderWidth: 1,
  },
  submitButton: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  toggleMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  toggleText: { fontSize: typography.sizes.sm },
  toggleLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
