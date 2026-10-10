import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvenly } from '@/store';
import { C, F, S } from '@/theme';
import { Btn, Field, Screen, TextField } from '@/components/ui';

export default function Onboarding() {
  const { ready, onboarded, completeOnboarding } = useEvenly();
  const [name, setName] = useState('');

  useEffect(() => {
    if (ready && onboarded) router.replace('/');
  }, [ready, onboarded]);

  const done = () => {
    if (!name.trim()) return;
    completeOnboarding(name.trim());
    router.replace('/');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.mark}>
          <Ionicons name="calculator" size={34} color={C.white} />
        </View>
        <Text style={styles.title}>Welcome to Evenly</Text>
        <Text style={styles.sub}>
          Split bills with friends, roommates and travel buddies — and settle up in the fewest
          payments possible.
        </Text>
        <View style={{ height: S.lg }} />
        <Field label="What should we call you?">
          <TextField
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={done}
          />
        </Field>
        <View style={{ height: S.md }} />
        <Btn label="Get started" onPress={done} disabled={!name.trim()} />
        <Text style={styles.note}>Your data stays on this device. No account needed.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  mark: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: S.lg,
  },
  title: { fontFamily: F.extra, fontSize: 28, color: C.text, letterSpacing: -0.6, marginBottom: 8 },
  sub: { fontFamily: F.regular, fontSize: 15, color: C.muted, lineHeight: 22 },
  note: { fontFamily: F.regular, fontSize: 12, color: C.faint, textAlign: 'center', marginTop: S.md },
});
