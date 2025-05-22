import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, Card, createThemedStyles } from '../../../theme/styled';
import Shimmer from './Shimmer';

const StatsCard = ({ stats, loading, navigation }) => {
  const { theme } = useTheme();

  // Render skeleton for stats card when loading
  if (loading) {
    return (
      <Card.Primary style={styles.statsCard}>
        <LinearGradient
          colors={theme.isDarkMode ? ['#1A237E', '#311B92'] : ['#3949AB', '#5E35B1']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.cardGradient}
        >
          <View style={styles.statsHeader}>
            <Shimmer width={150} height={20} style={{ marginBottom: 15, borderRadius: 4 }} />
            <Shimmer width={40} height={24} style={{ marginBottom: 6, borderRadius: 4 }} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Shimmer width={40} height={24} style={{ marginBottom: 6, borderRadius: 4 }} />
              <Shimmer width={80} height={16} style={{ borderRadius: 4 }} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Shimmer width={120} height={24} style={{ marginBottom: 6, borderRadius: 4 }} />
              <Shimmer width={80} height={16} style={{ borderRadius: 4 }} />
            </View>
          </View>
        </LinearGradient>
      </Card.Primary>
    );
  }

  return (
    <Card.Primary style={styles.statsCard}>
      <LinearGradient
        colors={theme.isDarkMode ? ['#1A237E', '#311B92'] : ['#3949AB', '#5E35B1']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.cardGradient}
      >
        <View style={styles.statsHeader}>
          <Typography.H3 style={[styles.statsTitle, { color: '#FFFFFF' }]}>Collection Overview</Typography.H3>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Statistics')}
            style={styles.statsChartButton}
          >
            <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Typography.H2 style={[styles.statNumber, { color: '#FFFFFF' }]}>{stats.totalItems}</Typography.H2>
            <Typography.BodySmall style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Total Items</Typography.BodySmall>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Typography.H3 style={[styles.statHighlight, { color: '#FFFFFF' }]}>{stats.mostValuable}</Typography.H3>
            <Typography.BodySmall style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Most Valuable</Typography.BodySmall>
          </View>
        </View>
      </LinearGradient>
    </Card.Primary>
  );
};

const styles = createThemedStyles((theme) => ({
  statsCard: {
    marginBottom: 0,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    padding: 0,
  },
  cardGradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.bold,
  },
  statsChartButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.round,
    padding: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    height: 40,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: theme.spacing.md,
  },
  statNumber: {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  statHighlight: {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
}));

export default StatsCard;
