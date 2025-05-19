// components/CommentList.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../lib/notifications';
import { logAddComment } from '../lib/analytics';
import theme from '../theme/theme';

const CommentList = ({ itemId, itemOwnerId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Fetch comments when component mounts
  useEffect(() => {
    fetchComments();
  }, [itemId]);

  // Function to fetch comments from Supabase
  const fetchComments = async () => {
    try {
      setLoading(true);
      console.log(`Fetching comments for item ${itemId}`);

      // Fetch comments with user profiles
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          created_at,
          user_id,
          profiles!comments_profiles_fkey(username, avatar_url)
        `)
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} comments`);
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load comments. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to handle comment submission
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'You must be logged in to comment',
      });
      return;
    }

    try {
      setSubmitting(true);
      Keyboard.dismiss();

      // Insert comment into Supabase
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          item_id: itemId,
          user_id: user.id,
          text: commentText.trim(),
        })
        .select(`
          id,
          text,
          created_at,
          user_id,
          profiles!comments_profiles_fkey(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      console.log('Comment added successfully:', newComment);

      // Update local state with new comment
      setComments([...comments, newComment]);
      setCommentText(''); // Clear input field

      // Track comment event in analytics
      logAddComment(itemId, 'Item');

      // Send notification to item owner if it's not the current user
      if (itemOwnerId && itemOwnerId !== user.id) {
        const username = user.email.split('@')[0]; // Simple username extraction
        sendPushNotification(
          itemOwnerId,
          'New Comment',
          `${username} commented on your item`,
          { type: 'comment', itemId }
        );
      }

      Toast.show({
        type: 'success',
        text1: 'Comment Added',
        text2: 'Your comment has been posted',
      });
    } catch (error) {
      console.error('Error adding comment:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to post comment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'unknown time';
    }
  };

  // Render a single comment
  const renderComment = ({ item }) => {
    const username = item.profiles?.username || item.user_id.substring(0, 8);
    return (
      <View style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={styles.username}>{username}</Text>
          </View>
          <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    );
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
      </View>

      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={40} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No comments yet</Text>
          <Text style={styles.emptySubtext}>Be the first to comment!</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.commentsList}
          onRefresh={() => {
            setRefreshing(true);
            fetchComments();
          }}
          refreshing={refreshing}
        />
      )}

      {/* Comment input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.submitButton, !commentText.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentsList: {
    paddingBottom: 16,
  },
  commentContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.text,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 15,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.7,
  },
});

export default CommentList;
