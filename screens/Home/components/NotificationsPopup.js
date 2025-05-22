import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, createThemedStyles } from '../../../theme/styled';
import { formatRelativeTime } from '../utils/formatters';
import { getIconForType, getColorForType } from '../utils/notificationUtils';

const NotificationsPopup = ({ notifications, position, onClose, onNotificationPress, markAsRead, navigation }) => {
  const { theme, isDarkMode } = useTheme();

  const handleNotificationAction = (notification) => {
    const { action, actionData } = onNotificationPress(notification);
    
    // Handle different actions based on notification type
    switch (action) {
      case 'feature':
        // For feature announcements, we could show a modal or navigate to a specific screen
        if (actionData.feature === 'barcode') {
          // Navigate to barcode scanner
          navigation.navigate('BarcodeScanner');
        }
        break;
        
      case 'item':
        // Navigate to the item detail
        if (actionData.itemId) {
          navigation.navigate('ItemDetail', { itemId: actionData.itemId });
        }
        break;
        
      case 'collection':
        // Navigate to a specific collection
        if (actionData.collectionId) {
          navigation.navigate('Collections', { screen: 'CollectionItems', params: { collectionId: actionData.collectionId } });
        }
        break;
        
      case 'post':
        // Navigate to a specific post in the feed
        if (actionData.postId) {
          navigation.navigate('Feed', { screen: 'FeedMain', params: { highlightPostId: actionData.postId } });
        }
        break;
        
      case 'settings':
        // Navigate to settings, possibly to a specific section
        navigation.navigate('Profile', { 
          screen: 'Settings', 
          params: actionData.section ? { section: actionData.section } : undefined 
        });
        break;
        
      case 'add':
        // Navigate to add item screen
        navigation.navigate('Add');
        break;
        
      default:
        // For notifications without a specific action, navigate to the notifications screen
        navigation.navigate('Notifications', { highlightId: notification.id });
        break;
    }
  };

  return (
    <View 
      style={[
        styles.notificationsPopup, 
        { 
          top: position.top,
          right: 20,
        }
      ]}
    >
      <View style={styles.notificationsHeader}>
        <Typography.Body style={[styles.notificationsTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
          Notifications
        </Typography.Body>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.notificationsList}>
        {notifications.length > 0 ? (
          <>
            {notifications.slice(0, 3).map((notification) => (
              <TouchableOpacity 
                key={notification.id}
                style={[styles.notificationItem, { backgroundColor: notification.read ? 'transparent' : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                onPress={() => handleNotificationAction(notification)}
              >
                <View style={[styles.notificationIcon, { backgroundColor: getColorForType(notification.type, theme) }]}>
                  <Ionicons name={getIconForType(notification.type)} size={16} color="#FFFFFF" />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationItemHeader}>
                    <Typography.BodySmall style={[styles.notificationItemTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
                      {notification.title}
                    </Typography.BodySmall>
                    <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
                      {formatRelativeTime(notification.created_at)}
                    </Typography.Caption>
                  </View>
                  <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
                    {notification.message}
                  </Typography.Caption>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
            
            {notifications.length > 3 && (
              <TouchableOpacity 
                style={styles.seeMoreButton}
                onPress={() => {
                  onClose();
                  navigation.navigate('Notifications');
                }}
              >
                <Typography.BodySmall style={{ color: theme.colors.primary }}>
                  See all {notifications.length} notifications
                </Typography.BodySmall>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyNotifications}>
            <Ionicons name="notifications-off" size={40} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
            <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
              No notifications yet
            </Typography.BodySmall>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = createThemedStyles((theme) => {
  const platformSpecificStyles =
    Platform && Platform.OS
      ? Platform.select({
          ios: {
            shadowColor: theme.colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
            shadowRadius: 8,
          },
          android: {
            elevation: 5,
          },
          default: { 
            elevation: 3, 
          },
        })
      : { 
          elevation: 3, 
        };

  return {
    notificationsPopup: {
      position: 'absolute',
      width: 300,
      maxHeight: 400,
      backgroundColor: theme.colors.background, 
      borderRadius: theme.borderRadius.lg,
      ...platformSpecificStyles, 
      zIndex: 1000,
    },
    notificationsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.colors.divider,
    },
    notificationsTitle: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    notificationsList: {
      maxHeight: 350,
    },
    notificationItem: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.colors.divider,
      position: 'relative',
    },
    notificationIcon: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    notificationContent: {
      flex: 1,
    },
    notificationItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    notificationItemTitle: {
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    unreadDot: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    emptyNotifications: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    seeMoreButton: {
      alignItems: 'center',
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.colors.divider,
    },
  };
});

export default NotificationsPopup;
