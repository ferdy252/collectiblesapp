// screens/WelcomeScreen.js
import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Onboarding slides data
const slides = [
  {
    id: '1',
    title: 'Welcome to Collectible Tracker',
    description: 'Track, organize, and share your collectibles easily.',
    icon: 'cube-outline',
    gradientColors: ['#FF6B6B', '#FF8E8E'],
    buttonText: 'Next',
    buttonIcon: 'arrow-forward',
    illustration: 'collection'
  },
  {
    id: '2',
    title: 'Organize Effortlessly',
    description: 'Easily add, categorize, and manage your collectibles in one place.',
    icon: 'layers-outline',
    gradientColors: ['#4361EE', '#3A0CA3'],
    buttonText: 'Next',
    buttonIcon: 'chevron-forward',
    illustration: 'organize'
  },
  {
    id: '3',
    title: 'Track Your Growth',
    description: 'Monitor your collection growth and keep track of your most valuable items.',
    icon: 'trending-up',
    gradientColors: ['#7209B7', '#560BAD'],
    buttonText: 'Next',
    buttonIcon: 'chevron-forward',
    illustration: 'growth'
  },
  {
    id: '4',
    title: 'Connect & Share',
    description: 'Join the community to connect with fellow collectors and share your finds.',
    icon: 'people',
    gradientColors: ['#4CC9F0', '#4895EF'],
    buttonText: 'Get Started',
    buttonIcon: 'arrow-forward',
    illustration: 'community'
  },
];

const WelcomeScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  // Start animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Function to handle the "Get Started" button press
  const handleGetStarted = () => {
    // Animate out before completing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Call the onComplete callback to move to the main app
      onComplete();
    });
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

  // Get dot opacity based on scroll position
  const getDotOpacity = (index) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const outputRange = [0.4, 1, 0.4];
    return scrollX.interpolate({
      inputRange,
      outputRange,
      extrapolate: 'clamp',
    });
  };

  // Get dot width based on scroll position
  const getDotWidth = (index) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const outputRange = [8, 20, 8];
    return scrollX.interpolate({
      inputRange,
      outputRange,
      extrapolate: 'clamp',
    });
  };

  // Render illustration based on slide type
  const renderIllustration = (type) => {
    switch(type) {
      case 'collection':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationBox}>
              <MaterialCommunityIcons name="trophy-outline" size={100} color="white" />
            </View>
          </View>
        );
      case 'organize':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationBox}>
              <MaterialCommunityIcons name="folder-outline" size={100} color="white" />
            </View>
          </View>
        );
      case 'growth':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationBox}>
              <MaterialCommunityIcons name="chart-line" size={100} color="white" />
            </View>
          </View>
        );
      case 'community':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationBox}>
              <MaterialCommunityIcons name="account-group-outline" size={100} color="white" />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // Render each slide
  const renderSlide = ({ item, index }) => {
    return (
      <Animated.View 
        style={[{
          opacity: fadeAnim,
          transform: [{ translateY: translateY }]
        }]}
      >
        <LinearGradient 
          colors={item.gradientColors} 
          style={styles.slide}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        >
          {/* Slide content */}
          <View style={styles.slideContent}>
            {/* Header with icon */}
            <View style={styles.headerContainer}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="cube-outline" size={40} color="white" />
              </View>
            </View>
            
            {/* Title text */}
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>{item.title}</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
            
            {/* Illustration */}
            {renderIllustration(item.illustration)}
            
            {/* Bottom section with pagination and button */}
            <View style={styles.bottomContainer}>
              {/* Pagination dots */}
              <View style={styles.paginationContainer}>
                {slides.map((_, i) => (
                  <Animated.View 
                    key={i} 
                    style={[
                      styles.paginationDot,
                      {
                        width: getDotWidth(i),
                        opacity: getDotOpacity(i)
                      }
                    ]} 
                  />
                ))}
              </View>
              
              {/* Button */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => index === slides.length - 1 ? handleGetStarted() : handleNext()}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>{item.buttonText}</Text>
                <Ionicons name={item.buttonIcon} size={20} color="white" style={styles.actionButtonIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={slides[currentIndex]?.gradientColors[0]} 
        translucent={true}
      />
      
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: slides[0].gradientColors[0],
  },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingBottom: 60,
    paddingHorizontal: 30,
  },
  // Header styles
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  // Title styles
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  titleText: {
    fontSize: 38,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  descriptionText: {
    fontSize: 22,
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    opacity: 0.9,
    maxWidth: '90%',
  },
  // Illustration styles
  illustrationContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  illustrationBox: {
    width: 200,
    height: 200,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Bottom section styles
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  paginationDot: {
    height: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    marginRight: 8,
  },
  actionButtonIcon: {
    marginLeft: 4,
  },
});

export default WelcomeScreen;
