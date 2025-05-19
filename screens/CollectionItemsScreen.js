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
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { fetchPhotosForItems } from './AddItem/apiUtils';
import { useTheme } from '../context/ThemeContext';
import { Typography, Button, Card, Layout, createThemedStyles } from '../theme/styled';

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - 40) / numColumns;

const CollectionItemsScreen = ({ route, navigation }) => {
  // Get collection details from navigation params
  const { collectionId, collectionName, collectionIcon } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const { theme, isDarkMode } = useTheme();
  
  // Reference to track open swipeable items
  const swipeableRefs = useRef({});
  
  // Fetch items when component mounts or collection changes
  useEffect(() => {
    fetchItems();
    
    // Log navigation params for debugging
    console.log('Collection Items Screen - Params:', { 
      collectionId, 
      collectionName, 
      collectionIcon 
    });
  }, [collectionId]);

  // Function to fetch items from Supabase
  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log(`Fetching items for collection ID: ${collectionId}`);
      
      // First fetch the items
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log(`Fetched ${data.length} items for collection`);
      
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
  const handleItemTap = (item) => {
    console.log(`Item tapped: ${item.name}`);
    navigation.navigate('ItemDetail', { itemId: item.id });
  };
  
  // Function to delete an item
  // Helper function to delete images from storage
  const deleteImagesFromStorage = async (imageUrls) => {
    if (!imageUrls || !imageUrls.length) return;
    
    console.log('Cleaning up associated images:', imageUrls.length);
    
    try {
      // Extract filenames from the image URLs
      const fileNames = imageUrls.map(url => {
        // Handle both signed and public URLs
        // Extract the filename from the URL path
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1].split('?')[0]; // Remove query parameters if present
      });
      
      console.log('Deleting image files:', fileNames);
      
      // Delete each file from storage
      for (const fileName of fileNames) {
        const { error } = await supabase.storage
          .from('item-photos')
          .remove([fileName]);
          
        if (error) {
          console.error(`Error deleting image ${fileName}:`, error);
        } else {
          console.log(`Successfully deleted image: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up images:', error);
      // We don't throw here to avoid interrupting the item deletion flow
    }
  };

  const deleteItem = async (itemId, itemName) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${itemName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingItemId(itemId);
              console.log(`Deleting item with ID: ${itemId}`);
              
              // First, get the image IDs associated with this item from the item_photos table
              const { data: photoData, error: photoFetchError } = await supabase
                .from('item_photos')
                .select('image_id')
                .eq('item_id', itemId);
              
              if (photoFetchError) {
                console.error('Error fetching item photos for cleanup:', photoFetchError);
                // Continue with deletion even if we can't get the photos
              }
              
              // If we have associated images, get their URLs from the images table
              let imageUrls = [];
              if (photoData && photoData.length > 0) {
                // Extract the image_ids
                const imageIds = photoData.map(photo => photo.image_id);
                
                // Fetch the image URLs from the images table
                const { data: imageData, error: imageFetchError } = await supabase
                  .from('images')
                  .select('image_url')
                  .in('id', imageIds);
                
                if (imageFetchError) {
                  console.error('Error fetching image details for cleanup:', imageFetchError);
                } else if (imageData && imageData.length > 0) {
                  // Extract the image URLs
                  imageUrls = imageData.map(img => img.image_url).filter(url => url);
                }
              }
              
              // Clean up the associated images if we have them
              if (imageUrls.length > 0) {
                await deleteImagesFromStorage(imageUrls);
              }
              
              // Delete the item_photos records (the links between items and images)
              const { error: photoDeleteError } = await supabase
                .from('item_photos')
                .delete()
                .eq('item_id', itemId);
              
              if (photoDeleteError) {
                console.error('Error deleting item_photos records:', photoDeleteError);
                // Continue with item deletion even if photo link deletion fails
              }
              
              // Finally, delete the item from the database
              const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId);
              
              if (error) {
                throw error;
              }
              
              // Remove the item from state
              setItems(items.filter(item => item.id !== itemId));
              
              Toast.show({
                type: 'success',
                text1: 'Item Deleted',
                text2: `${itemName} and its images have been deleted.`,
              });
            } catch (error) {
              console.error('Error deleting item:', error.message);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete item. Please try again.',
              });
            } finally {
              setDeletingItemId(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  // Function to close all open swipeable items
  const closeAllSwipeables = (exceptId) => {
    Object.keys(swipeableRefs.current).forEach(id => {
      if (id !== exceptId && swipeableRefs.current[id]) {
        swipeableRefs.current[id].close();
      }
    });
  };
  
  // Function to render right actions for swipeable
  const renderRightActions = (item) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteItem(item.id, item.name)}
      >
        {deletingItemId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.deleteActionText}>Delete</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };
  
  // Function to navigate to add item screen
  const handleAddItem = () => {
    // Show options to add new item or select existing item
    Alert.alert(
      'Add to Collection',
      'Would you like to add a new item or select an existing item?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'New Item',
          onPress: () => {
            navigation.navigate('Add', { 
              screen: 'AddMain',
              params: {
                preSelectedCollectionId: collectionId,
                preSelectedCollectionName: collectionName
              }
            });
          }
        },
        {
          text: 'Existing Item',
          onPress: () => {
            // Navigate to the SelectExistingItem screen
            navigation.navigate('SelectExistingItem', {
              collectionId,
              collectionName
            });
          }
        }
      ]
    );
  };

  // Function to render an item card
  const renderItem = ({ item }) => {
    // Safety check - if item is not valid, render a placeholder
    if (!item || typeof item !== 'object' || !item.id) {
      console.error('Invalid item object in renderItem:', item);
      return null;
    }
    
    // Get the first photo URL or use a placeholder
    const photoUrl = item.photos && item.photos.length > 0
      ? item.photos[0]
      : 'https://via.placeholder.com/150/CCCCCC/888888?text=No+Image';
    
    // Safe reference function that checks for null values
    const setSwipeableRef = (ref) => {
      try {
        if (ref && item && item.id) {
          swipeableRefs.current[item.id] = ref;
        }
      } catch (error) {
        console.error('Error setting swipeable ref:', error);
      }
    };
    
    // Safe function to close other swipeables
    const safeCloseOthers = () => {
      try {
        if (item && item.id) {
          closeAllSwipeables(item.id);
        }
      } catch (error) {
        console.error('Error closing swipeables:', error);
      }
    };
    
    return (
      <Swipeable
        ref={setSwipeableRef}
        renderRightActions={() => renderRightActions(item)}
        onSwipeableOpen={safeCloseOthers}
        overshootRight={false}
      >
        <View style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => handleItemTap(item)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: photoUrl }} 
              style={styles.itemImage}
              resizeMode="cover"
            />
            <View style={styles.itemDetails}>
              <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.itemCategory, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.category || 'Uncategorized'}
              </Text>
              {item.brand && (
                <Text style={[styles.itemBrand, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  Brand: {item.brand}
                </Text>
              )}
            </View>
            <View style={[styles.menuButton, { backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)' }]}>
              <TouchableOpacity
                onPress={() => deleteItem(item.id, item.name)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };
  
  // Function to render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={60} color={theme.colors.divider} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {loading ? 'Loading items...' : 'No items in this collection yet.'}
      </Text>
      {!loading && (
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          Tap the + button to add items to this collection.
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          delayLongPress={10000}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.collectionIcon}>{collectionIcon}</Text>
          <Text style={[styles.collectionName, { color: theme.colors.text }]} numberOfLines={1}>
            {collectionName}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddItem}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Items Grid */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={[styles.gridContainer, { backgroundColor: theme.colors.background }]}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
      />

      {/* Floating Add Button for Mobile UX */}
      <TouchableOpacity 
        style={[styles.floatingButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleAddItem}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  collectionIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  gridContainer: {
    padding: 10,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  itemCard: {
    borderRadius: 12,
    marginBottom: 16,
    width: itemWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: itemWidth,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  itemDetails: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 12,
  },
  menuButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: 'tomato',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
}));

export default CollectionItemsScreen;
