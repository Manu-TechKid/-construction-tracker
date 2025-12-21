import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Signature from 'react-native-signature-canvas';
import axios from 'axios';
import { AuthContext } from '../../src/context/AuthContext';
import { SyncContext, QueuedRequest } from '../../src/context/SyncContext';

const HomeScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<'checked-in' | 'checked-out'>('checked-out');
  const [loading, setLoading] = useState<boolean>(true);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const sigRef = useRef<Signature>(null);
  const authContext = useContext(AuthContext);
  const syncContext = useContext(SyncContext);

  useEffect(() => {
    (async () => {
      if (!authContext?.authState.authenticated) {
        setLoading(false);
        return;
      }

      let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        setErrorMsg('Permission to access camera was denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      try {
        const currentStatus = await axios.get('https://construction-tracker-webapp.onrender.com/api/v1/checkins/status');
        setStatus(currentStatus.data.data.status);
      } catch (e) {
        // Ignore error if user has no checkin history
      }
      setLoading(false);
    })();
  }, [authContext?.authState.authenticated]);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSignature = (signature: string) => {
    setSignature(signature);
  };

  const handleClearSignature = () => {
    sigRef.current?.clearSignature();
    setSignature(null);
  };

  const submit = async (endpoint: 'checkin' | 'checkout') => {
    if (!photo || !signature || !location) {
      Alert.alert('Missing Information', 'Please take a photo and provide a signature.');
      return;
    }

        if (syncContext?.isOffline) {
      const request: QueuedRequest = {
        url: `https://construction-tracker-webapp.onrender.com/api/v1/checkins/${endpoint}`,
        method: 'post',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          signature: signature,
          photo: {
            uri: photo.uri,
            name: `photo_${Date.now()}.jpg`,
            type: 'image/jpeg',
          },
        },
      };
      syncContext.addToQueue(request);
      const newStatus = endpoint === 'checkin' ? 'checked-in' : 'checked-out';
      setStatus(newStatus);
      setPhoto(null);
      setSignature(null);
      sigRef.current?.clearSignature();
      Alert.alert('Offline', 'Your request has been queued and will be sent when you are back online.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('latitude', String(location.coords.latitude));
      formData.append('longitude', String(location.coords.longitude));
      formData.append('signature', signature);
      formData.append('photo', {
        uri: photo.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      await axios.post(`https://construction-tracker-webapp.onrender.com/api/v1/checkins/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newStatus = endpoint === 'checkin' ? 'checked-in' : 'checked-out';
      setStatus(newStatus);
      setPhoto(null);
      setSignature(null);
      sigRef.current?.clearSignature();
      Alert.alert('Success', `You have been ${newStatus}.`);
    } catch (error) {
      Alert.alert('Error', `Failed to ${endpoint}.`);
    }
    setLoading(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      {syncContext?.isOffline && <Text style={styles.offlineText}>You are currently offline. Queued requests will be sent later.</Text>}
      <Text style={styles.status}>Your current status is: {status}</Text>

      {photo && <Image source={{ uri: photo.uri }} style={styles.photo} />}
      <Button title="Take Photo" onPress={takePhoto} />

      <Text style={styles.signatureTitle}>Signature:</Text>
      <View style={styles.signatureBox}>
        <Signature
          ref={sigRef}
          onOK={handleSignature}
          descriptionText=""
          clearText="Clear"
          confirmText="Confirm"
          webStyle={`.m-signature-pad--footer {display: none;} .m-signature-pad--body {border: 1px solid #000;}`}
        />
      </View>
      <Button title="Clear Signature" onPress={handleClearSignature} />

      <View style={styles.actionButton}>
        {status === 'checked-out' ? (
          <Button title="Check In" onPress={() => submit('checkin')} />
        ) : (
          <Button title="Check Out" onPress={() => submit('checkout')} />
        )}
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  offlineText: {
    color: 'orange',
    marginBottom: 10,
    textAlign: 'center',
  },
  photo: {
    width: 200,
    height: 150,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  signatureTitle: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  signatureBox: {
    width: 300,
    height: 200,
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },
  actionButton: {
    marginTop: 20,
    width: '80%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  status: {
    fontSize: 18,
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});

export default HomeScreen;
