import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
// Import our input validation utility
import { sanitizeString, validateLength, validateEmail, validatePassword } from '../utils/inputValidation';

const EditAccountScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [newAvatar, setNewAvatar] = useState(null);
  const [errors, setErrors] = useState({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);
  
  // Function to load user profile data
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('Loading user profile data...');
      
      // Get user data from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (userData && userData.user) {
        console.log('User data loaded:', userData.user.email);
        setEmail(userData.user.email || '');
        
        // Get profile data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, bio, avatar_url')
          .eq('id', userData.user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // If no profile exists, we'll use defaults
          setUsername(userData.user.email.split('@')[0]);
        } else if (profileData) {
          // Set state with profile data
          setUsername(profileData.username || userData.user.email.split('@')[0]);
          setBio(profileData.bio || '');
          setAvatarUrl(profileData.avatar_url || null);
          console.log('Profile data loaded:', profileData);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load profile data',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to pick an image from the gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setAvatarUrl(imageUri);
        console.log('Image selected:', imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not select image',
      });
    }
  };
  
  // Function to upload avatar image
  const uploadAvatar = async (uri) => {
    try {
      setUploading(true);
      console.log('Uploading avatar image:', uri);
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}-avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob, {
          upsert: true,
          contentType: `image/${fileExt}`,
        });
      
      if (error) {
        throw error;
      }
      
      console.log('Avatar uploaded successfully');
      
      // Get a public URL for the avatar
      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for avatar');
      }
      
      console.log('Avatar public URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to upload avatar',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };
  
  // Function to validate password change
  const validatePasswordChange = () => {
    // Reset previous error
    setPasswordError('');
    
    // Check if current password is provided
    if (newPassword && !currentPassword) {
      setPasswordError('Current password is required');
      return false;
    }
    
    // Check if new password meets requirements
    if (newPassword && newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return false;
    }
    
    // Check if passwords match
    if (newPassword && newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }
    
    return true;
  };
  
  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    // Validate username
    const usernameValidation = validateLength(username, 3, 30);
    if (!usernameValidation.success) {
      newErrors.username = usernameValidation.message;
    }
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.success) {
      newErrors.email = emailValidation.message;
    }
    
    // Validate bio if provided
    if (bio) {
      const bioValidation = validateLength(bio, 0, 200);
      if (!bioValidation.success) {
        newErrors.bio = bioValidation.message;
      }
    }
    
    // Validate password fields if the user is trying to change password
    if (newPassword) {
      // Current password is required if changing password
      if (!currentPassword) {
        newErrors.currentPassword = 'Current password is required';
      }
      
      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.success) {
        newErrors.newPassword = passwordValidation.message;
      }
      
      // Check if passwords match
      if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };
  
  // Function to update user profile
  const updateProfile = async () => {
    try {
      setLoading(true);
      
      if (!validateForm()) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please fix the errors in the form',
        });
        return;
      }
      
      // Handle avatar upload if there's a new one
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const uploadedUrl = await uploadAvatar(avatarUrl);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }
      
      // Sanitize user inputs before saving to database
      const sanitizedUsername = sanitizeString(username);
      const sanitizedBio = sanitizeString(bio);
      
      console.log('Updating profile with:', {
        username: sanitizedUsername,
        bio: sanitizedBio,
        avatar_url: finalAvatarUrl
      });
      
      // Update profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: sanitizedUsername,
          bio: sanitizedBio,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (passwordError) throw passwordError;
      }
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
      });
      
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle cancel button
  const handleCancel = () => {
    navigation.goBack();
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Profile</Text>
          <View style={{ width: 24 }}><Text> </Text></View>
        </View>
        
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, { backgroundColor: theme.colors.divider }]}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.divider }]}>
              <Ionicons name="person" size={50} color={theme.colors.textSecondary} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.changeAvatarButton, { backgroundColor: theme.colors.primary }]}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.changeAvatarText}>Change Photo</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Username</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.inputText,
                borderColor: theme.colors.inputBorder
              }]}
              placeholder="Enter your username"
              placeholderTextColor={theme.colors.inputPlaceholder}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            {errors.username ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.username}
              </Text>
            ) : null}
          </View>
          
          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.inputText,
                borderColor: theme.colors.inputBorder
              }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={false} // Email can't be changed directly
            />
            {errors.email ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.email}
              </Text>
            ) : null}
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              Email cannot be changed
            </Text>
          </View>
          
          {/* Bio Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Bio</Text>
            <TextInput
              style={[styles.textArea, {
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.inputText,
                borderColor: theme.colors.inputBorder
              }]}
              placeholder="Tell us about yourself"
              placeholderTextColor={theme.colors.inputPlaceholder}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
            />
            {errors.bio ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.bio}
              </Text>
            ) : null}
          </View>
        </View>
        
        {/* Password Section */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Change Password</Text>
          
          {/* Current Password Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Current Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.inputText,
                  borderColor: theme.colors.inputBorder
                }]}
                placeholder="Enter current password"
                placeholderTextColor={theme.colors.inputPlaceholder}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.currentPassword}
              </Text>
            ) : null}
          </View>
          
          {/* New Password Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.inputText,
                  borderColor: theme.colors.inputBorder
                }]}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.inputPlaceholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.newPassword}
              </Text>
            ) : null}
          </View>
          
          {/* Confirm Password Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.inputText,
                  borderColor: theme.colors.inputBorder
                }]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.inputPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.confirmPassword}
              </Text>
            ) : null}
          </View>
          
          {/* Password Error Message */}
          {passwordError ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {passwordError}
            </Text>
          ) : null}
          
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            Password must be at least 8 characters long
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={updateProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.inputBorder }]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  headerButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  changeAvatarText: {
    color: 'white',
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingTop: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 0,
  },
  passwordVisibilityButton: {
    padding: 10,
  },
  helperText: {
    fontSize: 14,
    marginTop: 5,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 10,
  },
  actionButtons: {
    marginTop: 10,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});

export default EditAccountScreen;
