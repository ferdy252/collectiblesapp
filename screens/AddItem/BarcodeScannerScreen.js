import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Button, Linking, Platform, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [flashMode, setFlashMode] = useState('off');
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  
  // Get the mode from route params (default to 'add' if not specified)
  // 'add' - Used in Add Item flow, returns data to previous screen
  // 'lookup' - Used from Home screen, looks up product and navigates to Add screen
  const mode = route.params?.mode || 'add';

  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  const toggleFlash = () => {
    setFlashMode(current => (current === 'off' ? 'torch' : 'off'));
  };

  // Mock product lookup function (similar to the original scanner)
  // In a real app, this would connect to a product database API
  const lookupBarcode = async (barcode) => {
    setLoading(true);
    console.log('Looking up barcode:', barcode);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock database with a few sample products
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

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    console.log(`Barcode scanned: Type: ${type}, Data: ${data}`);
    
    if (mode === 'lookup') {
      // Home screen flow - lookup product and navigate to Add
      try {
        setLoading(true);
        Alert.alert(`Barcode Scanned!`, `Type: ${type}\nData: ${data}\n\nLooking up product...`);
        
        const productInfo = await lookupBarcode(data);
        
        if (productInfo) {
          Alert.alert('Product Found!', `Name: ${productInfo.name}\nBrand: ${productInfo.brand}`);
        } else {
          Alert.alert('Product Not Found', 'No information found for this barcode.');
        }

        // Navigate to Add screen with barcode data
        navigation.navigate('AddMain', {
          barcodeData: data,
          productInfo: productInfo || null,
        });
      } catch (error) {
        console.error('Error looking up barcode:', error);
        Alert.alert('Error', 'Could not process barcode.');
      } finally {
        setLoading(false);
      }
    } else {
      // Add Item flow - return data to previous screen
      Alert.alert(`Barcode Scanned!`, `Type: ${type}\nData: ${data}`);
      
      // Navigate back to the previous screen with the scanned data
      navigation.navigate('AddMain', { 
        barcodeData: data 
      });
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" color={colors.primary} />
        <Text style={[styles.info, { color: colors.text }]}>
          If you've already denied permission, you might need to enable it in your device settings.
        </Text>
        {Platform.OS === 'ios' && 
            <Button onPress={() => Linking.openSettings()} title="Open Settings" color={colors.primary} />
        }
        <TouchableOpacity style={styles.button_cancel} onPress={handleCancel}>
          <Text style={[styles.buttonText_cancel, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Camera permissions are granted
  if (hasPermission === null) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', padding: 20 }]}>
        <Text style={[styles.message, { color: colors.text, marginBottom: 20 }]}>
          No access to camera
        </Text>
        <Text style={[styles.info, { color: colors.text, marginBottom: 20 }]}>
          Please grant camera permissions to use the barcode scanner.
        </Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.card, marginTop: 10 }]}
          onPress={handleCancel}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code93", "code128", "codabar", "itf", "pdf417", "aztec", "datamatrix"],
        }}
        style={StyleSheet.absoluteFillObject}
        flash={flashMode}
      />
      
      {/* Top Bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity 
          style={styles.buttonIcon}
          onPress={handleCancel}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Barcode</Text>
        <TouchableOpacity 
          style={styles.buttonIcon}
          onPress={toggleFlash}
        >
          <Ionicons 
            name={flashMode === 'off' ? 'flash-off' : 'flash'} 
            size={28} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Viewfinder */}
      <View style={styles.viewfinder}>
        <View style={styles.topLeftCorner} />
        <View style={styles.topRightCorner} />
        <View style={styles.bottomLeftCorner} />
        <View style={styles.bottomRightCorner} />
      </View>
      
      <Text style={styles.helpText}>Align barcode within the frame to scan</Text>
      
      {/* Bottom Bar */}
      <SafeAreaView style={styles.bottomBar}>
        {scanned ? (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => setScanned(false)}
          >
            <Ionicons name="scan" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.scanIndicator}>
            <View style={[styles.scanLine, { backgroundColor: colors.primary }]} />
          </View>
        )}
      </SafeAreaView>
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Looking up product...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  buttonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  viewfinder: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  topLeftCorner: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 20,
  },
  topRightCorner: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 20,
  },
  bottomLeftCorner: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
  },
  bottomRightCorner: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 20,
  },
  helpText: {
    position: 'absolute',
    top: '55%',
    alignSelf: 'center',
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanIndicator: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  scanLine: {
    width: '100%',
    height: '100%',
    transform: [{ translateX: -100 }],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});
