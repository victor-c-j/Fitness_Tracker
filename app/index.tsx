import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, ActivityIndicator, Card, Menu, Divider } from 'react-native-paper'; // Add Menu, Divider
import { useRouter, Stack } from 'expo-router';
import { getAllUsers } from '@/database/database'; // Use getAllUsers instead of hasUsers
import { useUser } from '@/context/UserContext'; // Import useUser hook
import { Usuario } from '@/database/entities'; // Import Usuario type

export default function WelcomeScreen() {
  const router = useRouter();
  const { setCurrentUserId } = useUser(); // Get context setter
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

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
      setCurrentUserId(selectedUser.id); // Set user ID in context
      router.replace('/(tabs)'); // Navigate to main app
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={styles.loadingText}>Checking Setup...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Welcome' }} />
      <Card style={styles.card}>
        <Card.Title title="Fitness Tracker" titleVariant="headlineLarge" style={styles.appTitle} />
        <Card.Content>
          <Text variant="bodyLarge" style={styles.welcomeText}>
            Welcome to your personal fitness companion.
          </Text>
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.button}
            icon="account-plus"
          >
            Register
          </Button>
          {users.length > 0 ? (
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <Button
                  mode="outlined"
                  onPress={openMenu}
                  style={styles.button}
                  icon="account-circle-outline"
                >
                  {selectedUser ? selectedUser.nombre : 'Select User'}
                </Button>
              }>
              {users.map((user) => (
                <Menu.Item
                  key={user.id}
                  onPress={() => selectUser(user)}
                  title={user.nombre || `User ${user.id}`}
                />
              ))}
            </Menu>
          ) : (
             <Text style={styles.infoText}>
               No users found. Please register.
             </Text>
          )}

          <Button
            mode="outlined"
            onPress={handleLogin}
            style={styles.button}
            disabled={!selectedUser} // Disable if no user is selected
            icon="login"
          >
            Login as {selectedUser ? selectedUser.nombre : '...'}
          </Button>
        </Card.Content>
      </Card>
    </SafeAreaView>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 16,
  },
  appTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 12,
    paddingVertical: 4,
  },
  loadingText: {
    marginTop: 10,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});