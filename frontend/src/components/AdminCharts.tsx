import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { TimeSeriesPoint } from '../services/api';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

// -------------------------------------------------------------
// 1. Time-Series Trend Chart (Requests / Tokens / Cost)
// -------------------------------------------------------------
interface TimeSeriesProps {
  data: TimeSeriesPoint[];
  metric: 'requests' | 'tokens' | 'cost_usd';
  theme: any;
  title: string;
  unit?: string;
  color?: string;
}

export const TimeSeriesTrendChart: React.FC<TimeSeriesProps> = ({
  data,
  metric,
  theme,
  title,
  unit = '',
  color = '#D97706',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>{title}</Text>
        <Text style={{ color: theme.textTertiary, fontSize: 12, marginVertical: 20 }}>No time-series data available.</Text>
      </View>
    );
  }

  const values = data.map((d) => Number(d[metric]) || 0);
  const maxVal = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / data.length;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>{title}</Text>
          <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body, marginTop: 2 }}>
            Total: {metric === 'cost_usd' ? `$${total.toFixed(4)}` : total.toLocaleString()} {unit} • Avg/day: {metric === 'cost_usd' ? `$${avg.toFixed(4)}` : Math.round(avg).toLocaleString()}
          </Text>
        </View>
        {hoveredIdx !== null && (
          <View style={[styles.badge, { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: color }]}>
            <Text style={{ color: color, fontSize: 11, fontFamily: bold }}>
              {data[hoveredIdx].date}: {metric === 'cost_usd' ? `$${Number(data[hoveredIdx][metric]).toFixed(4)}` : Number(data[hoveredIdx][metric]).toLocaleString()} {unit}
            </Text>
          </View>
        )}
      </View>

      {/* Chart Bars */}
      <View style={styles.chartContainer}>
        {data.map((item, idx) => {
          const val = Number(item[metric]) || 0;
          const heightPct = Math.max(8, Math.round((val / maxVal) * 100));
          const isSelected = hoveredIdx === idx;

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => setHoveredIdx(idx)}
              style={styles.barColumn}
            >
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: isSelected ? '#F59E0B' : color,
                      opacity: hoveredIdx === null || isSelected ? 1 : 0.45,
                    },
                  ]}
                />
              </View>
              <Text numberOfLines={1} style={[styles.barDate, { color: isSelected ? theme.accent : theme.textTertiary, fontFamily: body }]}>
                {item.date.split(' ')[1] || item.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// 2. Horizontal Ranked Bar Chart (Characters / Categories / Providers)
// -------------------------------------------------------------
interface RankedBarItem {
  label: string;
  value: number;
  secondaryLabel?: string;
  color?: string;
  icon?: string;
}

interface RankedBarChartProps {
  title: string;
  subtitle?: string;
  items: RankedBarItem[];
  theme: any;
  unit?: string;
  maxItems?: number;
}

export const RankedBarChart: React.FC<RankedBarChartProps> = ({
  title,
  subtitle,
  items,
  theme,
  unit = '',
  maxItems = 8,
}) => {
  const displayItems = items.slice(0, maxItems);
  const maxVal = Math.max(...displayItems.map((i) => i.value), 1);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
      <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>{title}</Text>
      {subtitle && <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, fontFamily: body }}>{subtitle}</Text>}

      {displayItems.length === 0 ? (
        <Text style={{ color: theme.textTertiary, fontSize: 12, marginVertical: 10 }}>No statistics recorded yet.</Text>
      ) : (
        displayItems.map((item, idx) => {
          const widthPct = Math.max(6, Math.min(100, Math.round((item.value / maxVal) * 100)));
          const barColor = item.color || (idx === 0 ? '#D97706' : idx === 1 ? '#3B82F6' : idx === 2 ? '#10B981' : '#8B5CF6');

          return (
            <View key={idx} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {item.icon && <Text style={{ fontSize: 14 }}>{item.icon}</Text>}
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontFamily: bold, flexShrink: 1 }}>
                    {item.label}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: body, marginLeft: 8 }}>
                  {item.value.toLocaleString()} {unit} {item.secondaryLabel ? `(${item.secondaryLabel})` : ''}
                </Text>
              </View>
              <View style={[styles.horizontalTrack, { backgroundColor: theme.inputBg }]}>
                <View style={[styles.horizontalFill, { width: `${widthPct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

// -------------------------------------------------------------
// 3. Distribution Donut / Progress Split (Epics / Status / Tabs)
// -------------------------------------------------------------
interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface DistributionChartProps {
  title: string;
  subtitle?: string;
  items: DistributionItem[];
  theme: any;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  title,
  subtitle,
  items,
  theme,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
      <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>{title}</Text>
      {subtitle && <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, fontFamily: body }}>{subtitle}</Text>}

      {/* Multi-segment Segment Bar */}
      <View style={[styles.multiSegmentBar, { backgroundColor: theme.inputBg }]}>
        {items.map((item, idx) => (
          <View
            key={idx}
            style={{
              width: `${Math.max(0, item.percentage)}%`,
              backgroundColor: item.color,
              height: '100%',
            }}
          />
        ))}
      </View>

      {/* Legend Items */}
      <View style={styles.legendGrid}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontFamily: bold, flex: 1 }}>
              {item.label}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: body }}>
              {item.percentage}% ({item.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// 4. Latency Percentile Gauge Box
// -------------------------------------------------------------
interface LatencyGaugeProps {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  sampleSize: number;
  theme: any;
}

export const LatencyGaugeCard: React.FC<LatencyGaugeProps> = ({
  p50,
  p95,
  p99,
  avg,
  min,
  max,
  sampleSize,
  theme,
}) => {
  const getSpeedQuality = (ms: number) => {
    if (ms < 1000) return { label: '⚡ Ultra Fast', color: '#10B981' };
    if (ms < 2500) return { label: '🟢 Optimal', color: '#3B82F6' };
    if (ms < 4000) return { label: '🟡 Acceptable', color: '#F59E0B' };
    return { label: '🔴 High Latency', color: '#EF4444' };
  };

  const p95Quality = getSpeedQuality(p95);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>⚡ Latency & Speed Matrix</Text>
          <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body, marginTop: 2 }}>
            Sample of {sampleSize} recent production API requests
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${p95Quality.color}20`, borderColor: p95Quality.color }]}>
          <Text style={{ color: p95Quality.color, fontSize: 11, fontFamily: bold }}>{p95Quality.label}</Text>
        </View>
      </View>

      <View style={styles.latencyGrid}>
        <View style={[styles.latencyBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
          <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: bold }}>MEDIAN (p50)</Text>
          <Text style={{ color: '#10B981', fontSize: 18, fontFamily: serif, marginTop: 4 }}>{p50} ms</Text>
        </View>
        <View style={[styles.latencyBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
          <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: bold }}>95th PERCENTILE (p95)</Text>
          <Text style={{ color: '#3B82F6', fontSize: 18, fontFamily: serif, marginTop: 4 }}>{p95} ms</Text>
        </View>
        <View style={[styles.latencyBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
          <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: bold }}>99th PERCENTILE (p99)</Text>
          <Text style={{ color: '#8B5CF6', fontSize: 18, fontFamily: serif, marginTop: 4 }}>{p99} ms</Text>
        </View>
        <View style={[styles.latencyBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
          <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: bold }}>RANGE (MIN - MAX)</Text>
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: bold, marginTop: 6 }}>{min}ms - {max}ms</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barDate: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  horizontalTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalFill: {
    height: '100%',
    borderRadius: 4,
  },
  multiSegmentBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '47%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  latencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  latencyBox: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
