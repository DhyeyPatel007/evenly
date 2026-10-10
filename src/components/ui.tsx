import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C, R, S } from '../theme';

export function Screen({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: pad ? S.md : 0 }]}>
      {children}
    </View>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack && (
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backTxt}>‹</Text>
          </Pressable>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[
          styles.btnTxt,
          variant === 'primary' && styles.btnTxtPrimary,
          variant === 'ghost' && styles.btnTxtGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segOpt, active && styles.segOptActive]}
          >
            <Text style={[styles.segTxt, active && styles.segTxtActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: S.sm,
    marginBottom: S.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: { color: C.text, fontSize: 26, fontWeight: '600', marginTop: -4 },
  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
  },
  btn: {
    borderRadius: R.md,
    paddingVertical: 15,
    paddingHorizontal: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: C.brand },
  btnGhost: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  btnDanger: { backgroundColor: C.downDim, borderWidth: 1, borderColor: 'rgba(251,113,133,0.35)' },
  btnTxt: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  btnTxtPrimary: { color: C.brandInk },
  btnTxtGhost: { color: C.text },
  seg: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    padding: 4,
    gap: 2,
  },
  segOpt: { flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: 'center' },
  segOptActive: { backgroundColor: C.surface3 },
  segTxt: { color: C.muted, fontSize: 13, fontWeight: '700' },
  segTxtActive: { color: C.text },
  empty: { alignItems: 'center', paddingVertical: S.xl },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: S.sm },
});
