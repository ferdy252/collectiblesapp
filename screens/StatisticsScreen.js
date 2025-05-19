import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createThemedStyles } from '../theme/styled';
import { Typography } from '../theme/styled';
import Toast from 'react-native-toast-message';
import { checkDependencies } from '../utils/dependencyChecker';

// For charts
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

// Check if all required dependencies are available
checkDependencies({ Platform, Dimensions, PieChart, LineChart }, 'StatisticsScreen');

// Add logging to help catch missing imports
console.log('StatisticsScreen: Loading dependencies');

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

const StatisticsScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    categoryBreakdown: [],
    conditionBreakdown: [],
    acquisitionTimeline: [],
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      console.log('Fetching collection statistics...');
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch all items for the current user
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      console.log(`Fetched ${items.length} items for statistics`);
      
      // Process the data for statistics
      processStatistics(items);
      
    } catch (error) {
      console.error('Error fetching statistics:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load statistics',
      });
    } finally {
      setLoading(false);
    }
  };

  const processStatistics = (items) => {
    // Calculate total items
    const totalItems = items.length;
    
    // Calculate total estimated value
    const totalValue = items.reduce((sum, item) => {
      const value = parseFloat(item.estimated_value) || 0;
      return sum + value;
    }, 0);
    
    // Category breakdown
    const categoryMap = {};
    items.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category]++;
    });
    
    const categoryBreakdown = Object.keys(categoryMap).map(category => ({
      name: category,
      count: categoryMap[category],
      color: getRandomColor(category),
      legendFontColor: isDarkMode ? '#FFFFFF' : '#7F7F7F',
      legendFontSize: 12,
    }));
    
    // Condition breakdown
    const conditionMap = {};
    items.forEach(item => {
      const condition = item.condition || 'Unknown';
      if (!conditionMap[condition]) {
        conditionMap[condition] = 0;
      }
      conditionMap[condition]++;
    });
    
    const conditionBreakdown = Object.keys(conditionMap).map(condition => ({
      name: condition,
      count: conditionMap[condition],
      color: getConditionColor(condition),
      legendFontColor: isDarkMode ? '#FFFFFF' : '#7F7F7F',
      legendFontSize: 12,
    }));
    
    // Acquisition timeline (items added per month)
    const timelineMap = {};
    items.forEach(item => {
      if (!item.created_at) return;
      
      const date = new Date(item.created_at);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!timelineMap[monthYear]) {
        timelineMap[monthYear] = 0;
      }
      timelineMap[monthYear]++;
    });
    
    // Sort timeline by date
    const sortedMonths = Object.keys(timelineMap).sort((a, b) => {
      const [monthA, yearA] = a.split('/');
      const [monthB, yearB] = b.split('/');
      return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
    });
    
    // Take only the last 6 months for the chart
    const recentMonths = sortedMonths.slice(-6);
    
    const acquisitionTimeline = {
      labels: recentMonths,
      datasets: [{
        data: recentMonths.map(month => timelineMap[month]),
        color: (opacity = 1) => theme.colors.primary,
        strokeWidth: 2,
      }],
    };
    
    setStats({
      totalItems,
      totalValue,
      categoryBreakdown,
      conditionBreakdown,
      acquisitionTimeline,
    });
  };

  const getRandomColor = (seed) => {
    // Generate a consistent color based on the category name
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#8AC24A', '#FF5252', '#7986CB', '#FFD54F'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getConditionColor = (condition) => {
    const conditionColors = {
      'Mint': '#4CAF50',  // Green
      'Near Mint': '#8BC34A',  // Light Green
      'Excellent': '#CDDC39',  // Lime
      'Good': '#FFEB3B',  // Yellow
      'Fair': '#FFC107',  // Amber
      'Poor': '#FF9800',  // Orange
      'Damaged': '#F44336',  // Red
      'Unknown': '#9E9E9E',  // Grey
    };
    
    return conditionColors[condition] || '#9E9E9E';
  };

  const handleBackTap = () => {
    navigation.goBack();
  };

  const chartConfig = {
    backgroundGradientFrom: isDarkMode ? '#000000' : '#FFFFFF',
    backgroundGradientTo: isDarkMode ? '#000000' : '#FFFFFF',
    color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackTap}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
          </TouchableOpacity>
          <Typography.H3 style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>Collection Statistics</Typography.H3>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Loading statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderBottomColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackTap}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
        </TouchableOpacity>
        <Typography.H3 style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>Collection Statistics</Typography.H3>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#111111' : theme.colors.card }]}>
            <Ionicons name="cube-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.summaryValue, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{stats.totalItems}</Text>
            <Text style={[styles.summaryLabel, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Total Items</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#111111' : theme.colors.card }]}>
            <Ionicons name="cash-outline" size={24} color={theme.colors.success} />
            <Text style={[styles.summaryValue, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>${stats.totalValue.toFixed(2)}</Text>
            <Text style={[styles.summaryLabel, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Est. Value</Text>
          </View>
        </View>
        
        {/* Category Breakdown */}
        {stats.categoryBreakdown.length > 0 ? (
          <View style={styles.chartContainer}>
            <Typography.H3 style={[styles.chartTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Categories</Typography.H3>
            <PieChart
              data={stats.categoryBreakdown}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        ) : (
          <View style={[styles.emptyChart, { backgroundColor: isDarkMode ? '#111111' : theme.colors.card }]}>
            <Ionicons name="pie-chart-outline" size={40} color={isDarkMode ? '#444444' : theme.colors.divider} />
            <Text style={[styles.emptyChartText, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>No category data available</Text>
          </View>
        )}
        
        {/* Condition Breakdown */}
        {stats.conditionBreakdown.length > 0 ? (
          <View style={styles.chartContainer}>
            <Typography.H3 style={[styles.chartTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Conditions</Typography.H3>
            <PieChart
              data={stats.conditionBreakdown}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        ) : (
          <View style={[styles.emptyChart, { backgroundColor: isDarkMode ? '#111111' : theme.colors.card }]}>
            <Ionicons name="pie-chart-outline" size={40} color={isDarkMode ? '#444444' : theme.colors.divider} />
            <Text style={[styles.emptyChartText, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>No condition data available</Text>
          </View>
        )}
        
        {/* Acquisition Timeline */}
        {stats.acquisitionTimeline.labels && stats.acquisitionTimeline.labels.length > 0 ? (
          <View style={styles.chartContainer}>
            <Typography.H3 style={[styles.chartTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Items Added Over Time</Typography.H3>
            <LineChart
              data={stats.acquisitionTimeline}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...chartConfig,
                fillShadowGradient: theme.colors.primary,
                fillShadowGradientOpacity: 0.2,
              }}
              bezier
              style={{
                borderRadius: 16,
              }}
            />
          </View>
        ) : (
          <View style={[styles.emptyChart, { backgroundColor: isDarkMode ? '#111111' : theme.colors.card }]}>
            <Ionicons name="trending-up-outline" size={40} color={isDarkMode ? '#444444' : theme.colors.divider} />
            <Text style={[styles.emptyChartText, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>No timeline data available</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  summaryLabel: {
    fontSize: 14,
  },
  chartContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chartTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyChart: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyChartText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
}));

export default StatisticsScreen;
