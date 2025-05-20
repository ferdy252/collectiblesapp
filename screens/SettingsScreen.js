import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { logExportData } from '../lib/analytics';
import TwoFactorSetup from '../components/TwoFactorSetup';
import { getMFAFactors, unenrollMFA } from '../utils/mfaUtils';

const SettingsScreen = ({ navigation, route }) => {
  // Get theme context
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  const [loggingOut, setLoggingOut] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [disablingMfa, setDisablingMfa] = useState(false);
  const { user, signOut, notificationsEnabled, toggleNotifications, mfaEnabled, mfaFactorId } = useAuth();

  // State for account deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Check if we should trigger export on mount (from quick action)
  useEffect(() => {
    if (route.params?.initialAction === 'export') {
      handleExportData();
    }
  }, [route.params]);

  // Handler for Edit Account button
  const handleEditAccount = () => {
    console.log('Edit Account tapped');
    navigation.navigate('EditAccount');
  };

  // Handler for Dark Mode toggle - now uses the ThemeContext
  const handleDarkModeToggle = (value) => {
    console.log(`Dark Mode toggled: ${value}`);
    toggleTheme(); // This will handle the toggle and persistence
  };

  // Handler for Notifications toggle
  const handleNotificationsToggle = (value) => {
    console.log(`Notifications toggled: ${value}`);
    toggleNotifications(value);
    Toast.show({
      type: 'success',
      text1: 'Notifications',
      text2: `Notifications ${value ? 'enabled' : 'disabled'}`,
    });
  };

  // Handler for 2FA setup
  const handleSetupTwoFactor = () => {
    setShowMfaSetup(true);
  };

  // Handler for 2FA disable
  const handleDisableTwoFactor = async () => {
    // Show confirmation dialog
    Alert.alert(
      'Disable Two-Factor Authentication?',
      'This will make your account less secure. Are you sure you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setDisablingMfa(true);
              await unenrollMFA(mfaFactorId);
              
              // Force refresh MFA status by refreshing the page
              navigation.replace('Settings');
              
              Toast.show({
                type: 'success',
                text1: 'Two-Factor Authentication Disabled',
                text2: 'Your account now uses only password authentication.',
              });
            } catch (error) {
              console.error('Error disabling 2FA:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to disable two-factor authentication. Please try again.',
              });
            } finally {
              setDisablingMfa(false);
            }
          },
        },
      ],
    );
  };

  // Handle MFA setup completion
  const handleMfaSetupComplete = () => {
    setShowMfaSetup(false);
    // Force refresh MFA status by refreshing the page
    navigation.replace('Settings');
    Toast.show({
      type: 'success',
      text1: 'Two-Factor Authentication Enabled',
      text2: 'Your account is now more secure!',
      position: 'bottom'
    });
  };

  // Handle MFA setup cancellation
  const handleMfaSetupCancel = () => {
    setShowMfaSetup(false);
  };

  // Handler for Export Data button
  const handleExportData = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'You must be logged in to export data',
      });
      return;
    }

    try {
      setExportingData(true);
      console.log('Exporting data to CSV...');

      // Fetch all user items from Supabase
      const { data: items, error } = await supabase
        .from('items')
        .select('id, name, brand, category, collection_id, is_shared, notes, condition, value, created_at')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!items || items.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Data',
          text2: 'You don\'t have any items to export.',
        });
        setExportingData(false);
        return;
      }

      console.log(`Found ${items.length} items to export`);

      // Convert items to CSV using PapaParse
      const csv = Papa.unparse(items, {
        header: true,
        newline: '\n',
      });

      // Generate a timestamp for the filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `items-${timestamp}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      // Write the CSV to a temporary file
      await FileSystem.writeAsStringAsync(filePath, csv);

      // Upload the file to Supabase Storage
      // Important: The first folder must be the user's ID to comply with RLS policies
      const uploadPath = `${user.id}/exports/${fileName}`;
      const fileContents = await FileSystem.readAsStringAsync(filePath);
      
      console.log(`Uploading file to ${uploadPath}`);
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('user-data')
        .upload(uploadPath, fileContents, {
          contentType: 'text/csv',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get a signed URL for the file (secure, requires authentication)
      console.log('Getting signed URL for path:', uploadPath);
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('user-data')
        .createSignedUrl(uploadPath, 60 * 60 * 24); // Valid for 24 hours for export data
      
      if (signedUrlError) {
        console.error('Failed to get signed URL for export data:', signedUrlError);
        throw new Error('Failed to create secure download link');
      }

      const secureUrl = signedUrlData?.signedUrl;

      // Share the file URL
      try {
        await Share.share({
          message: `Here's your exported items data from CollectibleTrackerApp: ${secureUrl}`,
          url: secureUrl,
          title: 'Your Exported Data',
        });
        
        // Track export data event in analytics
        logExportData(items.length, 'csv');
        
        Toast.show({
          type: 'success',
          text1: 'Export Successful',
          text2: `${items.length} items exported to CSV`,
        });
      } catch (shareError) {
        console.error('Share error:', shareError);
        // If sharing fails, at least show the URL in a toast
        Toast.show({
          type: 'success',
          text1: 'Export Successful',
          text2: `${items.length} items exported. URL copied to clipboard.`,
        });
      }

      // Clean up the temporary file
      await FileSystem.deleteAsync(filePath);

    } catch (error) {
      console.error('Export error:', error);
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: error.message || 'Failed to export data. Please try again.',
      });
    } finally {
      setExportingData(false);
    }
  };

  // Handler for Import Data button
  const handleImportData = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'You must be logged in to import data',
      });
      return;
    }

    try {
      // Pick a CSV file using expo-document-picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picking canceled');
        return;
      }

      setImportingData(true);
      console.log('Importing data from CSV...');

      // Read the CSV file
      const fileUri = result.assets[0].uri;
      const fileContents = await FileSystem.readAsStringAsync(fileUri);

      // Parse the CSV using PapaParse
      Papa.parse(fileContents, {
        header: true,
        complete: async (results) => {
          try {
            const { data, errors } = results;

            if (errors.length > 0) {
              throw new Error('CSV parsing error: ' + errors[0].message);
            }

            if (!data || data.length === 0) {
              throw new Error('No valid data found in the CSV file');
            }

            console.log(`Parsed ${data.length} items from CSV`);

            // Prepare items for insertion, adding the user_id
            const itemsToInsert = data.map(item => {
              // Handle special fields like photos array
              let parsedItem = {
                ...item,
                user_id: user.id,
              };

              // Convert string representation of arrays back to actual arrays
              if (typeof parsedItem.photos === 'string') {
                try {
                  parsedItem.photos = JSON.parse(parsedItem.photos);
                } catch (e) {
                  // If parsing fails, set to null or empty array
                  parsedItem.photos = [];
                }
              }

              // Convert is_shared string to boolean
              if (typeof parsedItem.is_shared === 'string') {
                parsedItem.is_shared = parsedItem.is_shared.toLowerCase() === 'true';
              }

              // Remove id field to let Supabase generate new IDs
              delete parsedItem.id;

              return parsedItem;
            });

            // Insert the items into Supabase
            const { data: insertedData, error: insertError } = await supabase
              .from('items')
              .insert(itemsToInsert)
              .select();

            if (insertError) throw insertError;

            Toast.show({
              type: 'success',
              text1: 'Import Successful',
              text2: `Imported ${insertedData.length} items`,
            });

          } catch (error) {
            console.error('Import processing error:', error);
            Toast.show({
              type: 'error',
              text1: 'Import Failed',
              text2: error.message || 'Failed to process imported data',
            });
          } finally {
            setImportingData(false);
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          Toast.show({
            type: 'error',
            text1: 'Import Failed',
            text2: 'Failed to parse CSV file',
          });
          setImportingData(false);
        }
      });
    } catch (error) {
      console.error('Import error:', error);
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error.message || 'Failed to import data. Please try again.',
      });
      setImportingData(false);
    }
  };

  // Handler for Logout button
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      console.log('Logging out...');
      await signOut();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'You have been logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  // Handlers for Account Deletion
  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const handleCancelDeletion = () => {
    setShowDeleteModal(false);
    setDeleteConfirmationText('');
    setIsDeletingAccount(false);
  };

  const handleConfirmDeletion = async () => {
    if (deleteConfirmationText.toLowerCase() !== 'delete') {
      Toast.show({
        type: 'error',
        text1: 'Confirmation Failed',
        text2: 'Please type "delete" to confirm.'
      });
      return;
    }

    setIsDeletingAccount(true);
    console.log('Attempting to delete account...');

    try {
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function to delete the user account
      // Pass the user ID explicitly to help with authentication
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Error calling delete account function');
      }

      console.log('Account deletion response:', data);

      Toast.show({
        type: 'success',
        text1: 'Account Deleted',
        text2: 'Your account and all associated data have been deleted.',
        visibilityTime: 4000,
      });
      
      // Log out the user after successful deletion
      await signOut();
      handleCancelDeletion(); // Close modal

    } catch (error) {
      console.error('Error deleting account:', error);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Could not delete account. Please try again.',
      });
      setIsDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('ProfileMain')}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handleEditAccount}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Edit Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
              <Text style={[styles.settingText, { color: theme.colors.error }]}>
                {loggingOut ? 'Logging out...' : 'Log Out'}
              </Text>
            </View>
            {loggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Security</Text>
          
          {/* Two-Factor Authentication */}
          {mfaEnabled ? (
            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={handleDisableTwoFactor}
              disabled={disablingMfa}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.success} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Two-Factor Authentication</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                    Enabled - Your account has extra protection
                  </Text>
                </View>
              </View>
              {disablingMfa ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.actionText, { color: theme.colors.error }]}>Disable</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={handleSetupTwoFactor}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="shield-outline" size={22} color={theme.colors.warning} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Two-Factor Authentication</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                    Disabled - Add an extra layer of security
                  </Text>
                </View>
              </View>
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={isDarkMode ? "moon" : "sunny"} 
                size={22} 
                color={isDarkMode ? theme.colors.accent : theme.colors.warning} 
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: theme.colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {isDarkMode ? 'Using dark theme for better viewing in low light' : 'Using light theme'}
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: theme.colors.primary }}
              thumbColor={isDarkMode ? "#f4f3f4" : "#f4f3f4"}
              ios_backgroundColor="#767577"
              onValueChange={handleDarkModeToggle}
              value={isDarkMode}
              accessibilityLabel="Toggle dark mode"
              accessibilityHint={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              accessibilityRole="switch"
              accessibilityState={{ checked: isDarkMode }}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Push Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: theme.colors.primary }}
              thumbColor={"#f4f3f4"}
              ios_backgroundColor="#767577"
              onValueChange={handleNotificationsToggle}
              value={notificationsEnabled}
              accessibilityLabel="Toggle notifications"
              accessibilityHint="Enables or disables push notifications"
            />
          </View>
        </View>

        {/* AI Features Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>AI Features</Text>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={() => navigation.navigate('FeedbackHistory')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: theme.colors.text }]}>AI Feedback History</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  View your feedback on AI condition analysis
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Data Management Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handleExportData}
            disabled={exportingData}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="download-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                {exportingData ? 'Exporting...' : 'Export Data'}
              </Text>
            </View>
            {exportingData ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handleImportData}
            disabled={importingData}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="upload-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                {importingData ? 'Importing...' : 'Import Data'}
              </Text>
            </View>
            {importingData ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={() => Linking.openURL('https://example.com/privacy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="shield-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={() => Linking.openURL('https://example.com/terms')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Version</Text>
            </View>
            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>1.0.0</Text>
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={[
          styles.section, 
          styles.dangerZone, 
          { 
            backgroundColor: theme.colors.card, 
            borderTopColor: theme.colors.error // Apply theme-dependent border color inline
          }
        ]}>
          <Text style={[styles.sectionTitle, styles.dangerZoneTitle, { color: theme.colors.error }]}>Danger Zone</Text>
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handleOpenDeleteModal}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
              <Text style={[styles.settingText, { color: theme.colors.error }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MFA Setup Modal */}
      <Modal
        visible={showMfaSetup}
        animationType="slide"
        transparent={false}
        onRequestClose={handleMfaSetupCancel}
      >
        <TwoFactorSetup 
          onComplete={handleMfaSetupComplete}
          onCancel={handleMfaSetupCancel}
        />
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={handleCancelDeletion}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Delete Account</Text>
            <Text style={[styles.modalWarningText, { color: theme.colors.textSecondary }]}>
              Are you sure you want to delete your account? This action is irreversible and will permanently delete all your data, including items, collections, and app settings. 
              <Text style={{ fontWeight: 'bold', color: theme.colors.error }}>Please ensure you have exported any data you wish to keep beforehand.</Text>
            </Text>
            
            <TextInput
              style={[
                styles.deleteConfirmationInput,
                { 
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.inputBackground 
                }
              ]}
              placeholder="Type 'delete' to confirm"
              placeholderTextColor={theme.colors.textSecondary}
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              autoCapitalize="none"
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.surface }]} 
                onPress={handleCancelDeletion}
                disabled={isDeletingAccount}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.confirmDeleteButton,
                  {
                    backgroundColor: deleteConfirmationText.toLowerCase() === 'delete' && !isDeletingAccount ? theme.colors.error : theme.colors.disabled
                  }
                ]} 
                onPress={handleConfirmDeletion}
                disabled={deleteConfirmationText.toLowerCase() !== 'delete' || isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Confirm Deletion</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 12,
    marginLeft: 12,
    marginTop: 2,
  },
  versionText: {
    fontSize: 14,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Styles for Delete Account Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalWarningText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  deleteConfirmationInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 25,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    // No specific background, uses theme.colors.surface
  },
  confirmDeleteButton: {
    // Background color set dynamically based on state
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 20, // Add some space before this section
    borderTopWidth: 1, // Optional: visually separate it more
  },
  dangerZoneTitle: {
    // Styles for the 'Danger Zone' title, inherits from sectionTitle but can be overridden
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
