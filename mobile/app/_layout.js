import React, { useContext, useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, AuthContext } from '../src/context/AuthContext';
import { SyncProvider } from '../src/context/SyncContext';
import { View, ActivityIndicator } from 'react-native';

const InitialLayout = () => {
  const { authState, loading } = useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (authState.authenticated && !inTabsGroup) {
      router.replace('/(tabs)/home');
    } else if (!authState.authenticated && inTabsGroup) {
      router.replace('/login');
    }
  }, [authState.authenticated, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <InitialLayout />
      </SyncProvider>
    </AuthProvider>
  );
}
