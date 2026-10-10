import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, S, SHADOW } from '../theme';

export function Screen({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: pad ? S.md : 0 },
      ]}
    >
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
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
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
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        pressed && { opacity: 0.88 },
        disabled && { opacity: 0.45 },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.btnTxt,
          variant === 'primary' && styles.btnTxtPrimary,
          variant === 'secondary' && styles.btnTxtSecondary,
          variant === 'danger' && styles.btnTxtDanger,
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

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function TextField(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={C.faint}
      style={[styles.input, props.multiline && styles.inputMulti, props.style as TextStyle]}
      {...props}
    />
  );
}

/** Currency amount with tabular numerals — always easy to scan. */
export function Amount({
  children,
  size = 17,
  color = C.text,
  weight = F.bold,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: string;
}) {
  return (
    <Text style={{ fontFamily: weight, fontSize: size, color, fontVariant: ['tabular-nums'] as never }}>
      {children}
    </Text>
  );
}

export function Empty({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
      {action ? <View style={{ marginTop: S.md }}>{action}</View> : null}
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
    gap: S.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: F.extra, color: C.text, fontSize: 22, letterSpacing: -0.4 },
  subtitle: { fontFamily: F.regular, color: C.muted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
    ...SHADOW,
  },
  btn: {
    borderRadius: R.md,
    paddingVertical: 14,
    paddingHorizontal: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: { backgroundColor: C.green },
  btnSecondary: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong },
  btnDanger: { backgroundColor: C.redDim },
  btnTxt: { fontFamily: F.bold, fontSize: 15 },
  btnTxtPrimary: { color: C.white },
  btnTxtSecondary: { color: C.text },
  btnTxtDanger: { color: C.red },
  seg: {
    flexDirection: 'row',
    backgroundColor: C.surface2,
    borderRadius: R.md,
    padding: 4,
    gap: 2,
  },
  segOpt: { flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: 'center' },
  segOptActive: { backgroundColor: C.surface, ...SHADOW },
  segTxt: { fontFamily: F.semi, color: C.muted, fontSize: 13 },
  segTxtActive: { color: C.text },
  fieldLabel: {
    fontFamily: F.semi, color: C.muted, fontSize: 12,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.7,
  },
  fieldHint: { fontFamily: F.regular, color: C.faint, fontSize: 12, marginTop: 6, lineHeight: 17 },
  input: {
    fontFamily: F.medium,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.lineStrong,
    borderRadius: R.md,
    paddingVertical: 12, paddingHorizontal: S.md,
    color: C.text, fontSize: 15,
  },
  inputMulti: { minHeight: 76, textAlignVertical: 'top' },
  empty: { alignItems: 'center', paddingVertical: S.xl, paddingHorizontal: S.lg },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.surface2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: S.md,
  },
  emptyTitle: { fontFamily: F.bold, color: C.text, fontSize: 17, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontFamily: F.regular, color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  divider: { height: 1, backgroundColor: C.line },
});
