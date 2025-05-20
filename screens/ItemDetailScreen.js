import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import CommentList from '../components/CommentList';
import ConditionAnalysisDisplay from '../components/ConditionAnalysisDisplay';
import { analyzeItemCondition } from '../utils/geminiImageAnalysis';

// Import styled components
import { Typography, Button, Card, Layout, createThemedStyles } from '../theme/styled';
// Import error handling utilities
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';

// Storage key for AI features preference
const AI_FEATURES_ENABLED_STORAGE = 'ai_features_enabled';

function ItemDetailScreen({ route, navigation }) {
  const { itemId } = route.params;
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [itemPhotos, setItemPhotos] = useState([]);
  const [analyzedImageUri, setAnalyzedImageUri] = useState(null);
  const isFocused = useIsFocused();
  const screenWidth = Dimensions.get('window').width;
  
  // New state for AI condition analysis
  const [conditionData, setConditionData] = useState(null);
  const [analyzingCondition, setAnalyzingCondition] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);


  // Fetch item data when the screen comes into focus
  useEffect(() => {
    if (isFocused) {
      fetchItemDetails();
      loadAiSettings();
    }
  }, [isFocused]);

  // Load AI features preference from secure storage
  const loadAiSettings = async () => {
    try {
      const aiEnabledSetting = await SecureStore.getItemAsync(AI_FEATURES_ENABLED_STORAGE);
      if (aiEnabledSetting !== null) {
        setAiEnabled(aiEnabledSetting === 'true');
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  // Fetch photos for the item from the item_photos table
  const fetchItemPhotos = async (itemId) => {
    try {
      console.log(`Fetching photos for item ID: ${itemId}`);
      
      const { data, error } = await supabase
        .from('item_photos')
        .select('image_id, display_order, images(url)')
        .eq('item_id', itemId)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching item photos:', error);
      } else if (data && data.length > 0) {
        console.log(`Fetched ${data.length} photos for item`);
        
        // Extract just the photo URLs
        const photoUrls = data.map(photo => photo.images?.url);
        setItemPhotos(photoUrls);
        
        // If there's condition analysis data, try to find the analyzed image
        if (data[0] && data[0].images?.url) {
          // For now, we'll assume the first photo was analyzed
          // In a more complete solution, we would store which photo was analyzed
          setAnalyzedImageUri(data[0].images.url);
        }
      } else {
        console.log('No photos found for this item');
        setItemPhotos([]);
      }
    } catch (error) {
      console.error('Error in fetchItemPhotos:', error);
    }
  };

  const fetchItemDetails = async () => {
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      setLoading(true);
      console.log(`Fetching item details for ID: ${itemId}`);
      
      // Validate itemId before making the request
      if (!itemId) {
        // Use our error handling utility
        handleError(
          new Error('Invalid item ID'),
          'ItemDetailScreen.fetchItemDetails',
          ERROR_CATEGORIES.VALIDATION,
          'This item could not be found.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage('This item could not be found.');
        return;
      }
      
      // First check if the item exists before using .single()
      const { data: checkData, error: checkError } = await supabase
        .from('items')
        .select('id')
        .eq('id', itemId);
        
      if (checkError) {
        throw checkError;
      }
      
      // If no items found with this ID, handle it gracefully
      if (!checkData || checkData.length === 0) {
        // Use a more user-friendly approach instead of console.error
        setHasError(true);
        setErrorMessage('This item could not be found. It may have been deleted.');
        setLoading(false);
        
        // Navigate back after a short delay to avoid user confusion
        setTimeout(() => {
          navigation.goBack();
          Toast.show({
            type: 'info',
            text1: 'Item Not Found',
            text2: 'The item you were looking for is no longer available.',
            position: 'bottom'
          });
        }, 1500);
        return;
      }
      
      // Now we know the item exists, get the full details
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          collections(name, icon)
        `)
        .eq('id', itemId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        console.log('Item details fetched:', data);
        setItem(data);
        
        // Fetch photos for this item from the item_photos table
        fetchItemPhotos(itemId);
      } else {
        // Use our error handling utility
        handleError(
          new Error('Item not found'),
          'ItemDetailScreen.fetchItemDetails',
          ERROR_CATEGORIES.DATABASE,
          'This item could not be found.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage('This item could not be found.');
      }
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ItemDetailScreen.fetchItemDetails',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load item details. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to load item details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleEditPress = () => {
    navigation.navigate('EditItem', { itemId: item?.id });
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: deleteItem,
          style: 'destructive',
        },
      ]
    );
  };

  // Helper function to delete images from storage
  const deleteImagesFromStorage = async (imageUrls) => {
    if (!imageUrls || !imageUrls.length) return;
    
    console.log('Cleaning up associated images:', imageUrls.length);
    try {
      for (const imageUrl of imageUrls) {
        // Extract the file name from the URL
        const fileName = imageUrl.split('/').pop();
        if (!fileName) continue;
        
        console.log(`Attempting to delete image: ${fileName}`);
        
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
      // Just log the error and continue
    }
  };
  
  // Delete the item and associated images
  const deleteItem = async () => {
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      setDeleting(true);
      console.log(`Deleting item with ID: ${itemId}`);
      
      // First, get the photos from our local state or fetch them if needed
      let photosToDelete = itemPhotos;
      
      if (!photosToDelete || photosToDelete.length === 0) {
        // Try to fetch photos from the item_photos table if we don't have them locally
        console.log('Fetching photos for deletion...');
        const { data: photoData, error: photoError } = await supabase
          .from('item_photos')
          .select('image_id, images(url)')
          .eq('item_id', itemId);
        
        if (photoError) {
          console.error('Error fetching photos for deletion:', photoError);
        } else if (photoData && photoData.length > 0) {
          photosToDelete = photoData.map(photo => photo.images?.url);
          console.log(`Found ${photosToDelete.length} photos to delete`);
        }
      }
      
      // Delete the item from the database
      // This will automatically delete related photos from item_photos table due to CASCADE constraint
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) {
        throw error;
      }
      
      // Clean up the associated images from storage if we have them
      if (photosToDelete && photosToDelete.length > 0) {
        console.log(`Deleting ${photosToDelete.length} photos from storage`);
        await deleteImagesFromStorage(photosToDelete);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Item Deleted',
        text2: 'Item and associated images successfully deleted',
      });
      navigation.goBack();
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ItemDetailScreen.deleteItem',
        ERROR_CATEGORIES.DATABASE,
        'Unable to delete item. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to delete item. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Analyze item condition using Gemini API
  const analyzeCondition = async () => {
    try {
      if (!item || !itemPhotos || itemPhotos.length === 0) {
        Alert.alert(
          'No Images Available',
          'This item has no images to analyze. Please add at least one image.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setAnalyzingCondition(true);
      setHasError(false);
      
      // Use all available images for a more accurate condition analysis
      // Our updated function can handle multiple images at once
      
      // Call the Gemini API to analyze the condition with all images
      const analysisResult = await analyzeItemCondition(
        itemPhotos, // Pass the entire array of images
        item.name,
        item.category
      );
      
      setConditionData(analysisResult);
      
      // Save the condition analysis to the database
      if (analysisResult && analysisResult.conditionRating) {
        await saveConditionAnalysis(analysisResult);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Condition Analysis Complete',
        text2: `Item condition: ${analysisResult.conditionRating}`,
      });
    } catch (error) {
      handleError(
        error,
        'ItemDetailScreen.analyzeCondition',
        ERROR_CATEGORIES.API,
        'Failed to analyze item condition'
      );
      
      setHasError(true);
      setErrorMessage('Could not analyze item condition. Please try again.');
      
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the item condition. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setAnalyzingCondition(false);
    }
  };
  
  // Save condition analysis to the database
  const saveConditionAnalysis = async (analysisData) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({
          condition: analysisData.conditionRating,
          condition_details: analysisData.conditionDetails,
          condition_analysis: analysisData,
          // updated_at field removed - column doesn't exist in the database schema
        })
        .eq('id', itemId);
      
      if (error) {
        throw error;
      }
      
      // Update local item data
      setItem(prev => ({
        ...prev,
        condition: analysisData.conditionRating,
        condition_details: analysisData.conditionDetails,
        condition_analysis: analysisData,
      }));
    } catch (error) {
      console.error('Error saving condition analysis:', error);
      // We don't show an error to the user here since the analysis itself was successful
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography.Body style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading item details...
          </Typography.Body>
        </View>
      </SafeAreaView>
    );
  }

  // Add a check for null or undefined item
  if (!item) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Layout.Row style={[styles.header, { backgroundColor: theme.colors.surface }]}>
            <Button.Icon
              icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text} />}
              onPress={handleBackPress}
              style={styles.headerButton}
            />
            <Typography.H2 style={[styles.headerTitle, { color: theme.colors.text }]}>Item Details</Typography.H2>
            <View style={styles.headerRight} />
          </Layout.Row>
          
          {/* Error Display */}
          <ErrorDisplay 
            message={errorMessage || 'Item not found'}
            onRetry={fetchItemDetails}
            style={styles.errorContainer}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <Layout.Row style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography.H2 style={[styles.headerTitle, { color: theme.colors.text }]}>
            {item?.name || 'Item Details'}
          </Typography.H2>
          <Layout.Row>
            <Button.Icon
              icon={<Ionicons name="create-outline" size={24} color={theme.colors.text} />}
              onPress={handleEditPress}
              style={styles.headerButton}
            />
            <Button.Icon
              icon={<Ionicons name="trash-outline" size={24} color={theme.colors.error} />}
              onPress={handleDeletePress}
              style={styles.headerButton}
              disabled={deleting}
            />
          </Layout.Row>
        </Layout.Row>

        {/* Error Display */}
        {hasError && (
          <ErrorDisplay 
            message={errorMessage}
            onRetry={() => {
              setHasError(false);
              fetchItemDetails();
            }}
            style={styles.errorContainer}
          />
        )}

        <ScrollView 
          style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo Gallery */}
          <View style={[styles.imageContainer, { backgroundColor: theme.colors.surface }]}>
            {itemPhotos && itemPhotos.length > 0 ? (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => {
                    const slideSize = event.nativeEvent.layoutMeasurement.width;
                    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
                    setActivePhotoIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {itemPhotos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={[styles.image, { width: screenWidth, backgroundColor: theme.colors.surface }]}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                {itemPhotos.length > 1 && (
                  <View style={styles.dotsContainer}>
                    {itemPhotos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: index === activePhotoIndex
                              ? theme.colors.primary
                              : theme.colors.divider
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.noImageContainer, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="image-outline" size={80} color={theme.colors.divider} />
                <Typography.Body style={[styles.noImageText, { color: theme.colors.textSecondary }]}>
                  No Image Available
                </Typography.Body>
              </View>
            )}
          </View>

          {/* Item Details */}
          <Card.Primary style={[styles.detailsContainer, { backgroundColor: theme.colors.surface }]}>
            <Typography.H2 style={[styles.itemName, { color: theme.colors.text }]}>
              {item?.name || 'Unnamed Item'}
            </Typography.H2>
            
            {item?.collections && (
              <Layout.Row style={styles.detailRow}>
                <Typography.Label style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Collection:
                </Typography.Label>
                <Typography.Body style={[styles.detailValue, { color: theme.colors.text }]}>
                  {item.collections?.icon || ''} {item.collections?.name || 'Unknown Collection'}
                </Typography.Body>
              </Layout.Row>
            )}
            
            <Layout.Row style={styles.detailRow}>
              <Typography.Label style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Brand:
              </Typography.Label>
              <Typography.Body style={[styles.detailValue, { color: theme.colors.text }]}>
                {item?.brand || 'Not specified'}
              </Typography.Body>
            </Layout.Row>
            
            <Layout.Row style={styles.detailRow}>
              <Typography.Label style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Category:
              </Typography.Label>
              <Typography.Body style={[styles.detailValue, { color: theme.colors.text }]}>
                {item?.category || 'Not specified'}
              </Typography.Body>
            </Layout.Row>
            
            <Layout.Row style={styles.detailRow}>
              <Typography.Label style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Condition:
              </Typography.Label>
              <Typography.Body style={[styles.detailValue, { color: theme.colors.text }]}>
                {item?.condition || 'Not specified'}
              </Typography.Body>
            </Layout.Row>
            
            <Layout.Row style={styles.detailRow}>
              <Typography.Label style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Value:
              </Typography.Label>
              <Typography.Body style={[styles.detailValue, { color: theme.colors.text }]}>
                ${parseFloat(item?.value || 0).toFixed(2)}
              </Typography.Body>
            </Layout.Row>
            
            <Layout.Row style={styles.detailRow}>
              <Typography.Label style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Shared:
              </Typography.Label>
              <View style={styles.detailValue}>
                {item?.is_shared ? (
                  <View style={[styles.sharedBadge, { backgroundColor: theme.colors.success }]}>
                    <Ionicons name="people" size={16} color={theme.colors.textLight} style={{ marginRight: 5 }} />
                    <Typography.BodySmall style={[styles.badgeText, { color: theme.colors.textLight }]}>
                      Shared
                    </Typography.BodySmall>
                  </View>
                ) : (
                  <View style={[styles.privateBadge, { backgroundColor: theme.colors.gray }]}>
                    <Ionicons name="lock-closed" size={16} color={theme.colors.textLight} style={{ marginRight: 5 }} />
                    <Typography.BodySmall style={[styles.badgeText, { color: theme.colors.textLight }]}>
                      Private
                    </Typography.BodySmall>
                  </View>
                )}
              </View>
            </Layout.Row>
            
            {item?.notes && (
              <View style={[styles.notesContainer, { backgroundColor: theme.colors.surface }]}>
                <Typography.Label style={[styles.notesLabel, { color: theme.colors.textSecondary }]}>
                  Notes:
                </Typography.Label>
                <Typography.Body style={[styles.notesText, { color: theme.colors.text }]}>
                  {item.notes}
                </Typography.Body>
              </View>
            )}
          </Card.Primary>
          
          {/* Condition Analysis Section */}
          {item?.condition_analysis ? (
            <ConditionAnalysisDisplay 
              conditionData={item.condition_analysis} 
              itemId={item.id} 
              analyzedImageUri={analyzedImageUri}
            />
          ) : (
            <Card.Primary style={[styles.conditionCard, { backgroundColor: theme.colors.surface }]}>
              <Typography.H3 style={[styles.conditionTitle, { color: theme.colors.text }]}>
                Condition Analysis
              </Typography.H3>
              <Typography.Body style={[styles.conditionDescription, { color: theme.colors.text }]}>
                Use AI to analyze the condition of this item based on its images.
              </Typography.Body>
              
              <Button.Primary 
                title="Analyze Condition"
                onPress={analyzeCondition} 
                style={styles.analyzeButton}
                disabled={analyzingCondition || !aiEnabled}
              />
              
              {!aiEnabled && (
                <Typography.Caption style={[styles.aiDisabledText, { color: theme.colors.error }]}>
                  AI features are disabled. Enable them in settings.
                </Typography.Caption>
              )}
            </Card.Primary>
          )}
          
          {/* Comments Section - Only show for shared items */}
          {item?.is_shared && (
            <Card.Primary style={[styles.commentsContainer, { backgroundColor: theme.colors.surface }]}>
              <CommentList itemId={item.id} itemOwnerId={item.user_id} />
            </Card.Primary>
          )}

          {/* Delete Button */}
          {user && item && user.id === item.user_id && (
            <Button.Primary
              title="Delete Item"
              onPress={handleDeletePress}
              style={[styles.deleteButton, { 
                backgroundColor: theme.colors.errorBackground,
                borderColor: theme.colors.error 
              }]}
              textStyle={{ color: theme.colors.error }}
              loading={deleting}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 300,
  },
  image: {
    height: 300,
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  itemName: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    width: 100,
  },
  detailValue: {
    flex: 1,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  notesLabel: {
    marginBottom: 8,
  },
  notesText: {
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  errorContainer: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.errorBackground || 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
  },
  conditionCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  conditionTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  conditionDescription: {
    marginBottom: 16,
    textAlign: 'center',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  aiDisabledText: {
    marginTop: 8,
    textAlign: 'center',
  },
}));

export default ItemDetailScreen;
