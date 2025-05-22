import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Toast from 'react-native-toast-message';
import { fetchPhotosForItems } from '../../AddItem/apiUtils';

export const useHomeData = (user) => {
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    mostValuable: 'None',
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 0 });

  // Function to fetch recent items from Supabase
  const fetchRecentItems = async () => {
    try {
      console.log('Fetching recent items from Supabase...');
      
      if (!user || !user.id) {
        console.log('User not available, skipping fetchRecentItems');
        setRecentItems([]); // Clear items if no user
        setLoading(false); // Ensure loading is false if we skip
        return;
      }

      // Query the 3 most recent items from the items table for the current user
      const { data, error } = await supabase
        .from('items')
        .select('*') // Select all columns
        .eq('user_id', user.id) // Filter by user_id
        .order('created_at', { ascending: false }) // Order by created_at in descending order
        .limit(3); // Limit to 3 items
      
      if (error) {
        console.error('Error fetching recent items:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load recent items',
        });
        return;
      }
      
      console.log('Recent items fetched successfully:', data);
      
      // If we have items, fetch their photos
      if (data && data.length > 0) {
        // Get all item IDs
        const itemIds = data.map(item => item.id);
        
        // Fetch photos for all items in a single request
        const photosByItem = await fetchPhotosForItems(itemIds);
        
        // Add photos to each item
        const itemsWithPhotos = data.map(item => ({
          ...item,
          photos: photosByItem[item.id] || []
        }));
        
        console.log('Added photos to recent items');
        setRecentItems(itemsWithPhotos);
      } else {
        setRecentItems([]);
      }
    } catch (error) {
      console.error('Exception fetching recent items:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications from Supabase...');
      
      if (!user || !user.id) {
        console.log('User not available, skipping fetchNotifications');
        setNotifications([]); // Clear notifications if no user
        setUnreadCount(0);
        return;
      }

      // Query notifications from the notifications table for the current user
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id) // Filter by user_id
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load notifications',
        });
        return;
      }
      
      // If no notifications found, create a welcome notification for new users
      if ((!data || data.length === 0) && user) { // Check user here again to be safe
        const defaultNotifications = [
          {
            id: 'welcome-1',
            title: 'Welcome!',
            message: 'Welcome to CollectibleTracker! Start by adding your first item.',
            type: 'success',
            read: false,
            created_at: new Date().toISOString(),
            action: 'add',
            actionData: {},
          }
        ];
        setNotifications(defaultNotifications);
        setUnreadCount(1);
      } else {
        console.log('Notifications fetched successfully:', data);
        setNotifications(data || []); // Ensure data is not null
        setUnreadCount(data ? data.filter(notification => !notification.read).length : 0);
      }
    } catch (error) {
      console.error('Exception fetching notifications:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    }
  };

  // Fetch collection stats
  const fetchCollectionStats = async () => {
    try {
      console.log('Fetching collection stats from Supabase...');
      
      if (!user || !user.id) {
        console.log('User not available, skipping fetchCollectionStats');
        setStats({ totalItems: 0, mostValuable: 'None' }); // Clear stats if no user
        return;
      }

      // Query the total number of items from the items table for the current user
      const { count: totalItemsCount, error: totalItemsError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true }) // Using head:true to only get count
        .eq('user_id', user.id); // Filter by user_id
      
      if (totalItemsError) {
        console.error('Error fetching total items:', totalItemsError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load collection stats',
        });
        return;
      }
      
      // Query the most valuable item from the items table for the current user
      const { data: mostValuableItemData, error: mostValuableItemError } = await supabase
        .from('items')
        .select('name')
        .eq('user_id', user.id) // Filter by user_id
        .order('value', { ascending: false })
        .limit(1);
      
      if (mostValuableItemError) {
        console.error('Error fetching most valuable item:', mostValuableItemError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load collection stats',
        });
        return;
      }
      
      console.log('Collection stats fetched successfully:', totalItemsCount, mostValuableItemData);
      setStats({
        totalItems: totalItemsCount || 0,
        mostValuable: mostValuableItemData && mostValuableItemData.length > 0 ? mostValuableItemData[0].name : 'None',
      });
    } catch (error) {
      console.error('Exception fetching collection stats:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (id) => {
    try {
      // Update the notification in the database
      if (id && id.startsWith && id.startsWith('welcome-')) {
        // For default welcome notifications that aren't in the database yet
        const updatedNotifications = notifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter(notification => !notification.read).length);
      } else {
        // For notifications stored in the database
        // Validate UUID format before sending to the database
        if (!id || typeof id !== 'string') {
          console.error('Error marking notification as read: Invalid ID format', id);
          return;
        }

        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
        
        if (error) {
          console.error('Error marking notification as read:', error);
          return;
        }
        
        // Update local state
        const updatedNotifications = notifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter(notification => !notification.read).length);
      }
    } catch (error) {
      console.error('Exception marking notification as read:', error.message);
    }
  };

  // Handle notification action
  const handleNotificationAction = (notification) => {
    // Mark notification as read
    markNotificationAsRead(notification.id);
    
    // Close the notifications popup
    setShowNotifications(false);
    
    // Return the action and data for the parent component to handle navigation
    return {
      action: notification.action,
      actionData: notification.actionData,
      id: notification.id
    };
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRecentItems(),
      fetchNotifications(),
      fetchCollectionStats()
    ]);
    setLoading(false);
  };

  // Fetch items when component mounts or user changes
  useEffect(() => {
    if (user) {
      setLoading(true); // Set loading when user is present and we're about to fetch
      fetchData();
    } else {
      // Clear data when user logs out or is not present
      setRecentItems([]);
      setNotifications([]);
      setUnreadCount(0);
      setStats({ totalItems: 0, mostValuable: 'None' });
      setLoading(false); // Not loading if not authenticated
    }
  }, [user]);

  return {
    recentItems,
    stats,
    loading,
    notifications,
    unreadCount,
    showNotifications,
    setShowNotifications,
    notificationRef,
    notificationPosition,
    setNotificationPosition,
    fetchData,
    handleNotificationAction,
    markNotificationAsRead
  };
};
