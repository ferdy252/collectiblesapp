import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Removed LinearGradient import as we're using solid colors now
import { useTheme } from '../../../context/ThemeContext';
import { Typography, createThemedStyles } from '../../../theme/styled';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

const QuickActions = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();

  const handleScanBarcode = async () => {
    console.log('Scan barcode tapped');
    try {
      // Check if we have permission to use the camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        // Navigate to barcode scanner screen with lookup mode
        navigation.navigate('BarcodeScannerScreen', { mode: 'lookup' });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Camera Permission',
          text2: 'We need camera permission to scan barcodes',
        });
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      // Fallback to manual add if camera permission fails
      navigation.navigate('AddMain');
    }
  };

  const handleExportData = () => {
    console.log('Export data tapped');
    // Navigate to Settings screen through Profile stack and trigger export
    navigation.navigate('Profile', { 
      screen: 'Settings', 
      params: { initialAction: 'export' }
    });
  };

  const handleStatistics = () => {
    console.log('Statistics tapped');
    // Navigate to statistics screen
    navigation.navigate('Statistics');
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
            <Ionicons name="flash-outline" size={20} color={theme.isDarkMode ? '#90CAF9' : '#3F51B5'} />
          </View>
          <Typography.H3 style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: 0 }]}>Quick Actions</Typography.H3>
        </View>
      </View>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => handleScanBarcode()}
        >
          <View style={[styles.quickActionIcon, {backgroundColor: theme.colors.primary}]}>
            <Ionicons name="barcode" size={24} color="#FFFFFF" />
          </View>
          <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Scan Item</Typography.BodySmall>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Profile', { screen: 'Settings' })}
        >
          <View style={[styles.quickActionIcon, {backgroundColor: theme.colors.primary}]}>
            <Ionicons name="settings" size={24} color="#FFFFFF" />
          </View>
          <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Settings</Typography.BodySmall>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => handleExportData()}
        >
          <View style={[styles.quickActionIcon, {backgroundColor: theme.colors.primary}]}>
            <Ionicons name="download" size={24} color="#FFFFFF" />
          </View>
          <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Export</Typography.BodySmall>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => handleStatistics()}
        >
          <View style={[styles.quickActionIcon, {backgroundColor: theme.colors.primary}]}>
            <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
          </View>
          <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Statistics</Typography.BodySmall>
        </TouchableOpacity>
      </View>
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
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    alignItems: 'center',
    width: '22%', // Slightly less than 25% to account for margins
    marginBottom: theme.spacing.md,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  quickActionText: {
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
}));

export default QuickActions;
