import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { fetchPhotosForItems } from './AddItem/apiUtils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Typography, Button, Card, Layout, createThemedStyles } from '../theme/styled';

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - 40) / numColumns;

const AllItemsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  // Fetch items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  // Function to fetch all items from Supabase
  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching all items for user');
      
      // First fetch the items
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log(`Fetched ${data.length} total items`);
      
      if (data.length > 0) {
        // Get all item IDs
        const itemIds = data.map(item => item.id);
        
        // Fetch photos for all items in a single request
        const photosByItem = await fetchPhotosForItems(itemIds);
        
        // Add photos to each item
        const itemsWithPhotos = data.map(item => ({
          ...item,
          photos: photosByItem[item.id] || []
        }));
        
        setItems(itemsWithPhotos);
      } else {
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load items. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Function to handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  // Function to handle item tap
  const handleItemTap = (itemId) => {
    console.log(`Item tapped: ${itemId}`);
    navigation.navigate('ItemDetail', { itemId });
  };

  // Function to handle add item button tap
  const handleAddItem = () => {
    navigation.navigate('Add');
  };

  // Render each item card
  const renderItem = ({ item }) => {
    // Get the first photo or use a placeholder
    const photoUri = item.photos && item.photos.length > 0
      ? item.photos[0]
      : 'https://via.placeholder.com/300/cccccc/ffffff?text=No+Image';
    
    // Get collection name if available
    const collectionName = item.collection_name || 'No Collection';
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: isDarkMode ? '#121212' : theme.colors.cardBackground }]}
        onPress={() => handleItemTap(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.itemImage}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.itemInfo}>
          <Text 
            style={[styles.itemName, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]} 
            numberOfLines={1}
          >
            {item.name}
          </Text>
          
          <View style={styles.itemMeta}>
            <Text style={[styles.itemCategory, { color: isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }]}>
              {item.category}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <Ionicons name="cube-outline" size={64} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
      <Typography.Body style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : theme.colors.textSecondary }]}>
        You don't have any items yet.
      </Typography.Body>
      <Button.Primary 
        title="Add Your First Item"
        onPress={handleAddItem}
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={isDarkMode ? '#000000' : theme.colors.background}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
        <View>
          <Typography.H2 style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>All Items</Typography.H2>
          <Typography.Body style={[styles.subtitle, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>
            View all your collectibles
          </Typography.Body>
        </View>
        
        <Button.Icon
          icon={<Ionicons name="add" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />}
          onPress={handleAddItem}
          style={[styles.headerButton, { backgroundColor: isDarkMode ? '#121212' : theme.colors.background }]}
        />
      </View>

      {/* Items Grid */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={items.length === 0 && styles.emptyList}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={isDarkMode ? '#FFFFFF' : theme.colors.primary}
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListHeaderComponent={loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>
              Loading items...
            </Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  itemCard: {
    width: itemWidth,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.cardBackground,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    width: '100%',
    height: itemWidth,
    backgroundColor: theme.colors.divider,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.text,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  emptyButton: {
    marginTop: 10,
  },
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
  },
}));

export default AllItemsScreen;
