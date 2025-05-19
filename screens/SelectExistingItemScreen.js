import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Typography, Button, Card, Layout, createThemedStyles } from '../theme/styled';

function SelectExistingItemScreen({ route, navigation }) {
  const { collectionId, collectionName } = route.params;
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [addingItems, setAddingItems] = useState(false);

  // Fetch user's items that are not already in this collection
  useEffect(() => {
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      setLoading(true);
      console.log(`Fetching items not in collection ID: ${collectionId}`);
      
      // First get all items in the collection to exclude them
      const { data: collectionItems, error: collectionError } = await supabase
        .from('items')
        .select('id')
        .eq('collection_id', collectionId);
      
      if (collectionError) throw collectionError;
      
      // Get the IDs of items already in the collection
      const existingItemIds = collectionItems.map(item => item.id);
      console.log(`Found ${existingItemIds.length} items already in collection`);
      
      // Now fetch all user's items that are not in this collection
      let query = supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id);
      
      // Only add the not-in filter if there are existing items
      if (existingItemIds.length > 0) {
        query = query.not('id', 'in', `(${existingItemIds.join(',')})`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log(`Fetched ${data.length} available items`);
      setItems(data);
    } catch (error) {
      console.error('Error fetching available items:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load items. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prevSelected => {
      if (prevSelected.includes(itemId)) {
        return prevSelected.filter(id => id !== itemId);
      } else {
        return [...prevSelected, itemId];
      }
    });
  };

  const addSelectedItemsToCollection = async () => {
    if (selectedItems.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'No Items Selected',
        text2: 'Please select at least one item to add to the collection.',
      });
      return;
    }

    try {
      setAddingItems(true);
      console.log(`Adding ${selectedItems.length} items to collection ${collectionId}`);
      
      // Update all selected items to be part of this collection
      const { error } = await supabase
        .from('items')
        .update({ collection_id: collectionId })
        .in('id', selectedItems);
      
      if (error) throw error;
      
      Toast.show({
        type: 'success',
        text1: 'Items Added',
        text2: `Added ${selectedItems.length} items to ${collectionName}`,
      });
      
      // Navigate back to the collection items screen
      navigation.navigate('CollectionItems', { 
        collectionId, 
        collectionName,
        refresh: true // Add a flag to trigger refresh
      });
    } catch (error) {
      console.error('Error adding items to collection:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add items to collection. Please try again.',
      });
    } finally {
      setAddingItems(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    const photoUrl = item.photos && item.photos.length > 0
      ? item.photos[0]
      : 'https://via.placeholder.com/150/CCCCCC/888888?text=No+Image';
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, { 
          backgroundColor: theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : 'transparent',
          borderWidth: isSelected ? 2 : 0,
        }]}
        onPress={() => toggleItemSelection(item.id)}
        activeOpacity={0.7}
      >
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        )}
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
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={60} color={theme.colors.divider} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {loading ? 'Loading items...' : 'No available items found.'}
      </Text>
      {!loading && (
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          All your items are already in this collection or you haven't added any items yet.
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
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>
            Select Items
          </Text>
          <Text style={[styles.collectionName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            For: {collectionName}
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>
      
      {/* Selected count */}
      {selectedItems.length > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: theme.colors.primary + '20' }]}>
          <Text style={[styles.selectionText, { color: theme.colors.primary }]}>
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}
      
      {/* Items Grid */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Add Button */}
      {selectedItems.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.divider }]}>
          <Button.Primary
            title={`Add ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''} to Collection`}
            onPress={addSelectedItemsToCollection}
            style={styles.addButton}
            disabled={addingItems}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

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
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  collectionName: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  selectionBar: {
    padding: 10,
    alignItems: 'center',
  },
  selectionText: {
    fontWeight: '600',
  },
  gridContainer: {
    padding: 10,
    flexGrow: 1,
  },
  itemCard: {
    borderRadius: 12,
    margin: 8,
    flex: 1,
    maxWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  itemImage: {
    width: '100%',
    height: 120,
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
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  addButton: {
    width: '100%',
  },
}));

export default SelectExistingItemScreen;
