import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { fetchPhotosForItems } from './AddItem/apiUtils';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme and styled components
import theme from '../theme/theme';
import { Typography, Button, Card, Layout, createThemedStyles } from '../theme/styled';
import { useTheme } from '../context/ThemeContext';

// Get screen width for responsive grid
const { width } = Dimensions.get('window');
const numColumns = width > 768 ? 4 : 3; // More columns on larger screens
const tileSize = (width - (numColumns + 1) * 12) / numColumns; // Account for padding

// Define categories and conditions
const CATEGORIES = ['All', 'Diecast', 'Sports Cards', 'Memorabilia', 'Custom', 'Other'];
const CONDITIONS = ['Mint', 'Used', 'Damaged'];

const SearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Animation values
  const filterHeight = useRef(new Animated.Value(0)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const searchInputFocus = useRef(new Animated.Value(0)).current;

  // Fetch all items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  // Filter items when search query, category, or conditions change
  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, selectedConditions, items]);

  // Function to fetch items from Supabase
  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching items from Supabase...');
      
      // First fetch the items
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log(`Fetched ${data.length} items successfully`);
      
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
        setItems(data || []);
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

  // Function to filter items based on search query, category, and conditions
  const filterItems = () => {
    let filtered = [...items];
    
    // Filter by search query (case-insensitive)
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Filter by conditions
    if (selectedConditions.length > 0) {
      filtered = filtered.filter(item => selectedConditions.includes(item.condition));
    }
    
    console.log(`Filtering: Query='${searchQuery}', Category='${selectedCategory}', Conditions=[${selectedConditions.join(', ')}], Results=${filtered.length}`);
    setFilteredItems(filtered);
  };

  // Toggle filter section visibility
  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    Animated.parallel([
      Animated.timing(filterHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(filterOpacity, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
    setShowFilters(!showFilters);
  };

  // Handler for back button
  const handleBackTap = () => {
    console.log('Back tapped');
    navigation.goBack();
  };

  // Handler for category change
  const handleCategoryChange = (itemValue) => {
    setSelectedCategory(itemValue);
    console.log(`Category changed: ${itemValue}`);
  };

  // Handler for condition toggle
  const toggleCondition = (condition) => {
    setSelectedConditions(prevSelected => {
      if (prevSelected.includes(condition)) {
        return prevSelected.filter(c => c !== condition);
      } else {
        return [...prevSelected, condition];
      }
    });
  };

  // Handler for item tap
  const handleItemTap = (item) => {
    console.log(`Item tapped: ${item.name}, ID: ${item.id}`);
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  // Handler for search input focus
  const handleSearchFocus = (focused) => {
    Animated.timing(searchInputFocus, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Render each search result item
  const renderResultItem = ({ item }) => {
    // Get the first photo URL or use a placeholder
    const photoUrl = item.photos && item.photos.length > 0
      ? item.photos[0]
      : `https://via.placeholder.com/150/CCCCCC/888888?text=${encodeURIComponent(item.name)}`;
      
    // Map condition to color
    const conditionColor = 
      item.condition === 'Mint' ? theme.colors.success :
      item.condition === 'Used' ? theme.colors.warning :
      theme.colors.error;

    return (
      <TouchableOpacity 
        style={[styles.resultItem, { backgroundColor: isDarkMode ? '#111111' : theme.colors.card }]}
        onPress={() => handleItemTap(item)}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: photoUrl }} 
          style={styles.resultImage} 
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.imageGradient}
        />
        <View style={styles.resultInfo}>
          <Typography.Label style={[styles.resultName, { color: '#FFFFFF' }]} numberOfLines={1}>{item.name}</Typography.Label>
          <View style={styles.resultMeta}>
            <View style={styles.categoryContainer}>
              <Ionicons name="pricetag-outline" size={12} color="#FFFFFF" style={styles.metaIcon} />
              <Typography.Caption style={[styles.resultCategory, { color: '#FFFFFF' }]}>{item.category}</Typography.Caption>
            </View>
            <View style={[styles.conditionBadge, { backgroundColor: conditionColor }]}>
              <Typography.Caption style={[styles.conditionText, { color: '#FFFFFF' }]}>{item.condition}</Typography.Caption>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <LinearGradient
        colors={[isDarkMode ? '#000000' : theme.colors.surface, isDarkMode ? '#000000' : theme.colors.background]}
        style={styles.emptyStateGradient}
      >
        <Ionicons name="search-outline" size={60} color={isDarkMode ? '#E0E0E0' : theme.colors.primary} />
        <Typography.Body style={[styles.emptyStateText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>No results found</Typography.Body>
        <Typography.BodySmall style={[styles.emptyStateSubText, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Try adjusting your search or filters.</Typography.BodySmall>
        <Button.Primary 
          title="Clear Filters"
          onPress={() => {
            setSearchQuery('');
            setSelectedCategory('All');
            setSelectedConditions([]);
          }}
          style={styles.clearFiltersButton}
        />
      </LinearGradient>
    </View>
  );

  // Render loading state
  const renderLoading = () => (
    <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Typography.Body style={[styles.loadingText, { color: isDarkMode ? '#FFFFFF' : theme.colors.textSecondary }]}>Loading items...</Typography.Body>
    </View>
  );

  // Calculate filter section height based on animation value
  const filterMaxHeight = filterHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Adjust based on your filter section height
  });

  // Calculate search input width based on focus
  const searchInputWidth = searchInputFocus.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '85%'],
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? '#000000' : theme.colors.background} />
      
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={[isDarkMode ? '#000000' : theme.colors.background, isDarkMode ? '#000000' : theme.colors.surface]}
        style={styles.headerGradient}
      >
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
          <TouchableOpacity onPress={handleBackTap} style={[styles.backButton, { backgroundColor: isDarkMode ? '#000000' : theme.colors.surface }]}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
          </TouchableOpacity>
          <Typography.H3 style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Search</Typography.H3>
          <TouchableOpacity style={[styles.filterToggleButton, { backgroundColor: isDarkMode ? '#000000' : theme.colors.surface }]} onPress={toggleFilters}>
            <Ionicons 
              name={showFilters ? "options" : "options-outline"} 
              size={24} 
              color={showFilters ? theme.colors.primary : (isDarkMode ? '#FFFFFF' : theme.colors.text)} 
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Animated.View style={[styles.searchBarContainer, { width: searchInputWidth, backgroundColor: isDarkMode ? '#111111' : theme.colors.surface }]}>
            <Ionicons name="search" size={20} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={isDarkMode ? '#A0A0A0' : theme.colors.textTertiary}
              clearButtonMode="while-editing"
              onFocus={() => handleSearchFocus(true)}
              onBlur={() => handleSearchFocus(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </Animated.View>
          
          {/* Voice search button */}
          <Animated.View style={[styles.voiceSearchButton, { opacity: searchInputFocus, backgroundColor: isDarkMode ? '#111111' : theme.colors.surface }]}>
            <Ionicons name="mic-outline" size={22} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
          </Animated.View>
        </View>

        {/* Filter Section - Animated */}
        <Animated.View 
          style={[styles.filtersContainer, { 
            maxHeight: filterMaxHeight,
            opacity: filterOpacity,
            overflow: 'hidden',
            backgroundColor: isDarkMode ? '#000000' : 'transparent',
          }]}
        >
          {/* Category Selection */}
          <View style={styles.filterSection}>
            <Typography.Label style={[styles.filterLabel, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Category</Typography.Label>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsContainer}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip, 
                    selectedCategory === category && styles.categoryChipSelected,
                    { backgroundColor: isDarkMode ? '#111111' : theme.colors.surface }
                  ]}
                  onPress={() => handleCategoryChange(category)}
                >
                  <Typography.Caption 
                    style={[
                      styles.categoryChipText, 
                      selectedCategory === category && styles.categoryChipTextSelected,
                      { color: selectedCategory === category ? theme.colors.primary : (isDarkMode ? '#E0E0E0' : theme.colors.textSecondary) }
                    ]}
                  >
                    {category}
                  </Typography.Caption>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Condition Selection */}
          <View style={styles.filterSection}>
            <Typography.Label style={[styles.filterLabel, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Condition</Typography.Label>
            <View style={styles.conditionsContainer}>
              {CONDITIONS.map((condition) => {
                const isSelected = selectedConditions.includes(condition);
                const conditionColor = 
                  condition === 'Mint' ? theme.colors.success :
                  condition === 'Used' ? theme.colors.warning :
                  theme.colors.error;
                  
                return (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.conditionChip, 
                      isSelected && { backgroundColor: conditionColor + '20' },
                      { backgroundColor: isDarkMode ? (isSelected ? conditionColor + '20' : '#111111') : (isSelected ? conditionColor + '20' : theme.colors.surface) }
                    ]}
                    onPress={() => toggleCondition(condition)}
                  >
                    <View style={[styles.checkbox, isSelected && { backgroundColor: conditionColor, borderColor: conditionColor }]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color={theme.colors.textLight} />
                      )}
                    </View>
                    <Typography.Caption style={[styles.checkboxLabel, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{condition}</Typography.Caption>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Active Filters Summary */}
          {(selectedCategory !== 'All' || selectedConditions.length > 0) && (
            <View style={[styles.activeFiltersContainer, { borderTopColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
              <Typography.Caption style={[styles.activeFiltersLabel, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>
                Active Filters: 
                {selectedCategory !== 'All' && ` ${selectedCategory}`}
                {selectedConditions.length > 0 && ` • ${selectedConditions.join(', ')}`}
              </Typography.Caption>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedCategory('All');
                  setSelectedConditions([]);
                }}
                style={styles.clearFiltersLink}
              >
                <Typography.Caption style={styles.clearFiltersText}>Clear All</Typography.Caption>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* Results Count */}
      {!loading && (
        <View style={[styles.resultsCountContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderBottomColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
          <Typography.BodySmall style={[styles.resultsCount, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
          </Typography.BodySmall>
        </View>
      )}

      {/* Results Grid */}
      {loading ? (
        renderLoading()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderResultItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={[filteredItems.length === 0 ? styles.emptyListContainer : styles.gridContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}
          style={{ backgroundColor: isDarkMode ? '#000000' : theme.colors.background }}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={20}
          windowSize={21}
        />
      )}
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  filterToggleButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 45,
    ...theme.shadows.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.regular,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  voiceSearchButton: {
    width: 45,
    height: 45,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  filtersContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  filterSection: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  categoryChipsContainer: {
    paddingVertical: theme.spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  conditionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  checkboxLabel: {
    color: theme.colors.text,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  activeFiltersLabel: {
    color: theme.colors.textSecondary,
    flex: 1,
  },
  clearFiltersLink: {
    padding: theme.spacing.xs,
  },
  clearFiltersText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  resultsCountContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  resultsCount: {
    color: theme.colors.textSecondary,
  },
  gridContainer: {
    padding: theme.spacing.md,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  resultItem: {
    width: tileSize,
    height: tileSize * 1.2,
    margin: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
    ...theme.shadows.md,
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  resultInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
  },
  resultName: {
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 4,
  },
  resultCategory: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  conditionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  emptyStateContainer: {
    width: '100%',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  emptyStateGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateText: {
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.md,
  },
  emptyStateSubText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  clearFiltersButton: {
    paddingHorizontal: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
}));

export default SearchScreen;
