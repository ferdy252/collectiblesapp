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
    paddingBottom: 30,
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
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
  },
  dropdownContainer: {
    marginBottom: 16,
    zIndex: 5000, // Ensure dropdown appears above other elements
  },
  dropdown: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  dropdownItem: {
    justifyContent: 'flex-start',
  },
  dropdownItemContainer: {
    backgroundColor: theme.colors.card,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
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
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    height: 100,
    textAlignVertical: 'top',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    marginRight: 8,
  },
  valueInput: {
    flex: 1,
  },
  aiResultContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
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
