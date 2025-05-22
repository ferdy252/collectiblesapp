import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { createThemedStyles } from '../../theme/styled';
import { useHomeData } from './hooks/useHomeData';

// Import components
import HomeHeader from './components/HomeHeader';
import StatsCard from './components/StatsCard';
import RecentItems from './components/RecentItems';
import QuickActions from './components/QuickActions';
import NotificationsPopup from './components/NotificationsPopup';

function HomeScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const scrollY = new Animated.Value(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use the custom hook to manage all data fetching and state
  const { 
    recentItems, 
    stats, 
    loading, 
    notifications,
    unreadCount,
    showNotifications,
    setShowNotifications,
    notificationRef,
    notificationPosition,
    setNotificationPosition,
    fetchData,
    handleNotificationAction,
    markNotificationAsRead
  } = useHomeData(user);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Calculate header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      
      {/* Modern Header with Gradient */}
      <HomeHeader 
        user={user}
        headerOpacity={headerOpacity} 
        navigation={navigation}
        notificationRef={notificationRef}
        unreadCount={unreadCount}
        onNotificationPress={() => {
          if (notificationRef.current) {
            notificationRef.current.measure((x, y, width, height, pageX, pageY) => {
              setNotificationPosition({
                top: pageY + height + 5,
                right: width + 10,
              });
              setShowNotifications(!showNotifications);
            });
          }
        }}
      />

      {/* Notifications Popup */}
      {showNotifications && (
        <NotificationsPopup
          notifications={notifications}
          position={notificationPosition}
          onClose={() => setShowNotifications(false)}
          onNotificationPress={handleNotificationAction}
          markAsRead={markNotificationAsRead}
          navigation={navigation}
        />
      )}

      <Animated.ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.colors.background }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.background}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Stats Card */}
        <View style={styles.section}>
          <StatsCard 
            stats={stats} 
            loading={loading} 
            navigation={navigation} 
          />
        </View>

        {/* Recent Items Section */}
        <View style={styles.section}>
          <RecentItems 
            recentItems={recentItems} 
            loading={loading} 
            navigation={navigation} 
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <QuickActions navigation={navigation} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
}));

export default HomeScreen;
