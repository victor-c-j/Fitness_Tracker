import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Avatar, useTheme, FAB, Divider } from 'react-native-paper';
import CircularProgress from 'react-native-circular-progress-indicator';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUser } from '@/context/UserContext';
import { getUserById, getCaloriesForDate } from '@/database/database';
import { useFocusEffect, router } from 'expo-router';
import HealthTracker from '@/services/HealthTracker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { Colors } from '@/constants/Colors';

// Constants for calorie calculations
const DEFAULT_BMR = 2000;
const SEDENTARY_FACTOR = 0.4;
const DEFAULT_AGE = 30;
const DEFAULT_STEP_GOAL = 10000;

type ScheduledRun = {
  id: string;
  title: string;
  dateTime: string;
  days: number[];
  isRecurring: boolean;
  notificationIds: string[];
  notifyBefore: number;
  active: boolean;
};

export default function HomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { currentUserId } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [isRestDay, setIsRestDay] = useState(false);
  const [upcomingRuns, setUpcomingRuns] = useState<ScheduledRun[]>([]);
  
  // Theme colors
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const textColor = Colors[colorScheme ?? 'light'].text;
  const iconColor = Colors[colorScheme ?? 'light'].icon;
  const subtextColor = colorScheme === 'dark' ? iconColor : '#666';
  const cardBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : 'white';

  // Consolidated user data state
  const [userData, setUserData] = useState({
    name: null as string | null,
    height: null as number | null,
    weight: null as number | null,
    caloriesConsumed: 0,
  });
  
  // Health data from HealthKit/GoogleFit
  const [healthData, setHealthData] = useState({
    steps: 0,
    stepGoal: DEFAULT_STEP_GOAL,
    distanceKm: 0,
    caloriesBurned: 0,
    sleepHours: 0,
    heartRate: 0,
    lastActivity: "No recent activity",
    lastActivityTime: "",
  });
  
  // Initialize health tracking
  const initializeHealthTracking = useCallback(async () => {
    try {
      const initialized = await HealthTracker.initialize();
      
      if (initialized) {
        console.log('Health tracking initialized successfully');
        await refreshHealthData();
      } else {
        console.log('Health tracking initialization failed');
      }
    } catch (error) {
      console.error('Error initializing health tracking:', error);
    }
  }, []);
  
  // Refresh health data
  const refreshHealthData = useCallback(async () => {
    try {
      const data = await HealthTracker.refreshHealthData();
      
      setHealthData(prevData => ({
        ...prevData,
        steps: data.steps,
        distanceKm: data.distanceKm,
        caloriesBurned: data.caloriesBurned,
        sleepHours: data.sleepHours,
        heartRate: data.heartRate,
      }));
    } catch (error) {
      console.error('Error refreshing health data:', error);
    }
  }, []);
  
  // Fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!currentUserId) {
      setUserData(prev => ({ 
        ...prev, 
        name: null, 
        height: null, 
        weight: null 
      }));
      return;
    }
    
    try {
      const user = await getUserById(currentUserId);
      setUserData(prev => ({
        ...prev,
        name: user?.nombre ?? null,
        height: user?.altura ?? null,
        weight: user?.peso ?? null,
      }));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setUserData(prev => ({ 
        ...prev, 
        name: null, 
        height: null, 
        weight: null 
      }));
    }
  }, [currentUserId]);
  
  // Fetch calories consumed
  const fetchCaloriesConsumed = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const today = new Date();
      const consumed = await getCaloriesForDate(currentUserId, today);
      setUserData(prev => ({ ...prev, caloriesConsumed: consumed }));
    } catch (error) {
      console.error("Failed to fetch calories consumed:", error);
      setUserData(prev => ({ ...prev, caloriesConsumed: 0 }));
    }
  }, [currentUserId]);

  // Check if today is a rest day
  const checkRestDay = useCallback(async () => {
    try {
      // Check specific rest days
      const savedRestDays = await AsyncStorage.getItem('restDays');
      if (savedRestDays) {
        const restDays = JSON.parse(savedRestDays);
        const today = new Date();
        
        // Check if today is a specific rest day
        const isTodayRestDay = restDays.some((dayString: string) => {
          const day = new Date(dayString);
          return isSameDay(day, today);
        });
        
        if (isTodayRestDay) {
          setIsRestDay(true);
          return;
        }
      }
      
      // Check weekly pattern
      const savedPattern = await AsyncStorage.getItem('weeklyPattern');
      if (savedPattern) {
        const weeklyPattern = JSON.parse(savedPattern);
        const today = new Date();
        
        // Check if today is in the weekly pattern (0 = Sunday, 6 = Saturday)
        if (weeklyPattern.includes(today.getDay())) {
          setIsRestDay(true);
          return;
        }
      }
      
      setIsRestDay(false);
    } catch (error) {
      console.error('Error checking rest day:', error);
      setIsRestDay(false);
    }
  }, []);

  // Load upcoming runs
  const loadUpcomingRuns = useCallback(async () => {
    try {
      const savedSchedules = await AsyncStorage.getItem('runningSchedules');
      if (savedSchedules) {
        const schedules: ScheduledRun[] = JSON.parse(savedSchedules);
        const filteredSchedules = schedules
          .filter(schedule => schedule.active)
          .filter(schedule => {
            // Filter only upcoming runs (today or future)
            if (schedule.isRecurring) {
              // For recurring, always show if active
              return true;
            } else {
              // For one-time, check if it's today or future
              const scheduleDate = new Date(schedule.dateTime);
              return isToday(scheduleDate) || scheduleDate > new Date();
            }
          })
          .sort((a, b) => {
            // Sort by date
            return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
          })
          .slice(0, 3); // Show only next 3 upcoming runs
        
        setUpcomingRuns(filteredSchedules);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  }, []);
  
  // Initial data loading
  useEffect(() => {
    fetchUserProfile();
    initializeHealthTracking();
    checkRestDay();
    loadUpcomingRuns();
  }, [fetchUserProfile, initializeHealthTracking, checkRestDay, loadUpcomingRuns]);
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCaloriesConsumed();
      refreshHealthData();
      checkRestDay();
      loadUpcomingRuns();
    }, [fetchCaloriesConsumed, refreshHealthData, checkRestDay, loadUpcomingRuns])
  );
  
  // Calculate BMR based on user data
  const calculateBMR = useCallback(() => {
    const { weight, height } = userData;
    if (!weight || !height) return DEFAULT_BMR;
    
    // BMR formula: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5 (for males)
    return (10 * weight) + (6.25 * height) - (5 * DEFAULT_AGE) + 5;
  }, [userData.weight, userData.height]);
  
  // Calculate total calories burned and net calories
  const calorieCalculations = useMemo(() => {
    const bmr = calculateBMR();
    // Use real calories burned data if available, otherwise use a formula
    const totalCaloriesBurned = healthData.caloriesBurned > 0 
      ? healthData.caloriesBurned 
      : bmr * SEDENTARY_FACTOR;
    
    return {
      caloriesBurned: Math.round(totalCaloriesBurned),
      netCalories: Math.round(userData.caloriesConsumed - totalCaloriesBurned)
    };
  }, [userData.caloriesConsumed, calculateBMR, healthData.caloriesBurned]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserProfile(),
      fetchCaloriesConsumed(),
      refreshHealthData(),
      checkRestDay(),
      loadUpcomingRuns()
    ]);
    setRefreshing(false);
  }, [fetchUserProfile, fetchCaloriesConsumed, refreshHealthData, checkRestDay, loadUpcomingRuns]);

  // Format date for upcoming runs
  const formatRunDate = (dateTimeStr: string, isRecurring: boolean, days: number[]) => {
    if (isRecurring) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Weekly on ${days.map(day => dayNames[day]).join(', ')}`;
    } else {
      const runDate = new Date(dateTimeStr);
      if (isToday(runDate)) {
        return 'Today';
      }
      return format(runDate, 'EEE, MMM d');
    }
  };

  // Format time for upcoming runs
  const formatRunTime = (dateTimeStr: string) => {
    return format(new Date(dateTimeStr), 'h:mm a');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[tintColor]} />
        }
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ color: textColor }}>
            Welcome{userData.name ? `, ${userData.name}` : ''}!
          </Text>
          <Text variant="bodyMedium" style={{ color: subtextColor }}>
            Here's your daily summary:
          </Text>
        </View>

        {/* Rest Day Banner */}
        {isRestDay && (
          <Card style={[styles.restDayCard, { backgroundColor: tintColor }]}>
            <Card.Content style={styles.restDayCardContent}>
              <MaterialIcons name="hotel" size={24} color="white" />
              <View style={styles.restDayTextContainer}>
                <Text variant="titleMedium" style={styles.restDayText}>Today is a Rest Day</Text>
                <Text variant="bodySmall" style={styles.restDaySubText}>
                  Take it easy, your body needs time to recover
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => router.push("/(tabs)/rest-days")}
              >
                <MaterialIcons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        <View style={styles.progressContainer}>
          <CircularProgress
            value={healthData.steps}
            maxValue={healthData.stepGoal}
            radius={80}
            title={'Steps'}
            titleStyle={{ ...styles.progressTitle, color: subtextColor }}
            progressValueStyle={{ ...styles.progressValue, color: textColor }}
            activeStrokeColor={tintColor}
            inActiveStrokeColor={theme.colors.surfaceDisabled}
            inActiveStrokeOpacity={0.5}
            activeStrokeWidth={10}
            inActiveStrokeWidth={10}
            duration={1000}
          />
        </View>

        <Card style={[styles.calorieCard, { backgroundColor: cardBackgroundColor }]}>
          <Card.Title 
            title="Today's Calorie Balance" 
            titleStyle={{ color: textColor }}
          />
          <Card.Content style={styles.calorieCardContent}>
            <View style={styles.calorieItem}>
              <Text variant="titleLarge" style={{ color: textColor }}>{Math.round(userData.caloriesConsumed)}</Text>
              <Text variant="bodyMedium" style={{ color: subtextColor }}>Consumed</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text variant="titleLarge" style={{ color: textColor }}>{calorieCalculations.caloriesBurned}</Text>
              <Text variant="bodyMedium" style={{ color: subtextColor }}>Burned</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text variant="titleLarge" style={{ color: textColor }}>{calorieCalculations.netCalories}</Text>
              <Text variant="bodyMedium" style={{ color: subtextColor }}>Net Balance</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.grid}>
          <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="map-marker-distance"
                style={[styles.icon, { backgroundColor: tintColor }]}
                color={'white'}
              />
              <View>
                <Text variant="titleMedium" style={{ color: textColor }}>{healthData.distanceKm.toFixed(1)} km</Text>
                <Text variant="bodySmall" style={{ color: subtextColor }}>Distance</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="bed"
                style={[styles.icon, { backgroundColor: tintColor }]}
                color={'white'}
              />
              <View>
                <Text variant="titleMedium" style={{ color: textColor }}>{healthData.sleepHours.toFixed(1)} hr</Text>
                <Text variant="bodySmall" style={{ color: subtextColor }}>Sleep</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="heart-pulse"
                style={[styles.icon, { backgroundColor: tintColor }]}
                color={'white'}
              />
              <View>
                <Text variant="titleMedium" style={{ color: textColor }}>{healthData.heartRate || '–'}</Text>
                <Text variant="bodySmall" style={{ color: subtextColor }}>Heart Rate</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Upcoming Runs Section */}
        <Card style={[styles.upcomingCard, { backgroundColor: cardBackgroundColor }]}>
          <Card.Title 
            title="Upcoming Runs" 
            titleStyle={{ color: textColor }}
            right={(props) => (
              <TouchableOpacity 
                onPress={() => router.push("/(tabs)/schedule")}
                style={{ marginRight: 16 }}
              >
                <Text style={{ color: tintColor }}>View All</Text>
              </TouchableOpacity>
            )}
          />
          <Card.Content>
            {upcomingRuns.length === 0 ? (
              <View style={styles.emptySchedule}>
                <Text style={{ color: subtextColor, textAlign: 'center' }}>
                  No upcoming runs scheduled
                </Text>
                <TouchableOpacity 
                  style={[styles.scheduleButton, { backgroundColor: tintColor }]}
                  onPress={() => router.push("/(tabs)/schedule")}
                >
                  <Text style={{ color: 'white' }}>Schedule a Run</Text>
                </TouchableOpacity>
              </View>
            ) : (
              upcomingRuns.map((run, index) => (
                <View key={run.id}>
                  {index > 0 && <Divider style={{ marginVertical: 8 }} />}
                  <View style={styles.upcomingRun}>
                    <View style={styles.runInfo}>
                      <View style={styles.runTimeContainer}>
                        <MaterialIcons name="schedule" size={16} color={subtextColor} style={{ marginRight: 4 }} />
                        <Text style={{ color: subtextColor, fontSize: 12 }}>
                          {formatRunTime(run.dateTime)}
                        </Text>
                      </View>
                      <Text style={{ color: textColor, fontSize: 16, fontWeight: '500', marginVertical: 4 }}>
                        {run.title}
                      </Text>
                      <View style={styles.runDateContainer}>
                        <MaterialIcons name="event" size={16} color={subtextColor} style={{ marginRight: 4 }} />
                        <Text style={{ color: subtextColor, fontSize: 12 }}>
                          {formatRunDate(run.dateTime, run.isRecurring, run.days)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push("/(tabs)/schedule")}
                    >
                      <MaterialIcons name="chevron-right" size={24} color={subtextColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* FAB to start recording a run */}
      <FAB
        icon="run-fast"
        style={[styles.fab, { backgroundColor: tintColor }]}
        onPress={() => router.push("/(tabs)/map")}
        color="#fff"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 80, // Add extra padding at the bottom
  },
  header: {
    marginBottom: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 18,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  calorieCard: {
    marginBottom: 20,
    elevation: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  calorieCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  calorieItem: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '31%',
    elevation: 2,
    borderRadius: 12,
  },
  cardContent: {
    padding: 8,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  upcomingCard: {
    marginBottom: 20,
    elevation: 2,
    borderRadius: 12,
  },
  upcomingRun: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  runInfo: {
    flex: 1,
  },
  runTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptySchedule: {
    padding: 16,
    alignItems: 'center',
  },
  scheduleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 70, // Increase to position above tab bar
  },
  restDayCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 3,
  },
  restDayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restDayTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  restDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  restDaySubText: {
    color: 'white',
    opacity: 0.8,
  },
  viewDetailsButton: {
    padding: 8,
  },
});
