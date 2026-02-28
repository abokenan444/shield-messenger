/**
 * Shield Messenger — iOS App
 *
 * Privacy-first encrypted messenger over Tor.
 * All cryptographic operations run in the Rust core (libshieldmessenger.a).
 * React Native handles UI rendering only.
 *
 * @format
 */

import React from 'react';
import {StatusBar, LogBox} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

// Suppress non-critical warnings in development
LogBox.ignoreLogs(['Reanimated']);

function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

export default App;
