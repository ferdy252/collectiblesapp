import { normalizeImageUri, areImageUrisEqual } from '../../utils/uriUtils';

// Action types
export const ACTIONS = {
  SET_ITEM_NAME: 'SET_ITEM_NAME',
  SET_BRAND: 'SET_BRAND',
  SET_VALUE: 'SET_VALUE',
  SET_NOTES: 'SET_NOTES',
  SET_CATEGORY: 'SET_CATEGORY',
  SET_CONDITION: 'SET_CONDITION',
  SET_COLLECTION: 'SET_COLLECTION',
  SET_IS_SHARED: 'SET_IS_SHARED',
  SET_IMAGES: 'SET_IMAGES',
  ADD_IMAGE: 'ADD_IMAGE',
  REMOVE_IMAGE: 'REMOVE_IMAGE',
  SET_DROPDOWN_OPEN: 'SET_DROPDOWN_OPEN',
  SET_LOADING: 'SET_LOADING',
  SET_SAVING: 'SET_SAVING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_AI_ANALYSIS_RESULT: 'SET_AI_ANALYSIS_RESULT',
  SET_ANALYZED_IMAGE_URI: 'SET_ANALYZED_IMAGE_URI',
  SET_COLLECTIONS: 'SET_COLLECTIONS',
  SET_COLLECTION_ITEMS: 'SET_COLLECTION_ITEMS',
  RESET_FORM: 'RESET_FORM'
};

// Initial state
export const initialState = {
  // Form fields
  itemName: '',
  brand: '',
  value: '',
  notes: '',
  selectedCategory: null,
  selectedCondition: null,
  selectedCollectionId: null,
  isShared: false,
  
  // Images
  images: [],
  analyzedImageUri: null,
  
  // Dropdown states
  categoryOpen: false,
  conditionOpen: false,
  collectionOpen: false,
  
  // Collections
  collections: [],
  collectionItems: [],
  
  // UI states
  loading: false,
  saving: false,
  hasError: false,
  errorMessage: '',
  
  // AI analysis
  aiAnalysisResult: null
};

// Reducer function
export const itemReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_ITEM_NAME:
      return { ...state, itemName: action.payload };
      
    case ACTIONS.SET_BRAND:
      return { ...state, brand: action.payload };
      
    case ACTIONS.SET_VALUE:
      return { ...state, value: action.payload };
      
    case ACTIONS.SET_NOTES:
      return { ...state, notes: action.payload };
      
    case ACTIONS.SET_CATEGORY:
      return { ...state, selectedCategory: action.payload };
      
    case ACTIONS.SET_CONDITION:
      return { ...state, selectedCondition: action.payload };
      
    case ACTIONS.SET_COLLECTION:
      return { ...state, selectedCollectionId: action.payload };
      
    case ACTIONS.SET_IS_SHARED:
      return { ...state, isShared: action.payload };
      
    case ACTIONS.SET_IMAGES:
      return { ...state, images: action.payload };
      
    case ACTIONS.ADD_IMAGE:
      // Check if the image already exists in the array
      const normalizedUri = normalizeImageUri(action.payload);
      const imageExists = state.images.some(uri => 
        areImageUrisEqual(uri, normalizedUri)
      );
      
      if (imageExists) {
        return state; // Don't add duplicate images
      }
      
      return { 
        ...state, 
        images: [...state.images, normalizedUri] 
      };
      
    case ACTIONS.REMOVE_IMAGE:
      const newImages = [...state.images];
      newImages.splice(action.payload, 1);
      
      // If we removed the analyzed image, reset analyzedImageUri
      const removedUri = state.images[action.payload];
      const isAnalyzedImage = state.analyzedImageUri && 
        areImageUrisEqual(removedUri, state.analyzedImageUri);
      
      return { 
        ...state, 
        images: newImages,
        analyzedImageUri: isAnalyzedImage ? null : state.analyzedImageUri
      };
      
    case ACTIONS.SET_DROPDOWN_OPEN:
      const { dropdown, isOpen } = action.payload;
      return { ...state, [dropdown]: isOpen };
      
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case ACTIONS.SET_SAVING:
      return { ...state, saving: action.payload };
      
    case ACTIONS.SET_ERROR:
      let msg = 'An unexpected error occurred.'; // Default message
      if (typeof action.payload === 'string') {
        msg = action.payload;
      } else if (action.payload && typeof action.payload.message === 'string') {
        msg = action.payload.message;
      } else if (action.payload) {
        // Attempt to stringify if it's some other truthy value, though this is less ideal
        try {
          msg = String(action.payload);
        } catch (e) {
          // Fallback if String() fails for some reason
        }
      }
      return {
        ...state,
        hasError: true,
        errorMessage: msg
      };

    case ACTIONS.CLEAR_ERROR:
      return { 
        ...state, 
        hasError: false, 
        errorMessage: '' 
      };
      
    case ACTIONS.SET_AI_ANALYSIS_RESULT:
      return { ...state, aiAnalysisResult: action.payload };
      
    case ACTIONS.SET_ANALYZED_IMAGE_URI:
      return { ...state, analyzedImageUri: action.payload };
      
    case ACTIONS.SET_COLLECTIONS:
      return { ...state, collections: action.payload };
      
    case ACTIONS.SET_COLLECTION_ITEMS:
      return { ...state, collectionItems: action.payload };
      
    case ACTIONS.RESET_FORM:
      return initialState;
      
    default:
      return state;
  }
};
