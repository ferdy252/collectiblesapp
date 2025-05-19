import React, { createContext, useContext, useReducer } from 'react';
import { itemReducer, initialState } from './itemReducer';

// Create the context
const AddItemContext = createContext();

/**
 * Provider component for AddItem screen state
 * Makes the state and dispatch function available to all child components
 */
export const AddItemProvider = ({ children }) => {
  const [state, dispatch] = useReducer(itemReducer, initialState);
  
  return (
    <AddItemContext.Provider value={{ state, dispatch }}>
      {children}
    </AddItemContext.Provider>
  );
};

/**
 * Custom hook to use the AddItem context
 * @returns {Object} The context object with state and dispatch
 */
export const useAddItem = () => {
  const context = useContext(AddItemContext);
  
  if (!context) {
    throw new Error('useAddItem must be used within an AddItemProvider');
  }
  
  return context;
};
