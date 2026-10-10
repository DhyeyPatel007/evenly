import { Text, View, StyleSheet } from 'react-native';
import { initials } from '../format';
import { avatarColors, F } from '../theme';

export function Avatar({
  name,
  colorIdx,
  size = 44,
}: {
  name: string;
  colorIdx: number;
  size?: number;
}) {
  const { bg, fg } = avatarColors(colorIdx);
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.txt, { fontSize: size * 0.36, color: fg }]}>{initials(name)}</Text>
    </View>
  );
}

export function AvatarStack({
  members,
  size = 32,
}: {
  members: { name: string; colorIdx: number }[];
  size?: number;
}) {
  return (
    <View style={styles.stack}>
      {members.slice(0, 4).map((m, i) => (
        <View
          key={`${m.name}-${i}`}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.32,
            zIndex: 10 - i,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        >
          <Avatar name={m.name} colorIdx={m.colorIdx} size={size} />
        </View>
      ))}
      {members.length > 4 && (
        <View
          style={[
            styles.more,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.32 },
          ]}
        >
          <Text style={styles.moreTxt}>+{members.length - 4}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  txt: { fontFamily: F.bold, letterSpacing: 0.4 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  more: {
    backgroundColor: '#EDF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreTxt: { color: '#5B6875', fontSize: 11, fontFamily: F.bold },
});
