// components/PasswordStrengthIndicator.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel } from '../utils/passwordValidator';

/**
 * A component that displays password strength and requirements
 * @param {Object} props - Component props
 * @param {string} props.password - The password to evaluate
 * @param {boolean} props.showRequirements - Whether to show detailed requirements
 */
const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  // Skip validation if password is empty
  if (!password) {
    return null;
  }
  
  // Validate the password
  const validation = validatePassword(password);
  const strengthColor = getPasswordStrengthColor(validation.strength);
  const strengthLabel = getPasswordStrengthLabel(validation.strength);
  
  return (
    <View style={styles.container}>
      {/* Strength bar */}
      <View style={styles.strengthBarContainer}>
        <View 
          style={[styles.strengthBar, { 
            width: `${validation.strength}%`,
            backgroundColor: strengthColor 
          }]}
        />
      </View>
      
      {/* Strength label */}
      <Text style={[styles.strengthLabel, { color: strengthColor }]}>
        {strengthLabel}
      </Text>
      
      {/* Requirements list */}
      {showRequirements && (
        <View style={styles.requirementsContainer}>
          <Text style={[styles.requirement, 
            validation.requirements.length ? styles.requirementMet : styles.requirementNotMet]}>
            • At least 8 characters
          </Text>
          <Text style={[styles.requirement, 
            validation.requirements.uppercase ? styles.requirementMet : styles.requirementNotMet]}>
            • At least 1 uppercase letter
          </Text>
          <Text style={[styles.requirement, 
            validation.requirements.lowercase ? styles.requirementMet : styles.requirementNotMet]}>
            • At least 1 lowercase letter
          </Text>
          <Text style={[styles.requirement, 
            validation.requirements.number ? styles.requirementMet : styles.requirementNotMet]}>
            • At least 1 number
          </Text>
          <Text style={[styles.requirement, 
            validation.requirements.special ? styles.requirementMet : styles.requirementNotMet]}>
            • At least 1 special character
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'right',
  },
  requirementsContainer: {
    marginTop: 8,
  },
  requirement: {
    fontSize: 12,
    marginBottom: 4,
  },
  requirementMet: {
    color: '#34C759',
  },
  requirementNotMet: {
    color: '#8E8E93',
  },
});

export default PasswordStrengthIndicator;
