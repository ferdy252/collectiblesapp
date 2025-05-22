import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, Button, Card, createThemedStyles } from '../../../theme/styled';
import { formatDate } from '../utils/formatters';
import Shimmer from './Shimmer';

const RecentItems = ({ recentItems, loading, navigation }) => {
  const { theme, isDarkMode } = useTheme();

  // Function to get image URL or placeholder
  const getImageUrl = (item) => {
    if (item.photos && item.photos.length > 0) {
      return item.photos[0]; // Use the first photo
    }
    return `https://via.placeholder.com/100?text=${encodeURIComponent(item.name)}`;
  };

  // Render skeleton loaders for recent items
  const renderRecentItemsSkeleton = () => {
    return (
      <View style={styles.recentItem}>
        <Shimmer 
          width={styles.itemImage.width} 
          height={styles.itemImage.height} 
          style={styles.itemImage} 
        />
        <View style={styles.itemDetails}>
          <Shimmer width={120} height={18} style={{ marginBottom: 6, borderRadius: 4 }} />
          <Shimmer width={80} height={14} style={{ marginBottom: 6, borderRadius: 4 }} />
          <Shimmer width={100} height={14} style={{ borderRadius: 4 }} />
        </View>
      </View>
    );
  };

  const handleItemTap = (item) => {
    // Navigate to ItemDetail screen with the item data
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={{
            backgroundColor: theme.isDarkMode ? 'rgba(62, 80, 180, 0.2)' : 'rgba(62, 80, 180, 0.1)',
            borderRadius: 12,
            padding: 6,
            marginRight: 8
          }}>
            <Ionicons name="time-outline" size={20} color={theme.isDarkMode ? '#90CAF9' : '#3F51B5'} />
          </View>
          <Typography.H3 style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: 0 }]}>Recent Items</Typography.H3>
        </View>
        <TouchableOpacity 
          style={[styles.viewAllButton, { 
            backgroundColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(63, 81, 181, 0.1)', 
            borderRadius: theme.borderRadius.lg,
            paddingVertical: 6,
            paddingHorizontal: 12
          }]} 
          onPress={() => navigation.navigate('Items')}
        >
          <Typography.BodySmall style={[styles.viewAllButtonText, { color: theme.isDarkMode ? '#90CAF9' : '#3F51B5' }]}>View All</Typography.BodySmall>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        renderRecentItemsSkeleton()
      ) : recentItems.length > 0 ? (
        <View style={styles.recentItemsContainer}>
          {recentItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.recentItem,
                { backgroundColor: isDarkMode ? '#000000' : 'rgba(255, 255, 255, 0.8)' }
              ]}
              onPress={() => handleItemTap(item)}
              activeOpacity={0.7}
            >
              {Platform.OS === 'ios' && !theme.isDarkMode && (
                <BlurView 
                  intensity={60} 
                  tint='light' 
                  style={StyleSheet.absoluteFill} 
                />
              )}
              {item.photos && item.photos.length > 0 ? (
                <Image 
                  source={{ uri: item.photos[0] }} 
                  style={styles.itemImage} 
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                  <Ionicons name="image-outline" size={30} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
                </View>
              )}
              <View style={styles.itemDetails}>
                <Typography.Body style={{ fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>{item.name}</Typography.Body>
                <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>{item.brand || 'No brand'}</Typography.BodySmall>
                <View style={styles.itemMeta}>
                  <View style={[styles.categoryTag, { backgroundColor: theme.colors.background }]}>
                    <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>{item.category}</Typography.Caption>
                  </View>
                  <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary, marginLeft: theme.spacing.sm }}>
                    {formatDate(item.created_at)}
                  </Typography.Caption>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FFFFFF' : theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Card.Primary style={[styles.emptyStateCard, { backgroundColor: theme.colors.background }]}>
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
            <Typography.Body style={{ textAlign: 'center', marginTop: theme.spacing.md, color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>
              No items added yet. Start building your collection!
            </Typography.Body>
            <Button.Primary 
              title="Add Your First Item" 
              onPress={() => navigation.navigate('Add')} 
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>
        </Card.Primary>
      )}
    </>
  );
};

const styles = createThemedStyles((theme) => ({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.bold,
  },
  viewAllButton: {
    backgroundColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(63, 81, 181, 0.1)',
    borderRadius: theme.borderRadius.lg,
  },
  viewAllButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  recentItemsContainer: {
    marginBottom: theme.spacing.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDarkMode ? '#111111' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    // iOS shadow
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    // Android elevation
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  categoryTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  emptyStateCard: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
}));

export default RecentItems;
