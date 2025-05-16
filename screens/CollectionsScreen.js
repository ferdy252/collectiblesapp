import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar, // Import StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';

// Import theme and styled components
import { useTheme } from '../context/ThemeContext'; // Import theme context
import { Typography, Button, Card, Layout, Input, createThemedStyles } from '../theme/styled';
// Import error handling utilities
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';

// Emoji options for collection icons
const EMOJI_OPTIONS = ['🚗', '✨', '🏀', '📚', '🎮', '🎸', '🏆', '🎨', '🧸', '💎', '🚀', '🦸'];

const numColumns = 2;
const screenWidth = Dimensions.get('window').width;

function CollectionsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme(); // Get current theme from context
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(EMOJI_OPTIONS[0]);
  const [savingCollection, setSavingCollection] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch collections when component mounts
  useEffect(() => {
    fetchCollections();
  }, []);

  // Function to fetch collections from Supabase
  const fetchCollections = async () => {
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      setLoading(true);
      console.log('Fetching collections from Supabase...');
      
      // Fetch collections for the current user
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      console.log(`Fetched ${collectionsData.length} collections`);

      // For each collection, count the number of items
      const collectionsWithCounts = await Promise.all(collectionsData.map(async (collection) => {
        const { count, error: countError } = await supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('collection_id', collection.id);

        if (countError) {
          console.error('Error counting items:', countError);
          return { ...collection, itemCount: 0 };
        }

        return { ...collection, itemCount: count || 0 };
      }));

      setCollections(collectionsWithCounts);
    } catch (error) {
      // Use our new error handling utility
      handleError(
        error,
        'CollectionsScreen.fetchCollections',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load your collections. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to load your collections. Please try again.');
      
      // Set empty collections array to avoid undefined errors
      setCollections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchCollections();
  };

  // Function to handle collection tap
  const handleCollectionTap = (collection) => {
    // Validate collection object to prevent 'getValue' of undefined error
    if (!collection || typeof collection !== 'object') {
      console.error('Invalid collection object:', collection);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Cannot open this collection. Please try again.',
      });
      return;
    }
    
    console.log(`Collection tapped: ${collection.name}`);
    navigation.navigate('CollectionItems', {
      collectionId: collection.id || '',
      collectionName: collection.name || 'Unnamed Collection',
      collectionIcon: collection.icon || '📦'
    });
  };
  
  // Function to handle long press on a collection (for deletion)
  const handleCollectionLongPress = (collection) => {
    if (!collection || typeof collection !== 'object') {
      return;
    }
    
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete the collection '${collection.name}'? This will NOT delete the items in the collection.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCollection(collection.id, collection.name)
        }
      ]
    );
  };
  
  // Function to delete a collection
  const deleteCollection = async (collectionId, collectionName) => {
    if (!collectionId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Cannot delete this collection. Please try again.',
      });
      return;
    }
    
    setLoading(true);
    try {
      // Delete the collection from the database
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);
      
      if (error) {
        throw error;
      }
      
      // Update the UI by removing the deleted collection
      setCollections(collections.filter(c => c.id !== collectionId));
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `'${collectionName}' has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting collection:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete collection. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new collection
  const handleCreateCollection = async () => {
    // Validate input
    if (!newCollectionName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Name',
        text2: 'Please enter a collection name.',
      });
      return;
    }

    // Reset error state
    setHasError(false);
    setErrorMessage('');
    
    try {
      setSavingCollection(true);
      console.log('Creating new collection:', { name: newCollectionName, icon: selectedIcon });
      
      // Insert the new collection into Supabase
      const { data, error } = await supabase
        .from('collections')
        .insert([
          {
            name: newCollectionName,
            icon: selectedIcon,
            // user_id is automatically set by RLS policy
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      console.log('Collection created successfully:', data);
      
      // Add the new collection to the state with a count of 0 items
      const newCollection = { ...data[0], itemCount: 0 };
      setCollections([newCollection, ...collections]);
      
      // Reset form and close modal
      setNewCollectionName('');
      setSelectedIcon(EMOJI_OPTIONS[0]);
      setModalVisible(false);
      
      Toast.show({
        type: 'success',
        text1: 'Collection Created',
        text2: `${newCollectionName} has been created.`,
      });
    } catch (error) {
      // Use our new error handling utility
      handleError(
        error,
        'CollectionsScreen.handleCreateCollection',
        ERROR_CATEGORIES.DATABASE,
        'Unable to create collection. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to create collection. Please try again.');
    } finally {
      setSavingCollection(false);
    }
  };

  // Function to open the create collection modal
  const handleCreateNewCollectionTap = () => {
    setModalVisible(true);
  };

  // Function to handle search tap
  const handleSearchTap = () => {
    console.log('Search icon tapped');
    navigation.navigate('Search');
  };

  // Render the All Items card at the top
  const renderAllItemsCard = () => (
    <Card.Interactive
      style={[styles.allItemsCard, { backgroundColor: theme.colors.primary }]}
      onPress={() => navigation.navigate('AllItems')}
    >
      <View style={styles.allItemsContent}>
        <Ionicons name="grid-outline" size={24} color="white" />
        <View style={styles.allItemsTextContainer}>
          <Typography.Label style={[styles.allItemsTitle, { color: 'white' }]}>All Items</Typography.Label>
          <Typography.BodySmall style={[styles.allItemsSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>View all your collectibles</Typography.BodySmall>
        </View>
        <Ionicons name="chevron-forward" size={20} color="white" />
      </View>
    </Card.Interactive>
  );

  // Render a collection card
  const renderCollectionCard = ({ item }) => (
    <Card.Interactive
      style={[styles.card, { backgroundColor: theme.colors.background }]}
      onPress={() => handleCollectionTap(item)}
    >
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <Typography.Label style={[styles.cardName, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]} numberOfLines={2}>{item.name}</Typography.Label>
      <View style={styles.cardFooter}>
        <Typography.BodySmall style={[styles.cardCount, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>{item.itemCount} items</Typography.BodySmall>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleCollectionLongPress(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </Card.Interactive>
  );

  // Render an emoji option for selection
  const renderEmojiOption = (emoji) => (
    <TouchableOpacity
      key={emoji}
      style={[styles.emojiOption, selectedIcon === emoji && styles.selectedEmojiOption, { backgroundColor: theme.colors.background }]}
      onPress={() => setSelectedIcon(emoji)}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
    </TouchableOpacity>
  );

  // Render empty list component
  const renderEmptyListComponent = () => (
    <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
      <Ionicons name="albums-outline" size={64} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
      <Typography.Body style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : theme.colors.textSecondary }]}>
        You don't have any collections yet.
      </Typography.Body>
      <Typography.Body style={[styles.emptySubText, { color: isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }]}>
        You can still view all your items using the All Items option above.
      </Typography.Body>
      <Button.Primary 
        title="Create Your First Collection"
        onPress={handleCreateNewCollectionTap}
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View>
          <Typography.H2 style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>Collections</Typography.H2>
          <Typography.Body style={[styles.subtitle, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Organize your collectibles</Typography.Body>
        </View>
        <Layout.Row>
          <Button.Icon
            icon={<Ionicons name="search" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />}
            onPress={handleSearchTap}
            style={[styles.headerButton, { backgroundColor: theme.colors.background }]}
          />
          <Button.Icon
            icon={<Ionicons name="add" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />}
            onPress={handleCreateNewCollectionTap}
            style={[styles.headerButton, { backgroundColor: theme.colors.background }]}
          />
        </Layout.Row>
      </View>

      {/* Error Display */}
      {hasError && (
        <ErrorDisplay 
          message={errorMessage}
          onRetry={() => {
            setHasError(false);
            fetchCollections();
          }}
          style={styles.errorContainer}
        />
      )}

      {/* Collections Grid */}
      <FlatList
        data={collections}
        renderItem={renderCollectionCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={[styles.listContent, { backgroundColor: theme.colors.background }]}
        columnWrapperStyle={styles.columnWrapper}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={!loading ? renderEmptyListComponent : null}
        style={{ backgroundColor: theme.colors.background }}
        ListHeaderComponent={
          <>
            {/* All Items Card */}
            <View style={styles.allItemsContainer}>
              {renderAllItemsCard()}
            </View>
            
            {/* Section Title */}
            <View style={styles.sectionTitleContainer}>
              <Typography.H3 style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>Collections</Typography.H3>
            </View>
            
            {/* Loading Indicator */}
            {loading && collections.length === 0 && (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Typography.Body style={[styles.loadingText, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Loading collections...</Typography.Body>
              </View>
            )}
          </>
        }
      />

      {/* Create Collection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <Typography.H3 style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Create New Collection</Typography.H3>
              
              {/* Collection Name Input */}
              <Typography.Label style={[styles.inputLabel, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Collection Name</Typography.Label>
              <Input.Primary
                placeholder="Enter collection name"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                style={[styles.input, { backgroundColor: theme.colors.background }]}
                autoCapitalize="words"
                maxLength={30}
                placeholderTextColor={isDarkMode ? '#A0A0A0' : undefined}
              />
              
              {/* Emoji Selection */}
              <Typography.Label style={[styles.inputLabel, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Choose an Icon</Typography.Label>
              <View style={[styles.emojiContainer, { backgroundColor: theme.colors.background }]}>
                {EMOJI_OPTIONS.map(renderEmojiOption)}
              </View>
              
              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Button.Secondary
                  title="Cancel"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                  disabled={savingCollection}
                />
                <Button.Primary
                  title={savingCollection ? 'Creating...' : 'Create'}
                  onPress={handleCreateCollection}
                  style={styles.modalButton}
                  disabled={savingCollection || !newCollectionName.trim()}
                />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 5,
  },
  deleteButton: {
    padding: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  allItemsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  allItemsCard: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: theme.colors.primary,
  },
  allItemsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  allItemsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  allItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  allItemsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  headerButton: {
    backgroundColor: theme.colors.background,
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    backgroundColor: theme.colors.background,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  card: {
    width: (screenWidth - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  cardName: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardCount: {
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  emptySubText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyButton: {
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadows.lg,
  },
  modalTitle: {
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    marginBottom: theme.spacing.xs,
  },
  input: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  selectedEmojiOption: {
    backgroundColor: theme.colors.primary + '20', // 20% opacity
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  emojiText: {
    fontSize: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  errorContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
}));

export default CollectionsScreen;
