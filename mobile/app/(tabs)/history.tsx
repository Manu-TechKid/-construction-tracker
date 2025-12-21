import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../../src/context/AuthContext';

interface CheckinRecord {
  _id: string;
  checkinTime: string;
  checkoutTime?: string;
  status: string;
  checkinPhoto?: string;
  checkinSignature?: string;
  checkoutPhoto?: string;
  checkoutSignature?: string;
}

const HistoryScreen = () => {
  const [history, setHistory] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const authContext = useContext(AuthContext);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get('https://construction-tracker-webapp.onrender.com/api/v1/checkins/history');
        setHistory(response.data.data.checkins);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch check-in history.');
      }
      setLoading(false);
    };

    if (authContext?.authState.authenticated) {
      fetchHistory();
    }
  }, [authContext?.authState.authenticated]);

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

        const renderItem = ({ item }: { item: CheckinRecord }) => {
    return (
      <View style={styles.itemContainer}>
        <Text>Check-in: {new Date(item.checkinTime).toLocaleString()}</Text>
        {item.checkoutTime && <Text>Check-out: {new Date(item.checkoutTime).toLocaleString()}</Text>}
        <Text>Status: {item.status}</Text>
        <View style={styles.imageContainer}>
          {item.checkinPhoto && <Image source={{ uri: item.checkinPhoto }} style={styles.image} />}
          {item.checkinSignature && <Image source={{ uri: item.checkinSignature }} style={styles.image} />}
        </View>
        {item.checkoutTime && (
          <View style={styles.imageContainer}>
            {item.checkoutPhoto && <Image source={{ uri: item.checkoutPhoto }} style={styles.image} />}
            {item.checkoutSignature && <Image source={{ uri: item.checkoutSignature }} style={styles.image} />}
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={history}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  image: {
    width: 100,
    height: 75,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  list: {
    padding: 20,
  },
  itemContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default HistoryScreen;
