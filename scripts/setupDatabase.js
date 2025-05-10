// scripts/setupDatabase.js
import { supabase } from '../lib/supabase';

const setupDatabase = async () => {
  console.log('Setting up database...');
  
  try {
    // Create items table
    const { error: tableError } = await supabase.rpc('create_items_table');
    
    if (tableError) {
      console.error('Error creating items table:', tableError);
    } else {
      console.log('Items table created successfully');
    }
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
};

// Create the stored procedure first
const createStoredProcedure = async () => {
  try {
    const { error } = await supabase.rpc('create_stored_procedure_for_items_table');
    
    if (error) {
      console.error('Error creating stored procedure:', error);
    } else {
      console.log('Stored procedure created successfully');
      // Now run the setup
      await setupDatabase();
    }
  } catch (error) {
    console.error('Failed to create stored procedure:', error.message);
  }
};

createStoredProcedure();
