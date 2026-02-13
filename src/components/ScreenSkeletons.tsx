import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonView from './SkeletonView';

/**
 * Profile Screen Skeleton
 * Matches ProfileScreen layout
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.profileSection}>
        <SkeletonView width={120} height={120} borderRadius={60} />
        <SkeletonView width={150} height={24} borderRadius={8} style={styles.nameSkeleton} />
      </View>

      {/* Stats Section */}
      <View style={styles.statsRow}>
        <SkeletonView width={100} height={60} borderRadius={12} />
        <SkeletonView width={100} height={60} borderRadius={12} />
        <SkeletonView width={100} height={60} borderRadius={12} />
      </View>

      {/* Info Cards */}
      {[1, 2, 3, 4].map((_, index) => (
        <View key={index} style={styles.card}>
          <SkeletonView width={120} height={20} borderRadius={6} />
          <SkeletonView width="100%" height={16} borderRadius={4} style={styles.cardLine} />
          <SkeletonView width="80%" height={16} borderRadius={4} style={styles.cardLine} />
        </View>
      ))}
    </View>
  );
};

/**
 * Chat Screen Skeleton
 * Matches ChatScreen message layout
 */
export const ChatSkeleton: React.FC = () => {
  return (
    <View style={styles.chatContainer}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <SkeletonView width={100} height={40} borderRadius={8} />
        <SkeletonView width={180} height={24} borderRadius={6} />
        <SkeletonView width={80} height={40} borderRadius={8} />
      </View>

      {/* Messages */}
      {[1, 2, 3, 4, 5].map((_, index) => (
        <View key={index} style={index % 2 === 0 ? styles.userMessage : styles.botMessage}>
          <SkeletonView
            width={index % 2 === 0 ? 200 : 250}
            height={60}
            borderRadius={18}
          />
        </View>
      ))}
    </View>
  );
};

/**
 * Home Screen Skeleton
 * Matches HomeScreen layout
 */
export const HomeSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <SkeletonView width={200} height={32} borderRadius={8} />
        <SkeletonView width={150} height={20} borderRadius={6} style={styles.subtitle} />
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <SkeletonView width="48%" height={100} borderRadius={16} />
        <SkeletonView width="48%" height={100} borderRadius={16} />
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <SkeletonView width={140} height={24} borderRadius={8} />
        {[1, 2, 3].map((_, index) => (
          <SkeletonView key={index} width="100%" height={80} borderRadius={12} style={styles.activityItem} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  nameSkeleton: {
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardLine: {
    marginTop: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  userMessage: {
    alignItems: 'flex-end',
    marginVertical: 8,
    paddingHorizontal: 15,
  },
  botMessage: {
    alignItems: 'flex-start',
    marginVertical: 8,
    paddingHorizontal: 15,
  },
  chartSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginVertical: 16,
    elevation: 2,
  },
  chart: {
    marginTop: 16,
  },
  timeline: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  timelineItem: {
    marginTop: 12,
  },
  greetingSection: {
    marginVertical: 24,
  },
  subtitle: {
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  activitySection: {
    marginTop: 24,
  },
  activityItem: {
    marginTop: 12,
  },
});
