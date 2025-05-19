import { Dimensions } from 'react-native';
import { createThemedStyles } from '../../theme/styled';

const { width } = Dimensions.get('window');
const imageSize = (width - 80) / 3; // 3 images per row with padding

// Styles for the AddItem screen components
export const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100, // Increased padding to ensure content doesn't get cut off by the bottom nav
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  // Options screen styles
  optionsContainer: {
    flex: 1,
    padding: 20,
  },
  optionsTitle: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    marginBottom: 4,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionDescription: {
    opacity: 0.7,
    color: '#CCCCCC',
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
    color: '#FFFFFF', // Ensuring white text for better contrast
    fontWeight: '700', // Making section titles bolder
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    color: '#FFFFFF', // Ensuring white text for better contrast
    fontWeight: '600', // Making labels slightly bolder
  },
  input: {
    backgroundColor: '#000000', // Changed to black
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF', // Changed to white for better contrast
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownContainer: {
    marginBottom: 16,
    zIndex: 5000, // Ensure dropdown appears above other elements
  },
  dropdown: {
    borderColor: theme.colors.border,
    backgroundColor: '#000000', // Changed to black
    borderWidth: 1,
  },
  dropdownItem: {
    justifyContent: 'flex-start',
  },
  dropdownItemContainer: {
    backgroundColor: '#000000', // Changed to black
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addImageButton: {
    width: imageSize,
    height: imageSize,
    margin: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF', // Changed to white for better visibility
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Black background
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    flex: 1,
    color: '#FFFFFF', // Ensuring white text for better contrast
  },
  switchDescription: {
    marginTop: 4,
    opacity: 0.7,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 40,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 4,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  notesInput: {
    backgroundColor: '#000000', // Changed to black
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF', // Changed to white for better contrast
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    marginRight: 8,
    color: '#FFFFFF', // Ensuring white text for better contrast
  },
  valueInput: {
    flex: 1,
  },
  aiResultContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#000000', // Changed to black
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiResultTitle: {
    marginBottom: 5,
  },
  aiResultText: {
    opacity: 0.8,
  },
  buttonIcon: {
    marginRight: 8,
  },
}));
