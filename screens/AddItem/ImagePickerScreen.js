import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import UnifiedImagePicker from '../../components/UnifiedImagePicker';
import { Typography } from '../../theme/styled';

/**
 * Screen for picking and analyzing images
 * This separates the image picking functionality from the AddItemScreen
 */
const ImagePickerScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { onImageSelected, onAnalysisComplete } = route.params || {};

  // Handle when an image is selected
  const handleImageSelected = (uri) => {
    // Call the callback from the route params
    if (onImageSelected && uri) {
      onImageSelected(uri);
    }
    // Navigate back to the previous screen
    navigation.goBack();
  };

  // Handle when analysis is complete
  const handleAnalysisComplete = (analysisResult, imageUri) => {
    // Call the callback from the route params
    if (onAnalysisComplete && imageUri) {
      onAnalysisComplete(analysisResult, imageUri);
    }
    // Navigate back to the previous screen
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography.H2 style={styles.title}>Select Image</Typography.H2>
        <Typography.Body style={styles.subtitle}>
          Choose an image from your gallery or take a new photo
        </Typography.Body>
      </View>

      <View style={styles.pickerContainer}>
        <UnifiedImagePicker
          onImageSelected={handleImageSelected}
          onAnalysisComplete={handleAnalysisComplete}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  pickerContainer: {
    flex: 1,
    padding: 16,
  },
});

export default ImagePickerScreen;
