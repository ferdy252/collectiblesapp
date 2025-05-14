import React from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Typography, Card, createThemedStyles } from '../theme/styled';
import AiFeedbackComponent from './AiFeedbackComponent';

/**
 * Component to display the condition analysis results from the Gemini API
 * @param {Object} conditionData - The condition analysis data from the AI
 * @param {number} itemId - The ID of the item being analyzed
 * @param {string} analyzedImageUri - The URI of the image that was analyzed
 */
const ConditionAnalysisDisplay = ({ conditionData, itemId, analyzedImageUri }) => {
  const { theme } = useTheme();
  
  if (!conditionData) {
    return null;
  }
  
  // Get the appropriate icon and color based on condition rating
  const getConditionIcon = (rating) => {
    switch(rating) {
      case 'Mint':
        return { name: 'star', color: '#4CAF50', text: 'Mint' };
      case 'Near Mint':
        return { name: 'star-half', color: '#8BC34A', text: 'Near Mint' };
      case 'Very Good':
        return { name: 'thumbs-up', color: '#CDDC39', text: 'Very Good' };
      case 'Good':
        return { name: 'checkmark-circle', color: '#FFC107', text: 'Good' };
      case 'Fair':
        return { name: 'alert-circle', color: '#FF9800', text: 'Fair' };
      case 'Poor':
        return { name: 'warning', color: '#F44336', text: 'Poor' };
      default:
        return { name: 'help-circle', color: '#9E9E9E', text: 'Unknown' };
    }
  };
  
  const conditionIcon = getConditionIcon(conditionData.conditionRating);
  
  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Typography.H3 style={styles.title}>Condition Analysis</Typography.H3>
      </View>
      
      <View style={styles.ratingContainer}>
        <View style={[styles.ratingBadge, { backgroundColor: conditionIcon.color + '20', borderColor: conditionIcon.color }]}>
          <Ionicons name={conditionIcon.name} size={24} color={conditionIcon.color} style={styles.ratingIcon} />
          <Text style={[styles.ratingText, { color: conditionIcon.color }]}>{conditionIcon.text}</Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        <Typography.Subtitle style={styles.sectionTitle}>Details</Typography.Subtitle>
        <Typography.Body style={styles.detailsText}>{conditionData.conditionDetails}</Typography.Body>
      </View>
      
      {conditionData.visibleDefects ? (
        <View style={styles.section}>
          <Typography.Subtitle style={styles.sectionTitle}>Visible Defects</Typography.Subtitle>
          <Typography.Body style={styles.sectionText}>{conditionData.visibleDefects}</Typography.Body>
        </View>
      ) : null}
      
      {conditionData.preservationTips ? (
        <View style={styles.section}>
          <Typography.Subtitle style={styles.sectionTitle}>Preservation Tips</Typography.Subtitle>
          <Typography.Body style={styles.sectionText}>{conditionData.preservationTips}</Typography.Body>
        </View>
      ) : null}
      
      {/* Add the feedback component with the analyzed image URI */}
      <AiFeedbackComponent
        itemId={itemId}
        analysisData={conditionData}
        analyzedImageUri={analyzedImageUri}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 15,
    padding: 16,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  ratingIcon: {
    marginRight: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  detailsText: {
    lineHeight: 22,
  },
  section: {
    marginBottom: 16,
  },
  sectionText: {
    lineHeight: 22,
  },
});

export default ConditionAnalysisDisplay;
