import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, F, S } from '../theme';
import { inr } from '../format';
import { Amount } from './ui';

export interface DonutSeg {
  value: number;
  color: string;
  label: string;
}

export function DonutChart({ segments, size = 160, thickness = 24 }: { segments: DonutSeg[]; size?: number; thickness?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const arcs = segments.map((s, i) => ({
    ...s,
    start: segments.slice(0, i).reduce((a, b) => a + b.value, 0),
  }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.surface2} strokeWidth={thickness} fill="none" />
        {arcs.map((s, i) => {
          const frac = total > 0 ? s.value / total : 0;
          const rot = -90 + (s.start / Math.max(total, 1)) * 360;
          if (frac <= 0) return null;
          return (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${Math.max(frac * circ - 3, 1)} ${circ}`}
              rotation={rot}
              origin={`${size / 2}, ${size / 2}`}
            />
          );
        })}
      </Svg>
      <View style={styles.donutCenter}>
        <Amount size={20} weight={F.extra}>{inr(total)}</Amount>
        <Text style={styles.donutLabel}>total split</Text>
      </View>
    </View>
  );
}

export function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }]} />
      </View>
      <Amount size={13} color={C.muted}>{inr(value)}</Amount>
    </View>
  );
}

const styles = StyleSheet.create({
  donutCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  donutLabel: { color: C.faint, fontSize: 11, fontFamily: F.medium, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.sm },
  barLabel: { color: C.text, fontSize: 13, fontFamily: F.semi, width: 78 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});
