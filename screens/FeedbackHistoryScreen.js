import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Typography, Button, Card, Layout } from '../theme/styled';

function FeedbackHistoryScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    positive: 0,
    negative: 0,
  });

  useEffect(() => {
    fetchFeedbackHistory();
  }, []);

  const fetchFeedbackHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch feedback history with item details
      const { data, error } = await supabase
        .from('ai_feedback')
        .select(`
          *,
          items(name, category, images)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setFeedbackList(data);
        
        // Calculate statistics
        const total = data.length;
        const positive = data.filter(item => item.rating === true).length;
        
        setStats({
          total,
          positive,
          negative: total - positive,
        });
      }
    } catch (error) {
      console.error('Error fetching feedback history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFeedbackItem = ({ item }) => {
    const feedbackDate = new Date(item.created_at).toLocaleDateString();
    const itemName = item.items?.name || 'Unknown Item';
    const itemCategory = item.items?.category || 'Unknown Category';
    const itemImage = item.items?.images?.[0] || null;
    
    return (
      <Card.Primary style={styles.feedbackCard}>
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackInfo}>
            <Typography.H3>{itemName}</Typography.H3>
            <Typography.BodySmall>{itemCategory}</Typography.BodySmall>
            <Typography.Caption>{feedbackDate}</Typography.Caption>
          </View>
          <View style={[
            styles.ratingBadge, 
            { 
              backgroundColor: item.rating ? theme.colors.success + '20' : theme.colors.error + '20',
              borderColor: item.rating ? theme.colors.success : theme.colors.error 
            }
          ]}>
            <Ionicons 
              name={item.rating ? 'thumbs-up' : 'thumbs-down'} 
              size={20} 
              color={item.rating ? theme.colors.success : theme.colors.error} 
            />
          </View>
        </View>
        
        {item.feedback_text && (
          <View style={styles.feedbackTextContainer}>
            <Typography.Body style={styles.feedbackText}>
              "{item.feedback_text}"
            </Typography.Body>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.viewItemButton}
          onPress={() => navigation.navigate('ItemDetail', { itemId: item.item_id })}
        >
          <Typography.BodySmall style={{ color: theme.colors.primary }}>
            View Item
          </Typography.BodySmall>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </Card.Primary>
    );
  };

  const renderEmptyList = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={64} color={theme.colors.textSecondary} />
        <Typography.Body style={styles.emptyText}>
          You haven't provided any feedback yet.
        </Typography.Body>
        <Typography.BodySmall style={styles.emptySubtext}>
          Your feedback helps improve our AI analysis.
        </Typography.BodySmall>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <Layout.Row style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Button.Icon
            icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text} />}
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          />
          <Typography.H2 style={styles.headerTitle}>Feedback History</Typography.H2>
          <View style={styles.headerRight} />
        </Layout.Row>
        
        {/* Stats Card */}
        {!loading && feedbackList.length > 0 && (
          <Card.Primary style={styles.statsCard}>
            <Typography.H3 style={styles.statsTitle}>Your Feedback Stats</Typography.H3>
            <Layout.Row style={styles.statsRow}>
              <View style={styles.statItem}>
                <Typography.H2 style={styles.statNumber}>{stats.total}</Typography.H2>
                <Typography.BodySmall style={styles.statLabel}>Total</Typography.BodySmall>
              </View>
              <View style={styles.statItem}>
                <Typography.H2 style={[styles.statNumber, { color: theme.colors.success }]}>
                  {stats.positive}
                </Typography.H2>
                <Typography.BodySmall style={styles.statLabel}>Helpful</Typography.BodySmall>
              </View>
              <View style={styles.statItem}>
                <Typography.H2 style={[styles.statNumber, { color: theme.colors.error }]}>
                  {stats.negative}
                </Typography.H2>
                <Typography.BodySmall style={styles.statLabel}>Not Helpful</Typography.BodySmall>
              </View>
            </Layout.Row>
          </Card.Primary>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Typography.Body style={styles.loadingText}>
              Loading feedback history...
            </Typography.Body>
          </View>
        ) : (
          <FlatList
            data={feedbackList}
            renderItem={renderFeedbackItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  statsCard: {
    margin: 16,
    padding: 16,
  },
  statsTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  feedbackCard: {
    marginBottom: 16,
    padding: 16,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  feedbackInfo: {
    flex: 1,
  },
  ratingBadge: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  feedbackTextContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  feedbackText: {
    fontStyle: 'italic',
  },
  viewItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default FeedbackHistoryScreen;
