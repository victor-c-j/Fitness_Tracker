import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  SafeAreaView,
  useColorScheme as _useColorScheme
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Helper to check if a date is in the past
const isPastDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export default function RestDaysScreen() {
  const colorScheme = useColorScheme();
  const [restDays, setRestDays] = useState<Date[]>([]);
  const [weeklyPattern, setWeeklyPattern] = useState<number[]>([]);
  const [isToday, setIsToday] = useState<boolean>(false);
  
  // Determine theme colors
  const textColor = Colors[colorScheme ?? 'light'].text;
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const iconColor = Colors[colorScheme ?? 'light'].icon;
  
  // Derived theme colors
  const cardBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : 'white';
  const subtextColor = colorScheme === 'dark' ? iconColor : '#666';
  const borderColor = colorScheme === 'dark' ? '#333' : '#f0f0f0';
  const dayButtonBg = colorScheme === 'dark' ? '#333' : '#f0f0f0';
  const restColor = colorScheme === 'dark' ? '#bb86fc' : '#6200ee';
  const restBannerColor = colorScheme === 'dark' ? '#6200ee' : '#d0bcff';
  const warningColor = colorScheme === 'dark' ? '#FF453A' : '#FF3B30';
  
  // Check if today is a rest day
  const checkIsRestDay = () => {
    const today = new Date();
    
    // Check for specific rest days
    const isTodayRestDay = restDays.some(day => isSameDay(day, today));
    
    // Check for weekly pattern (0 = Sunday, 6 = Saturday)
    const isWeeklyRestDay = weeklyPattern.includes(today.getDay());
    
    setIsToday(isTodayRestDay || isWeeklyRestDay);
  };
  
  // Load saved rest days
  useEffect(() => {
    const loadRestDays = async () => {
      try {
        const savedRestDays = await AsyncStorage.getItem('restDays');
        const savedPattern = await AsyncStorage.getItem('weeklyPattern');
        
        if (savedRestDays) {
          setRestDays(JSON.parse(savedRestDays).map((day: string) => new Date(day)));
        }
        
        if (savedPattern) {
          setWeeklyPattern(JSON.parse(savedPattern));
        }
      } catch (error) {
        console.error('Failed to load rest days:', error);
      }
      
      checkIsRestDay();
    };
    
    loadRestDays();
  }, []);
  
  // Save rest days whenever they change
  useEffect(() => {
    const saveRestDays = async () => {
      try {
        // Only store future rest days
        const futureRestDays = restDays.filter(day => !isPastDate(day));
        await AsyncStorage.setItem('restDays', JSON.stringify(futureRestDays.map(day => day.toISOString())));
        await AsyncStorage.setItem('weeklyPattern', JSON.stringify(weeklyPattern));
      } catch (error) {
        console.error('Failed to save rest days:', error);
      }
    };
    
    saveRestDays();
    checkIsRestDay();
  }, [restDays, weeklyPattern]);
  
  // Add a rest day
  const addRestDay = (daysFromNow: number) => {
    const newRestDay = addDays(new Date(), daysFromNow);
    newRestDay.setHours(0, 0, 0, 0);
    
    // Check if already exists
    if (restDays.some(day => isSameDay(day, newRestDay))) {
      Alert.alert('Already a rest day', 'This day is already marked as a rest day.');
      return;
    }
    
    setRestDays(prev => [...prev, newRestDay]);
  };
  
  // Remove a rest day
  const removeRestDay = (index: number) => {
    setRestDays(prev => prev.filter((_, i) => i !== index));
  };
  
  // Toggle weekly pattern day
  const toggleWeeklyDay = (day: number) => {
    setWeeklyPattern(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };
  
  // Get day name
  const getDayName = (day: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };
  
  // Render weekly pattern selector
  const renderWeeklyPattern = () => {
    return (
      <View style={[styles.weeklyPatternContainer, { backgroundColor: cardBackgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Weekly Rest Days</Text>
        <View style={styles.daysContainer}>
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                { backgroundColor: dayButtonBg },
                weeklyPattern.includes(day) && { backgroundColor: tintColor }
              ]}
              onPress={() => toggleWeeklyDay(day)}
            >
              <Text 
                style={[
                  styles.dayText, 
                  { color: textColor },
                  weeklyPattern.includes(day) && styles.selectedDayText
                ]}
              >
                {getDayName(day).charAt(0)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.helperText, { color: subtextColor }]}>
          Tap on days to set weekly recurring rest days
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: backgroundColor }]}>
      {/* Rest Day Banner */}
      {isToday && (
        <View style={[styles.restDayBanner, { backgroundColor: restBannerColor }]}>
          <MaterialIcons name="hotel" size={24} color="white" />
          <Text style={styles.restDayText}>Today is a Rest Day</Text>
          <Text style={styles.restDaySubText}>
            Take it easy, your body needs time to recover
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]}>Rest Day Planner</Text>
          
          {/* Quick Add Section */}
          <View style={[styles.quickAddContainer, { backgroundColor: cardBackgroundColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Add</Text>
            <View style={styles.quickButtonsRow}>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: tintColor }]}
                onPress={() => addRestDay(0)}
              >
                <Text style={styles.quickButtonText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: tintColor }]}
                onPress={() => addRestDay(1)}
              >
                <Text style={styles.quickButtonText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: tintColor }]}
                onPress={() => addRestDay(2)}
              >
                <Text style={styles.quickButtonText}>In 2 Days</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Weekly Pattern Section */}
          {renderWeeklyPattern()}
          
          {/* Scheduled Rest Days */}
          <View style={[styles.scheduledContainer, { backgroundColor: cardBackgroundColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Scheduled Rest Days</Text>
            {restDays.length === 0 ? (
              <Text style={[styles.noRestDaysText, { color: subtextColor }]}>
                No specific rest days scheduled. Use the buttons above to add some!
              </Text>
            ) : (
              restDays
                .filter(day => !isPastDate(day))
                .sort((a, b) => a.getTime() - b.getTime())
                .map((day, index) => (
                  <View key={index} style={[styles.restDayItem, { borderBottomColor: borderColor }]}>
                    <View style={styles.restDayInfo}>
                      <Text style={[styles.restDayDate, { color: textColor }]}>
                        {format(day, 'EEE, MMM d, yyyy')}
                      </Text>
                      {isSameDay(day, new Date()) && (
                        <View style={[styles.todayBadge, { backgroundColor: tintColor }]}>
                          <Text style={styles.todayText}>TODAY</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeRestDay(index)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="close" size={24} color={warningColor} />
                    </TouchableOpacity>
                  </View>
                ))
            )}
          </View>
          
          {/* Info Section */}
          <View style={[styles.infoContainer, { backgroundColor: cardBackgroundColor }]}>
            <MaterialIcons name="info-outline" size={24} color={tintColor} />
            <Text style={[styles.infoText, { color: subtextColor }]}>
              Rest days are essential for muscle recovery and growth. 
              Aim for 1-2 rest days per week depending on your workout intensity.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickAddContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  quickButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  weeklyPatternContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayButton: {
    // Color now set inline
  },
  dayText: {
    fontWeight: '600',
  },
  selectedDayText: {
    color: 'white',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  scheduledContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noRestDaysText: {
    textAlign: 'center',
    marginVertical: 16,
  },
  restDayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  restDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restDayDate: {
    fontSize: 16,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  todayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 4,
  },
  infoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  restDayBanner: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restDayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  restDaySubText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
}); 