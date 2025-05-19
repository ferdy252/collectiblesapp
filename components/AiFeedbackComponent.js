import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

/**
 * Component for collecting user feedback on AI condition analysis
 */
const AiFeedbackComponent = ({ itemId, analysisData, analyzedImageUri }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [photoId, setPhotoId] = useState(null);
  
  // Find the photo ID for the analyzed image
  useEffect(() => {
    const findPhotoId = async () => {
      if (!itemId || !analyzedImageUri) return;
      
      try {
        console.log('Looking for photo ID for analyzed image:', analyzedImageUri);
        
        // Extract the filename from the URI to help with matching
        const filename = analyzedImageUri.split('/').pop();
        console.log('Extracted filename:', filename);
        
        // Query the item_photos table to find the matching photo
        const { data, error } = await supabase
          .from('item_photos')
          .select('id, image_id, images(url)')
          .eq('item_id', itemId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error finding photo ID:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // Try to find an exact match first
          let matchedPhoto = data.find(photo => photo.images?.url === analyzedImageUri);
          
          // If no exact match, try to find a photo URL that contains the filename
          if (!matchedPhoto && filename) {
            matchedPhoto = data.find(photo => photo.images?.url.includes(filename));
          }
          
          // If we found a match, store the photo ID
          if (matchedPhoto) {
            console.log('Found matching photo ID:', matchedPhoto.id);
            setPhotoId(matchedPhoto.id);
          } else {
            console.log('No matching photo found for analyzed image');
          }
        }
      } catch (error) {
        console.error('Error in findPhotoId:', error);
      }
    };
    
    findPhotoId();
  }, [itemId, analyzedImageUri]);
  
  // State variables
  const [rating, setRating] = useState(null); // null, true (thumbs up), false (thumbs down)
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  
  // Animation values
  const expandAnimation = useState(new Animated.Value(0))[0];
  
  // Handle rating selection
  const handleRating = (isPositive) => {
    setRating(isPositive);
    setIsExpanded(true);
    
    // Animate the expansion
    Animated.timing(expandAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  // Submit feedback to Supabase
  const submitFeedback = async () => {
    if (rating === null || !user || !itemId) return;
    
    try {
      setIsSubmitting(true);
      
      // Prepare the feedback data
      const feedbackData = {
        user_id: user.id,
        item_id: itemId,
        photo_id: photoId, // Include the photo ID if we found it
        rating: rating,
        feedback_text: feedbackText.trim() || null,
        ai_model_used: 'gemini-1.5-pro', // Current model being used
        analysis_data: analysisData
      };
      
      console.log('Saving AI feedback with photo ID:', photoId);
      
      // Insert feedback into Supabase
      const { error } = await supabase
        .from('ai_feedback')
        .insert(feedbackData);
      
      if (error) throw error;
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Thank you for your feedback!',
        text2: 'Your input helps improve our AI analysis.',
        visibilityTime: 3000,
      });
      
      // Reset form and mark as submitted
      setFeedbackText('');
      setIsExpanded(false);
      setIsFeedbackSubmitted(true);
      
      // Animate collapse
      Animated.timing(expandAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Could not submit feedback',
        text2: 'Please try again later.',
        visibilityTime: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset feedback form
  const resetFeedback = () => {
    setRating(null);
    setFeedbackText('');
    setIsExpanded(false);
    setIsFeedbackSubmitted(false);
    
    // Animate collapse
    Animated.timing(expandAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  // Calculate animated height for the feedback form
  const expandHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  
  // If feedback has already been submitted, show a simple message
  if (isFeedbackSubmitted) {
    return (
      <View style={[styles.container, { borderTopColor: theme.colors.divider }]}>
        <View style={styles.submittedContainer}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          <Text style={[styles.submittedText, { color: theme.colors.text }]}>
            Feedback submitted
          </Text>
          <TouchableOpacity onPress={resetFeedback} style={styles.editButton}>
            <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { borderTopColor: theme.colors.divider }]}>
      {/* Rating question */}
      <Text style={[styles.question, { color: theme.colors.textSecondary }]}>
        Was this analysis helpful?
      </Text>
      
      {/* Rating buttons */}
      <View style={styles.ratingContainer}>
        <TouchableOpacity
          style={[
            styles.ratingButton,
            rating === true && { backgroundColor: theme.colors.success + '20' },
          ]}
          onPress={() => handleRating(true)}
          disabled={isSubmitting}
        >
          <Ionicons
            name="thumbs-up"
            size={24}
            color={rating === true ? theme.colors.success : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.ratingButton,
            rating === false && { backgroundColor: theme.colors.error + '20' },
          ]}
          onPress={() => handleRating(false)}
          disabled={isSubmitting}
        >
          <Ionicons
            name="thumbs-down"
            size={24}
            color={rating === false ? theme.colors.error : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      
      {/* Expandable feedback form */}
      <Animated.View style={[styles.expandableContainer, { height: expandHeight }]}>
        <TextInput
          style={[
            styles.feedbackInput,
            { 
              backgroundColor: theme.colors.inputBackground,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Tell us why (optional)"
          placeholderTextColor={theme.colors.textSecondary}
          value={feedbackText}
          onChangeText={setFeedbackText}
          multiline
          maxLength={200}
          editable={!isSubmitting}
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.colors.primary },
            isSubmitting && { opacity: 0.7 },
          ]}
          onPress={submitFeedback}
          disabled={isSubmitting || rating === null}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    marginTop: 16,
  },
  question: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ratingButton: {
    padding: 12,
    borderRadius: 30,
    marginHorizontal: 16,
  },
  expandableContainer: {
    overflow: 'hidden',
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  submittedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  submittedText: {
    marginLeft: 8,
    fontSize: 14,
  },
  editButton: {
    marginLeft: 12,
    padding: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AiFeedbackComponent;
