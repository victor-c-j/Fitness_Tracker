import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ImageBackground, Image, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, ActivityIndicator, Card, Menu, Divider, useTheme } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { getAllUsers } from '@/database/database';
import { useUser } from '@/context/UserContext';
import { Usuario } from '@/database/entities';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { setCurrentUserId } = useUser();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  // Theme colors
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const textColor = Colors[colorScheme ?? 'light'].text;
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const cardColor = colorScheme === 'dark' ? '#1E1E1E' : 'white';

  useEffect(() => {
    async function loadUsers() {
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
        // Select first user by default if exists
        if (fetchedUsers.length > 0) {
          setSelectedUser(fetchedUsers[0]);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const selectUser = (user: Usuario) => {
    setSelectedUser(user);
    closeMenu();
  };

  const handleLogin = () => {
    if (selectedUser) {
      setCurrentUserId(selectedUser.id);
      router.replace('/(tabs)');
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator animating={true} size="large" color={tintColor} />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading your fitness journey...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ 
        title: 'Fitness Tracker',
        headerShown: false
      }} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons 
            name="run-fast" 
            size={80} 
            color={tintColor} 
            style={styles.logo}
          />
          <Text 
            variant="displayMedium" 
            style={[styles.title, { color: textColor }]}
          >
            Fitness Tracker
          </Text>
          <Text 
            variant="bodyLarge" 
            style={[styles.subtitle, { color: textColor }]}
          >
            Your personal health companion
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: cardColor }]} elevation={4}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.cardTitle, { color: textColor }]}>
              Get Started
            </Text>
            
            <Text variant="bodyMedium" style={[styles.welcomeText, { color: textColor }]}>
              Track your runs, monitor your health, and achieve your fitness goals.
            </Text>

            {users.length > 0 ? (
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                contentStyle={{ backgroundColor: cardColor }}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={openMenu}
                    style={[styles.button, { borderColor: tintColor }]}
                    labelStyle={{ color: textColor }}
                    icon={({ size, color }) => (
                      <MaterialIcons name="person" size={size} color={tintColor} />
                    )}
                  >
                    {selectedUser ? selectedUser.nombre : 'Select User'}
                  </Button>
                }>
                {users.map((user) => (
                  <Menu.Item
                    key={user.id}
                    onPress={() => selectUser(user)}
                    title={user.nombre || `User ${user.id}`}
                    titleStyle={{ color: textColor }}
                    leadingIcon="account"
                  />
                ))}
              </Menu>
            ) : (
              <Text style={[styles.infoText, { color: textColor }]}>
                No users found. Please register.
              </Text>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              style={[styles.button, { backgroundColor: tintColor }]}
              disabled={!selectedUser}
              icon={({ size, color }) => (
                <MaterialIcons name="login" size={size} color={color} />
              )}
            >
              Continue as {selectedUser ? selectedUser.nombre : '...'}
            </Button>

            <View style={styles.dividerContainer}>
              <Divider style={styles.divider} />
              <Text style={[styles.dividerText, { color: textColor }]}>OR</Text>
              <Divider style={styles.divider} />
            </View>

            <Button
              mode="outlined"
              onPress={handleRegister}
              style={[styles.button, { borderColor: tintColor }]}
              labelStyle={{ color: tintColor }}
              icon={({ size, color }) => (
                <MaterialIcons name="person-add" size={size} color={tintColor} />
              )}
            >
              Create New Profile
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textColor }]}>
            Start your fitness journey today
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    marginTop: 20,
  },
  cardTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.7,
  },
});