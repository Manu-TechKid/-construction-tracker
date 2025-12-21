import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export interface QueuedRequest {
  url: string;
  method: 'post'; // Assuming only post requests for now
  headers: { [key: string]: string };
  data: any;
}

interface SyncContextType {
  isOffline: boolean;
  addToQueue: (request: QueuedRequest) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const authContext = useContext(AuthContext);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable);
      setIsOffline(offline);
      if (!offline) {
        processQueue();
      }
    });

    loadQueue();

    return () => unsubscribe();
  }, [authContext?.authState.authenticated]);

  const loadQueue = async () => {
    try {
      const storedQueue = await AsyncStorage.getItem('syncQueue');
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    } catch (e) {
      console.error('Failed to load sync queue from storage', e);
    }
  };

  const saveQueue = async (newQueue: QueuedRequest[]) => {
    setQueue(newQueue);
    await AsyncStorage.setItem('syncQueue', JSON.stringify(newQueue));
  };

  const addToQueue = (request: QueuedRequest) => {
    const newQueue = [...queue, request];
    saveQueue(newQueue);
  };

  const processQueue = async () => {
    if (queue.length === 0 || !authContext?.authState.authenticated) return;

    const currentQueue = [...queue];
    const remainingQueue: QueuedRequest[] = [];

    for (const request of currentQueue) {
      try {
        const formData = new FormData();
        Object.keys(request.data).forEach(key => {
          // FormData values must be string or Blob.
          // The photo object is handled correctly by default.
          formData.append(key, request.data[key]);
        });

        await axios.post(request.url, formData, { headers: request.headers });
      } catch (error) {
        console.error('Failed to process queued request:', error);
        remainingQueue.push(request); // Keep failed requests in the queue
      }
    }
    saveQueue(remainingQueue);
  };

  return (
    <SyncContext.Provider value={{ isOffline, addToQueue }}>
      {children}
    </SyncContext.Provider>
  );
};

export { SyncContext, SyncProvider };
