import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Appbar,
  Card,
  HelperText,
  Text,
  useTheme,
} from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { addUser } from '@/database/database';
import { NewUsuario } from '@/database/entities';
import { useUser } from '@/context/UserContext';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setCurrentUserId } = useUser();

  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');

  const [errors, setErrors] = useState({
    nombre: false,
    edad: false,
    altura: false,
    peso: false,
  });

  const validateInput = () => {
    let isValid = true;
    const newErrors = { nombre: false, edad: false, altura: false, peso: false };

    if (!nombre.trim()) {
      newErrors.nombre = true;
      isValid = false;
    }
    if (!edad || isNaN(Number(edad)) || Number(edad) <= 0) {
      newErrors.edad = true;
      isValid = false;
    }
    if (!altura || isNaN(Number(altura)) || Number(altura) <= 0) {
      newErrors.altura = true;
      isValid = false;
    }
    if (!peso || isNaN(Number(peso)) || Number(peso) <= 0) {
      newErrors.peso = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateInput()) {
      Alert.alert('Error', 'Please check the input fields.');
      return;
    }

    const newUser: NewUsuario = {
      nombre: nombre.trim(),
      edad: Number(edad),
      altura: Number(altura),
      peso: Number(peso),
      metabolismo: null,
    };

    try {
      const userId = await addUser(newUser);
      console.log(`User registered successfully with ID: ${userId}`);
      setCurrentUserId(userId);
      router.replace('/(tabs)');

    } catch (error) {
      console.error(error);
      Alert.alert('Registration Failed', 'Could not register user. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Register New User' }} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Title title="Enter Your Details" titleVariant="headlineMedium" />
          <Card.Content>
            <TextInput
              label="Name"
              value={nombre}
              onChangeText={setNombre}
              mode="outlined"
              style={styles.input}
              error={errors.nombre}
              left={<TextInput.Icon icon="account" />}
            />
            <HelperText type="error" visible={errors.nombre}>
              Name is required
            </HelperText>

            <TextInput
              label="Age"
              value={edad}
              onChangeText={setEdad}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={errors.edad}
              left={<TextInput.Icon icon="cake-variant" />}
            />
            <HelperText type="error" visible={errors.edad}>
              Valid age is required
            </HelperText>

            <TextInput
              label="Height (cm)"
              value={altura}
              onChangeText={setAltura}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={errors.altura}
              left={<TextInput.Icon icon="human-male-height" />}
            />
            <HelperText type="error" visible={errors.altura}>
              Valid height is required
            </HelperText>

            <TextInput
              label="Weight (kg)"
              value={peso}
              onChangeText={setPeso}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={errors.peso}
              left={<TextInput.Icon icon="weight-kilogram" />}
            />
            <HelperText type="error" visible={errors.peso}>
              Valid weight is required
            </HelperText>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              icon="account-plus"
            >
              Register
            </Button>
          </Card.Actions>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    padding: 8,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
});