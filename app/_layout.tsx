// Import the screens patch early to prevent UIManager errors
import '../components/screens-patch';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { View, Text } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/useColorScheme';
import { initializeDatabase } from '@/database/database';
import { UserProvider } from '@/context/UserContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(err => 
  console.warn("Error preventing splash screen auto hide:", err)
);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });
  const [dbInitialized, setDbInitialized] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function prepareApp() {
      try {
        if (loaded && !dbInitialized) {
          console.log('Fonts loaded, initializing database...');
          await initializeDatabase();
          console.log('Database initialized successfully.');
          setDbInitialized(true);
        }
      } catch (e) {
        console.warn('Error during app preparation (DB init):', e);
        // Optionally re-throw or handle critical errors
      } finally {
        // Hiding the splash screen should happen once *all* essential resources are ready
        if (loaded && dbInitialized) {
           console.log('App ready, hiding splash screen...');
           await SplashScreen.hideAsync().catch(e => {
             console.warn('Error hiding splash screen:', e);
           });
        }
      }
    }

    if(loaded) { // Only run preparation logic if fonts are loaded
      prepareApp();
    }
  }, [loaded, dbInitialized]); // Depend on both loaded and dbInitialized

  // Return null or a loading indicator until both fonts and DB are ready.
  // This ensures UserProvider doesn't mount prematurely if it depends on DB/user state.
  if (!loaded || !dbInitialized) {
    console.log(`Resources status: Fonts loaded=${loaded}, DB initialized=${dbInitialized}. Waiting...`);
    return null; // Or return a dedicated loading component
  }
  
  console.log("Rendering main layout...");

  return (
    <PaperProvider>
      <UserProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ title: 'Register' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </UserProvider>
    </PaperProvider>
  );
}
