// screens/WelcomeScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Onboarding slides data
const slides = [
  {
    id: '1',
    title: 'Welcome to Collectible Tracker',
    description: 'The ultimate app to organize, track, and showcase your collectibles.',
    icon: 'cube',
    color: '#FF6B6B',
  },
  {
    id: '2',
    title: 'Organize Your Collection',
    description: 'Easily add, categorize, and manage all your collectibles in one place.',
    icon: 'albums',
    color: '#4ECDC4',
  },
  {
    id: '3',
    title: 'Track Your Progress',
    description: 'Monitor your collection growth and keep track of your most valuable items.',
    icon: 'trending-up',
    color: '#FFD166',
  },
  {
    id: '4',
    title: 'Join the Community',
    description: 'Connect with fellow collectors, share your finds, and discover new treasures.',
    icon: 'people',
    color: '#6772E5',
  },
];

const WelcomeScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Function to handle the "Get Started" button press
  const handleGetStarted = async () => {
    try {
      // Mark onboarding as completed in AsyncStorage
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      // Call the onComplete callback to move to the auth screen
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Function to handle the "Skip" button press
  const handleSkip = () => {
    handleGetStarted();
  };

  // Function to handle the "Next" button press
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  // Render each slide
  const renderSlide = ({ item, index }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.color }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={100} color="white" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  // Render pagination dots
  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[styles.dot, { width: dotWidth, opacity }]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={slides[currentIndex]?.color}
      />

      <View style={styles.skipContainer}>
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
          );
          setCurrentIndex(index);
        }}
      />

      {renderPagination()}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: slides[currentIndex]?.color }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="white"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 150,
    width: '100%',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginHorizontal: 5,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    paddingHorizontal: 30,
  },
  button: {
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default WelcomeScreen;
