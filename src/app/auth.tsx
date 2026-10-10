import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useAuth } from '@/auth';
import { Screen, Card, Field, TextField, Btn } from '@/components/ui';
import { C, F, S } from '@/theme';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'up' && !name.trim()) {
      setError('Tell us your name.');
      return;
    }
    setBusy(true);
    try {
      const err =
        mode === 'up' ? await signUp(email, password, name) : await signIn(email, password);
      if (err) setError(err);
      // On success the app gate redirects automatically via the session.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.kicker}>Evenly</Text>
        <Text style={styles.title}>{mode === 'in' ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={styles.sub}>
          Sign in so payment claims sync securely between members — only the intended recipient
          can confirm a payment.
        </Text>
        <Card>
          <View style={styles.form}>
            {mode === 'up' ? (
              <Field label="Your name">
                <TextField
                  placeholder="Aarav Mehta"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!busy}
                />
              </Field>
            ) : null}
            <Field label="Email">
              <TextField
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            </Field>
            <Field label="Password">
              <TextField
                placeholder={mode === 'up' ? 'Min 6 characters' : 'Your password'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            </Field>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Btn
              label={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
              onPress={submit}
              disabled={busy}
            />
          </View>
        </Card>
        <Pressable
          onPress={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError('');
          }}
          style={styles.switch}
        >
          <Text style={styles.switchTxt}>
            {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: S.md, paddingVertical: S.xl },
  kicker: { fontFamily: F.bold, fontSize: 13, color: C.greenStrong, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: F.bold, fontSize: 28, color: C.text },
  sub: { fontFamily: F.regular, fontSize: 14, color: C.muted, lineHeight: 21 },
  form: { gap: S.md },
  error: { fontFamily: F.medium, fontSize: 13, color: C.red },
  switch: { alignItems: 'center', padding: S.sm },
  switchTxt: { fontFamily: F.semi, fontSize: 14, color: C.greenStrong },
});
