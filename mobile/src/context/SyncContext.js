import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { AuthContext } from './AuthContext';

const SyncContext = createContext();

const SyncProvider = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [queue, setQueue] = useState([]);
  const { authState } = useContext(AuthContext);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      if (!offline) {
        processQueue();
      }
    });

    loadQueue();

    return () => unsubscribe();
  }, [authState.authenticated]);

  const loadQueue = async () => {
    const storedQueue = await AsyncStorage.getItem('syncQueue');
    if (storedQueue) {
      setQueue(JSON.parse(storedQueue));
    }
  };

  const saveQueue = async (newQueue) => {
    setQueue(newQueue);
    await AsyncStorage.setItem('syncQueue', JSON.stringify(newQueue));
  };

  const addToQueue = (request) => {
    const newQueue = [...queue, request];
    saveQueue(newQueue);
  };

  const processQueue = async () => {
    if (queue.length === 0) return;

    const currentQueue = [...queue];
    const newQueue = [];

    for (const request of currentQueue) {
      try {
        const formData = new FormData();
        Object.keys(request.data).forEach(key => {
          if (key === 'photo') {
            formData.append('photo', request.data.photo);
          } else {
            formData.append(key, request.data[key]);
          }
        });

        await axios.post(request.url, formData, { headers: request.headers });
      } catch (error) {
        newQueue.push(request); // Keep failed requests in the queue
      }
    }
    saveQueue(newQueue);
  };

  return (
    <SyncContext.Provider value={{ isOffline, addToQueue }}>
      {children}
    </SyncContext.Provider>
  );
};

export { SyncContext, SyncProvider };
