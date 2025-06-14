import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, IconButton, List, ActivityIndicator, Card, Divider, useTheme, Searchbar, Portal, Modal } from 'react-native-paper';
import { Stack, useFocusEffect } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { getAllFoods, addConsumption, getCaloriesForDate } from '@/database/database';
import { Comida } from '@/database/entities';
import { useUser } from '@/context/UserContext';

export default function FoodTrackingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUserId } = useUser();
  const [foods, setFoods] = useState<Comida[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [dateCalories, setDateCalories] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [logDateInPicker, setLogDateInPicker] = useState(new Date());
  const [isProcessingLog, setIsProcessingLog] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUserId) {
      console.warn("No user ID found in loadData");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [fetchedFoods, fetchedCalories] = await Promise.all([
        getAllFoods(),
        getCaloriesForDate(currentUserId, selectedDate)
      ]);
      setFoods(fetchedFoods);
      setDateCalories(fetchedCalories);
    } catch (error) {
      console.error("Failed to load food data:", error);
      Alert.alert("Error", "Could not load food data.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      setSelectedQuantities({});
    }, [loadData])
  );

  const incrementQuantity = (foodId: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [foodId]: (prev[foodId] || 0) + 1,
    }));
  };

  const decrementQuantity = (foodId: number) => {
    setSelectedQuantities(prev => {
      const currentQuantity = prev[foodId] || 0;
      if (currentQuantity <= 1) {
        const { [foodId]: _, ...rest } = prev;
        return rest;
      } else {
        return {
          ...prev,
          [foodId]: currentQuantity - 1,
        };
      }
    });
  };

  const performLogFood = async (logDate: Date) => {
    if (isProcessingLog) return;
    
    const itemsToLog = Object.entries(selectedQuantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([foodId, quantity]) => ({ foodId: Number(foodId), quantity }));

    if (itemsToLog.length === 0 || !currentUserId) {
      setLogging(false);
      return;
    }

    setIsProcessingLog(true);
    setLogging(true);
    try {
      for (const { foodId, quantity } of itemsToLog) {
        const formattedDate = logDate.toISOString().slice(0, 19).replace('T', ' ');
        await addConsumption({
          usuario_id: currentUserId,
          comida_id: foodId,
          fecha: formattedDate,
          cantidad: quantity,
        });
      }
      Alert.alert("Success", `Food logged successfully for ${logDate.toLocaleDateString()}!`);

      if (logDate.toDateString() === selectedDate.toDateString()) {
        await loadData();
      }
      setSelectedQuantities({});
    } catch (error) {
      console.error("Failed to log food:", error);
      Alert.alert("Error", "Could not log food. Please try again.");
    } finally {
      setLogging(false);
      setIsProcessingLog(false);
    }
  };

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    
    if (event.type === 'dismissed') {
      return;
    }
    
    if (date && !isProcessingLog) {
      setLogDateInPicker(date);
      if (Platform.OS === 'android') {
        performLogFood(date);
      }
    }
  };

  const showLogDatePicker = () => {
     const itemsToLog = Object.values(selectedQuantities).some(quantity => quantity > 0);
     if (!itemsToLog) {
       Alert.alert("No Selection", "Please select at least one food item and set quantity > 0.");
       return;
     }
    setLogDateInPicker(new Date());
    setShowDatePicker(true);
  };

  const filteredFoods = foods.filter(food =>
    food.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Log Food' }} />

      <View style={styles.contentWrapper}>
        <Card style={styles.summaryCard}>
          <Card.Title title={`Intake for ${selectedDate.toLocaleDateString()}`} />
          <Card.Content>
            <Text variant="headlineMedium">{Math.round(dateCalories)} kcal</Text>
          </Card.Content>
        </Card>

      <ScrollView style={styles.listScrollView}>
        <List.Section title={`Available Foods (${filteredFoods.length})`}>
           <Searchbar
              placeholder="Search foods..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
           />
          {filteredFoods.length > 0 ? (
            filteredFoods.map((food) => (
              <List.Item
                key={food.id}
                title={food.nombre}
                description={`${food.valor_calorico ? Math.round(food.valor_calorico) : '?'} kcal ${food.descripcion ? `- ${food.descripcion}` : ''}`}
                right={() => {
                  const quantity = selectedQuantities[food.id] || 0;
                  return (
                    <View style={styles.quantityContainer}>
                      {quantity > 0 && (
                        <IconButton
                          icon="minus-circle-outline"
                          size={24}
                          onPress={() => decrementQuantity(food.id)}
                        />
                      )}
                      {quantity > 0 && (
                        <Text style={styles.quantityText}>{quantity}</Text>
                      )}
                      <IconButton
                        icon="plus-circle-outline"
                        size={24}
                        onPress={() => incrementQuantity(food.id)}
                        iconColor={theme.colors.primary}
                      />
                    </View>
                  );
                }}
                style={styles.listItem}
              />
            ))
          ) : (
            <List.Item title="No foods match your search." />
          )}
        </List.Section>
      </ScrollView>
     </View>
      <Button
          mode="contained"
          onPress={showLogDatePicker}
          style={[styles.logButton, { marginBottom: insets.bottom + 16 }]}
          disabled={logging || Object.values(selectedQuantities).every(q => q === 0)}
          loading={logging}
          icon="plus-circle"
        >
          Log Selected Food...
        </Button>
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={logDateInPicker}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  searchbar: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  listScrollView: {
    flex: 1,
    marginHorizontal: 8,
  },
  listItem: {
    paddingLeft: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    minWidth: 20,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 16,
  },
  logButton: {
    margin: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
  },
  modalContainer: {
    padding: 20,
    margin: 30,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    marginLeft: 8,
  },
});