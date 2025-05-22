import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, createThemedStyles } from '../../../theme/styled';

const HomeHeader = ({ user, headerOpacity, navigation, notificationRef, unreadCount, onNotificationPress }) => {
  const { theme, isDarkMode } = useTheme();

  const handleSearchTap = () => {
    console.log('Home search icon tapped, navigating to Search');
    navigation.navigate('Search'); // Navigate to Search screen
  };

  return (
    <Animated.View style={[styles.headerContainer, { opacity: headerOpacity, backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Typography.H2 style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
              Hello, {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Collector'}!
            </Typography.H2>
            <Typography.Body style={[styles.subtitle, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>
              Track your collectibles and discover new ones
            </Typography.Body>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: theme.colors.background }]}
              onPress={handleSearchTap}
            >
              <Ionicons name="search" size={22} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              ref={notificationRef}
              style={[styles.notificationButton, { backgroundColor: theme.colors.background }]}
              onPress={onNotificationPress}
            >
              <Ionicons name="notifications-outline" size={22} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: theme.colors.like }]}>
                  {unreadCount > 9 ? (
                    <Text style={styles.badgeText}>9+</Text>
                  ) : unreadCount > 0 ? (
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = createThemedStyles((theme) => ({
  headerContainer: {
    width: '100%',
    zIndex: 10,
    backgroundColor: theme.colors.background,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerGradient: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
  },
  headerTitle: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  searchButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.round,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.round,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5252',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
}));

export default HomeHeader;
