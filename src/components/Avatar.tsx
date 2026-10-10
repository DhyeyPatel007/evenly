import { Text, View, StyleSheet } from 'react-native';
import { initials } from '../format';

export function Avatar({
  name,
  color,
  size = 44,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}22`,
          borderColor: `${color}66`,
        },
      ]}
    >
      <Text style={[styles.txt, { fontSize: size * 0.36, color }]}>{initials(name)}</Text>
    </View>
  );
}

export function AvatarStack({ members, size = 34 }: { members: { name: string; color: string }[]; size?: number }) {
  return (
    <View style={styles.stack}>
      {members.slice(0, 4).map((m, i) => (
        <View key={m.name} style={[styles.stackItem, { marginLeft: i === 0 ? 0 : -size * 0.35, zIndex: 10 - i }]}>
          <Avatar name={m.name} color={m.color} size={size} />
        </View>
      ))}
      {members.length > 4 && (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.35 }]}>
          <Text style={styles.moreTxt}>+{members.length - 4}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt: { fontWeight: '800', letterSpacing: 0.5 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderRadius: 999 },
  more: {
    backgroundColor: '#1A2133',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreTxt: { color: '#8E99AD', fontSize: 12, fontWeight: '700' },
});
