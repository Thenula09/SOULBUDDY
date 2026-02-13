import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { getMoodTimelineToday } from '../services/moodService';

type MoodEntry = {
  period_5_min: string;
  emotion: string;
  intensity: number;  // Changed from emotion_score
  ts: string;
  lifestyle?: {
    sleep?: number;
    exercise?: number;
    diet?: string;
    water?: number;
    [key: string]: any;
  };
};

const EMOTION_COLORS: { [key: string]: string } = {
  happy: '#4CAF50',
  sad: '#2196F3',
  angry: '#F44336',
  neutral: '#9E9E9E',
  fear: '#9C27B0',
  surprised: '#FF9800',
  disgust: '#795548',
};
const DEFAULT_EMOTION_COLOR = '#9E9E9E';
const toEmotionKey = (s?: string) => (s && typeof s === 'string' ? s.toLowerCase() : 'neutral');

type MoodTimelineChartProps = {
  onIntervalChange?: (minutes: number) => void;
};

export default function MoodTimelineChart({ onIntervalChange }: MoodTimelineChartProps) {
  const [timeline, setTimeline] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(15);

  const loadTimeline = useCallback(async () => {
    try {
      const data = await getMoodTimelineToday();
      setTimeline(data);

      // Detect interval: prefer period_5_min, fall back to period_15_min
      if (Array.isArray(data) && data.length > 0) {
        const sample = data.find(Boolean);
        if (sample && 'period_5_min' in sample) {
          setIntervalMinutes(5);
          onIntervalChange && onIntervalChange(5);
        } else if (sample && 'period_15_min' in sample) {
          setIntervalMinutes(15);
          onIntervalChange && onIntervalChange(15);
        } else {
          // default to 15 if unknown
          setIntervalMinutes(15);
          onIntervalChange && onIntervalChange(15);
        }
      }
    } catch (error) {
      console.error('Error loading mood timeline:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onIntervalChange]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTimeline();
  };

  const formatTime = (value?: string) => {
    if (!value) return '';

    // If it's already an ISO or numeric timestamp parseable by Date, format it.
    const maybeNum = Number(value);
    const tryDate = !isNaN(maybeNum) ? new Date(maybeNum) : new Date(value);
    if (!isNaN(tryDate.getTime())) {
      return tryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // If value already looks like a HH:MM string (e.g. '03:30 PM' or '15:30'), return as-is.
    if (/\d{1,2}:\d{2}/.test(value)) return value;

    return '';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>මූඩ් Timeline - අද</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (timeline.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>මූඩ් Timeline - අද</Text>
        <Text style={styles.emptyText}>
          තවම mood data නැහැ. Chat කරන කොට auto-save වෙයි! 💬✨
        </Text>
      </View>
    );
  }

  const maxScore = 10;
  const chartHeight = 200;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>මූඩ් Timeline - දවස පුරාම 📊</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.chartScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.chartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            {[10, 8, 6, 4, 2, 0].map((val) => (
              <Text key={val} style={styles.yLabel}>
                {val}
              </Text>
            ))}
          </View>

          {/* Chart bars */}
          <View style={styles.barsContainer}>
            {timeline.map((entry, index) => {
              const barHeight = (entry.intensity / maxScore) * chartHeight;  // Use intensity
              const color = EMOTION_COLORS[toEmotionKey(entry.emotion)] || DEFAULT_EMOTION_COLOR;

              // For 5-minute interval show the time label for each bar; for 15-minute show every 4th label
              const showLabel = intervalMinutes === 5 ? true : index % 4 === 0;

              const barWidth = intervalMinutes === 5 ? 12 : 30;

              // compute wrapper width and margin so dense 5-min bars fit better
              const wrapperWidth = intervalMinutes === 5 ? barWidth + 8 : barWidth + 16;
              const wrapperMargin = intervalMinutes === 5 ? 4 : 8;
              const timeWidth = intervalMinutes === 5 ? 36 : 50;

              // Use period_5_min for accurate time display on chart
              const displayTime = entry.period_5_min || entry.ts;

              // validate emotion — show it only for known emotions; otherwise show time below the bar
              const knownEmotions = new Set(['happy','sad','angry','stress','neutral','fear','surprised','disgust']);
              const emotionKey = toEmotionKey(entry.emotion);
              const showEmotion = emotionKey && knownEmotions.has(emotionKey);

              const emotionText = showEmotion
                ? <Text>{entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1)}</Text>
                : <Text>{formatTime(displayTime)}</Text>;

              return (
                <View key={index} style={[styles.barWrapper, { width: wrapperWidth, marginHorizontal: wrapperMargin }]}>
                  <View style={styles.barColumn}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: color,
                          width: barWidth,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.timeLabel, { width: timeWidth }]}>{showLabel ? formatTime(displayTime) : ''}</Text>
                  <Text style={styles.emotionLabel}>{emotionText}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
          <View key={emotion} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{emotion}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  chartScroll: {
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 250,
    paddingBottom: 50,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 8,
    height: 200,
  },
  yLabel: {
    fontSize: 10,
    color: '#666',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
  },
  barWrapper: {
    marginHorizontal: 8,
    alignItems: 'center',
  },
  barColumn: {
    height: 200,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 30,
    borderRadius: 4,
  },
  timeLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 4,
    transform: [{ rotate: '-45deg' }],
    width: 50,
  },
  emotionLabel: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
});
