import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { createThemedStyles } from '../theme/styled';
import { Camera } from 'expo-camera';

const stylesFactory = (theme) => ({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  container_center_align: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  text_small: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: theme.colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  button_cancel: {
    marginTop: 20,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText_cancel: {
    color: theme.colors.text,
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanAgainContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  scanAgainButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  cancelButtonTopRight: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 60,
    right: 15,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraView: {
    flex: 1,
  }
});

const BarcodeScannerScreen = ({ navigation, route }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = stylesFactory(theme);

  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const lookupBarcode = async (barcode) => {
    setLoading(true);
    console.log('Looking up barcode:', barcode);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (barcode === '9780201896831') {
      return {
        name: 'The Art of Computer Programming',
        brand: 'Addison-Wesley',
        category: 'Books',
      };
    } else if (barcode === '5449000131805') {
      return {
        name: 'Coca-Cola Classic',
        brand: 'Coca-Cola',
        category: 'Memorabilia',
      };
    }
    return null;
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    setScanned(true);
    Alert.alert(`Barcode Scanned!`, `Type: ${type}\nData: ${data}\n\nLooking up product...`);
    console.log(`Barcode scanned: Type: ${type}, Data: ${data}`);

    try {
      const productInfo = await lookupBarcode(data);

      if (productInfo) {
        Alert.alert('Product Found!', `Name: ${productInfo.name}\nBrand: ${productInfo.brand}`);
      } else {
        Alert.alert('Product Not Found', 'No information found for this barcode.');
      }

      navigation.replace('Add', {
        barcodeData: data,
        productInfo: productInfo || null,
      });
    } catch (error) {
      console.error('Error looking up barcode or navigating:', error);
      Alert.alert('Error', 'Could not process barcode.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container_center_align}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container_center_align}>
        <Text style={styles.text}>No access to camera.</Text>
        <Text style={styles.text_small}>Please enable camera permissions in your device settings to use the barcode scanner.</Text>
        <TouchableOpacity style={styles.button_cancel} onPress={handleCancel}>
          <Text style={styles.buttonText_cancel}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Camera
        style={styles.cameraView}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'pdf417', 'aztec', 'itf14', 'datamatrix', 'interleaved2of5'],
        }}
      />

      {scanned && (
        <View style={styles.scanAgainContainer}>
          <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
            <Ionicons name="refresh-circle" size={28} color={theme.colors.buttonText} />
            <Text style={styles.buttonText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Looking up barcode...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButtonTopRight} onPress={handleCancel}>
        <Ionicons name="close-circle" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default BarcodeScannerScreen;
