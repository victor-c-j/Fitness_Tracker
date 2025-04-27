import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { initializeDatabase } from '@/database/database'; // No longer need hasUsers here
import { UserProvider } from '@/context/UserContext'; // Import UserProvider

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        if (loaded && !dbInitialized) {
          console.log('Fonts loaded, initializing database...');
          await initializeDatabase();
          setDbInitialized(true);
          console.log('Database initialized.');
          console.log('Hiding splash screen.');
          await SplashScreen.hideAsync();
        } else if (loaded && dbInitialized) {
           console.log('Already initialized, hiding splash screen.');
           await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.warn('Error during app preparation (DB init):', e);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [loaded, dbInitialized]);

  if (!loaded || !dbInitialized) {
    return null;
  }

  return (
    // Wrap everything with UserProvider
    <UserProvider>
      <PaperProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ title: 'Register' }} />
          <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </UserProvider>
  );
}
