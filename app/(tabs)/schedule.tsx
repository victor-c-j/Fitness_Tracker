import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  Platform,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  AppState,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addMinutes, isBefore, isToday, isPast, parseISO } from 'date-fns';
import { useUser } from '@/context/UserContext';
import { addScheduledRun, getScheduledRunsByUserId, updateScheduledRun, deleteScheduledRun } from '@/database/database';
import { ScheduledRun as DBScheduledRun, NewScheduledRun } from '@/database/entities';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Motivational messages for notifications
const MOTIVATIONAL_MESSAGES = [
  "Time to hit the road! Your future self will thank you.",
  "Your running shoes are calling! Let's crush this workout.",
  "Every run is an opportunity to become stronger. Get ready!",
  "Rain or shine, it's running time! You've got this.",
  "Remember why you started. Your running session begins soon!",
  "One run can change your day. Get ready to transform!",
  "You'll never regret the run you're about to take.",
  "Running time approaching. Set your mind, lace up your shoes!",
  "Your dedication is inspiring. Time to show up for yourself!",
  "The hardest step is the first one out the door. You're almost there!",
];

// Get a random motivational message
const getRandomMessage = () => {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[randomIndex];
};

// Schedule type
type ScheduledRun = {
  id: number;
  usuario_id: number;
  title: string;
  dateTime: string;
  days: number[]; // For weekly recurring (0 = Sunday, 6 = Saturday)
  isRecurring: boolean;
  notificationIds: string[]; // To track and cancel notifications
  active: boolean;
};

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const { currentUserId } = useUser();
  const [schedules, setSchedules] = useState<ScheduledRun[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduledRun>({
    id: 0,
    usuario_id: currentUserId || 0,
    title: '',
    dateTime: new Date().toISOString(),
    days: [],
    isRecurring: false,
    notificationIds: [],
    active: true,
  });
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  
  // Theme colors from app's theme system
  const textColor = Colors[colorScheme ?? 'light'].text;
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const iconColor = Colors[colorScheme ?? 'light'].icon;
  const tabIconDefaultColor = Colors[colorScheme ?? 'light'].tabIconDefault;
  
  // Derived theme colors
  const cardBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : 'white';
  const subtextColor = colorScheme === 'dark' ? iconColor : '#666';
  const borderColor = colorScheme === 'dark' ? '#333' : '#f0f0f0';
  const warningColor = colorScheme === 'dark' ? '#FF9500' : '#FF9500';
  const errorColor = colorScheme === 'dark' ? '#FF453A' : '#FF3B30';
  const successColor = colorScheme === 'dark' ? '#32D74B' : '#34C759';
  const accentColor = colorScheme === 'dark' ? '#0A84FF' : '#007AFF';
  
  // Check current notification permission status
  const checkNotificationPermission = async () => {
    if (Device.isDevice) {
      const { status } = await Notifications.getPermissionsAsync();
      const isGranted = status === 'granted';
      setNotificationPermission(isGranted);
      return isGranted;
    }
    return false;
  };
  
  // Request notification permissions
  useEffect(() => {
    checkNotificationPermission();
    
    // Load saved schedules
    loadSchedules();
    
    // Set notification listener
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    
    // Set app state change listener to refresh permission status
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkNotificationPermission();
      }
    });
    
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      subscription.remove();
    };
  }, []);
  
  // Load schedules from database
  const loadSchedules = async () => {
    if (!currentUserId) return;
    
    try {
      const dbSchedules = await getScheduledRunsByUserId(currentUserId);
      const formattedSchedules: ScheduledRun[] = dbSchedules.map((schedule: DBScheduledRun) => ({
        id: schedule.id,
        usuario_id: schedule.usuario_id,
        title: schedule.title,
        dateTime: schedule.dateTime,
        days: JSON.parse(schedule.days),
        isRecurring: schedule.isRecurring,
        notificationIds: JSON.parse(schedule.notificationIds),
        active: schedule.active,
      }));
      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };
  
  // Schedule notifications
  const scheduleNotifications = async (schedule: ScheduledRun): Promise<string[]> => {
    if (!notificationPermission) {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications to receive reminders for your runs',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => registerForPushNotificationsAsync() }
        ]
      );
      return [];
    }
    
    const notificationIds: string[] = [];
    const NOTIFY_BEFORE = 30; // Default notification time in minutes
    
    try {
      if (schedule.isRecurring) {
        // Schedule weekly recurring notifications
        for (const day of schedule.days) {
          const notificationId = await scheduleWeeklyNotification(
            schedule.title,
            day,
            schedule.dateTime,
            NOTIFY_BEFORE
          );
          if (notificationId) {
            notificationIds.push(notificationId);
          }
        }
      } else {
        // Schedule one-time notification
        const runTime = new Date(schedule.dateTime);
        const notifyTime = addMinutes(runTime, -NOTIFY_BEFORE);
        
        if (isBefore(notifyTime, new Date())) {
          console.log('Notification time is in the past, not scheduling');
          return [];
        }
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Upcoming Run',
            body: `${getRandomMessage()} Your scheduled run "${schedule.title}" starts in ${NOTIFY_BEFORE} minutes.`,
            sound: true,
            data: { scheduleId: schedule.id },
          },
          trigger: {
            type: 'timeInterval',
            seconds: Math.floor((notifyTime.getTime() - new Date().getTime()) / 1000),
            repeats: false,
          } as Notifications.NotificationTriggerInput,
        });
        
        if (notificationId) {
          notificationIds.push(notificationId);
        }
      }
      
      return notificationIds;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return [];
    }
  };
  
  // Schedule a weekly recurring notification
  const scheduleWeeklyNotification = async (
    title: string,
    weekDay: number,
    timeString: string,
    notifyBefore: number
  ): Promise<string | null> => {
    try {
      const timeOfDay = new Date(timeString);
      const localTime = new Date(timeOfDay.getTime() - timeOfDay.getTimezoneOffset() * 60000);
      let hour = localTime.getHours();
      let minute = localTime.getMinutes() - notifyBefore;
      
      // Adjust for negative minutes
      if (minute < 0) {
        hour = (hour - 1 + 24) % 24;
        minute = 60 + minute;
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Run',
          body: `${getRandomMessage()} Your weekly ${getDayName(weekDay)} run "${title}" starts in ${notifyBefore} minutes.`,
          sound: true,
        },
        trigger: {
          type: 'daily',
          hour,
          minute,
          repeats: true,
        } as Notifications.NotificationTriggerInput,
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling weekly notification:', error);
      return null;
    }
  };
  
  // Cancel scheduled notifications
  const cancelScheduledNotifications = async (notificationIds: string[]) => {
    try {
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  };
  
  // Toggle schedule active state
  const toggleScheduleActive = async (id: number) => {
    try {
      const schedule = schedules.find(s => s.id === id);
      if (!schedule) return;

      const updatedSchedule = {
        ...schedule,
        active: !schedule.active,
      };

      // Update in database
      await updateScheduledRun(id, {
        usuario_id: schedule.usuario_id,
        title: schedule.title,
        dateTime: schedule.dateTime,
        days: JSON.stringify(schedule.days),
        isRecurring: schedule.isRecurring,
        notificationIds: JSON.stringify(schedule.notificationIds),
        active: !schedule.active,
      });

      // Update UI state
      setSchedules(prevSchedules => 
        prevSchedules.map(s => 
          s.id === id ? updatedSchedule : s
        )
      );

      // Handle notifications
      if (!updatedSchedule.active) {
        // Cancel notifications if schedule is deactivated
        await cancelScheduledNotifications(schedule.notificationIds);
      } else {
        // Reschedule notifications if schedule is activated
        const notificationIds = await scheduleNotifications(updatedSchedule);
        await updateScheduledRun(id, {
          notificationIds: JSON.stringify(notificationIds),
        });
      }
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      Alert.alert('Error', 'Failed to update schedule status');
    }
  };
  
  // Edit a schedule
  const editSchedule = (schedule: ScheduledRun) => {
    setCurrentSchedule(schedule);
    setEditMode(true);
    setModalVisible(true);
  };
  
  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setDatePickerVisible(false);
    if (selectedDate) {
      const currentDateTime = new Date(currentSchedule.dateTime);
      selectedDate.setHours(currentDateTime.getHours());
      selectedDate.setMinutes(currentDateTime.getMinutes());
      
      setCurrentSchedule(prev => ({
        ...prev,
        dateTime: selectedDate.toISOString(),
      }));
    }
  };
  
  // Handle time change
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setTimePickerVisible(false);
    if (selectedTime) {
      const currentDateTime = new Date(currentSchedule.dateTime);
      currentDateTime.setHours(selectedTime.getHours());
      currentDateTime.setMinutes(selectedTime.getMinutes());
      
      setCurrentSchedule(prev => ({
        ...prev,
        dateTime: currentDateTime.toISOString(),
      }));
    }
  };
  
  // Handle tapping the enable notifications button
  const handleEnableNotifications = async () => {
    const granted = await registerForPushNotificationsAsync();
    if (granted === 'granted') {
      setNotificationPermission(true);
      // Show feedback for the user
      Alert.alert('Notifications Enabled', 'You will now receive notifications before your scheduled runs.');
    }
  };
  
  // Register for push notifications
  async function registerForPushNotificationsAsync() {
    let token;
    let status = 'denied';
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      status = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        status = newStatus;
      }
      
      // Regardless of the outcome, refresh our permission state
      await checkNotificationPermission();
      
      if (status !== 'granted') {
        Alert.alert('Warning', 'Failed to get push token for notification!');
        return status;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo push token:', token);
    } else {
      Alert.alert('Warning', 'Must use physical device for Push Notifications');
    }
    
    return status;
  }
  
  // Render day picker buttons
  const renderDayPicker = () => {
    return (
      <View style={styles.daysContainer}>
        {[0, 1, 2, 3, 4, 5, 6].map(day => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              { backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' },
              currentSchedule.days.includes(day) && { backgroundColor: tintColor }
            ]}
            onPress={() => toggleDay(day)}
          >
            <Text 
              style={[
                styles.dayText, 
                { color: textColor },
                currentSchedule.days.includes(day) && { color: 'white' }
              ]}
            >
              {getDayName(day).charAt(0)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // Handle adding or updating a schedule
  const handleSaveSchedule = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'No user selected');
      return;
    }

    if (!currentSchedule.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your run');
      return;
    }
    
    // Validate date for non-recurring schedules
    if (!currentSchedule.isRecurring) {
      const scheduleDate = new Date(currentSchedule.dateTime);
      if (isPast(scheduleDate) && !isToday(scheduleDate)) {
        Alert.alert('Error', 'Please select a future date for your run');
        return;
      }
    } else if (currentSchedule.days.length === 0) {
      Alert.alert('Error', 'Please select at least one day for recurring runs');
      return;
    }
    
    // Cancel previous notifications if updating
    if (editMode && currentSchedule.notificationIds.length > 0) {
      await cancelScheduledNotifications(currentSchedule.notificationIds);
    }
    
    // Schedule new notifications and get IDs
    const notificationIds = await scheduleNotifications(currentSchedule);
    
    const newSchedule: NewScheduledRun = {
      usuario_id: currentUserId,
      title: currentSchedule.title,
      dateTime: currentSchedule.dateTime,
      days: JSON.stringify(currentSchedule.days),
      isRecurring: currentSchedule.isRecurring,
      notificationIds: JSON.stringify(notificationIds),
      active: currentSchedule.active,
    };
    
    try {
      if (editMode) {
        await updateScheduledRun(currentSchedule.id, newSchedule);
      } else {
        const id = await addScheduledRun(newSchedule);
        currentSchedule.id = id;
      }

      setModalVisible(false);
      loadSchedules();
      resetForm();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };
  
  // Handle deleting a schedule
  const handleDeleteSchedule = async (id: number) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const schedule = schedules.find(s => s.id === id);
              if (schedule) {
                await cancelScheduledNotifications(schedule.notificationIds);
              }
              await deleteScheduledRun(id);
              loadSchedules();
            } catch (error) {
              console.error('Failed to delete schedule:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };
  
  // Reset form state
  const resetForm = () => {
    setCurrentSchedule({
      id: 0,
      usuario_id: currentUserId || 0,
      title: '',
      dateTime: new Date().toISOString(),
      days: [],
      isRecurring: false,
      notificationIds: [],
      active: true,
    });
    setEditMode(false);
  };
  
  // Toggle a day selection for recurring runs
  const toggleDay = (day: number) => {
    setCurrentSchedule(prev => {
      const updatedDays = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day];
      
      return {
        ...prev,
        days: updatedDays,
      };
    });
  };
  
  // Get day name from number
  const getDayName = (day: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]}>Running Schedule</Text>
          
          {/* No Permission Warning */}
          {!notificationPermission && (
            <View style={[styles.warningCard, { backgroundColor: cardBackgroundColor }]}>
              <MaterialIcons name="notifications-off" size={24} color={warningColor} />
              <View style={styles.warningTextContainer}>
                <Text style={[styles.warningTitle, { color: textColor }]}>
                  Notifications Disabled
                </Text>
                <Text style={[styles.warningText, { color: subtextColor }]}>
                  Enable notifications to receive reminders before your scheduled runs.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.warningButton, { backgroundColor: warningColor }]}
                onPress={handleEnableNotifications}
              >
                <Text style={styles.warningButtonText}>Enable</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Schedule List */}
          <View style={[styles.scheduleContainer, { backgroundColor: cardBackgroundColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Your Running Schedule</Text>
            
            {schedules.length === 0 ? (
              <Text style={[styles.emptyText, { color: subtextColor }]}>
                Tap the + button in the bottom right to add your first schedule.
              </Text>
            ) : (
              schedules.map(schedule => (
                <View 
                  key={schedule.id} 
                  style={[
                    styles.scheduleItem, 
                    { borderBottomColor: borderColor },
                    !schedule.active && styles.inactiveItem
                  ]}
                >
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleHeader}>
                      <Text style={[
                        styles.scheduleTitle, 
                        { color: textColor },
                        !schedule.active && { color: subtextColor }
                      ]}>
                        {schedule.title}
                      </Text>
                      <Switch
                        value={schedule.active}
                        onValueChange={() => toggleScheduleActive(schedule.id)}
                        trackColor={{ false: '#767577', true: `${tintColor}80` }}
                        thumbColor={schedule.active ? tintColor : '#f4f3f4'}
                      />
                    </View>
                    
                    <Text style={[styles.scheduleTime, { color: subtextColor }]}>
                      {schedule.isRecurring
                        ? `Weekly on ${schedule.days.map(d => getDayName(d).slice(0, 3)).join(', ')}`
                        : format(new Date(schedule.dateTime), 'EEEE, MMMM d, yyyy')}
                    </Text>
                    
                    <Text style={[styles.scheduleTime, { color: subtextColor }]}>
                      Time: {format(new Date(schedule.dateTime), 'h:mm a')}
                    </Text>
                  </View>
                  
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => editSchedule(schedule)}
                    >
                      <MaterialIcons name="edit" size={20} color={tintColor} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        handleDeleteSchedule(schedule.id);
                      }}
                    >
                      <MaterialIcons name="delete" size={20} color={errorColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
          
          {/* Info Card */}
          <View style={[styles.infoContainer, { backgroundColor: cardBackgroundColor }]}>
            <MaterialIcons name="info-outline" size={24} color={tintColor} />
            <Text style={[styles.infoText, { color: subtextColor }]}>
              You'll receive a notification with a motivational message 30 minutes before each scheduled run.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Floating Add Button */}
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: tintColor }]}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <MaterialIcons name="add" size={30} color="white" />
      </TouchableOpacity>
      
      {/* Add/Edit Schedule Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={[
          styles.modalContainer, 
          { backgroundColor: cardBackgroundColor }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {editMode ? 'Edit Running Schedule' : 'New Running Schedule'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <MaterialIcons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Title Input */}
            <Text style={[styles.inputLabel, { color: textColor }]}>Run Title</Text>
            <TextInput
              style={[
                styles.textInput,
                { 
                  color: textColor,
                  borderColor: borderColor,
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9'
                }
              ]}
              placeholderTextColor={subtextColor}
              placeholder="E.g., Morning Run"
              value={currentSchedule.title}
              onChangeText={(text) => setCurrentSchedule(prev => ({ ...prev, title: text }))}
            />
            
            {/* Schedule Type */}
            <Text style={[styles.inputLabel, { color: textColor }]}>Schedule Type</Text>
            <View style={styles.scheduleTypeContainer}>
              <Text style={{ color: textColor }}>One-time</Text>
              <Switch
                value={currentSchedule.isRecurring}
                onValueChange={(value) => setCurrentSchedule(prev => ({ ...prev, isRecurring: value }))}
                trackColor={{ false: '#767577', true: `${tintColor}80` }}
                thumbColor={currentSchedule.isRecurring ? tintColor : '#f4f3f4'}
              />
              <Text style={{ color: textColor }}>Weekly</Text>
            </View>
            
            {/* One-time Date/Time or Recurring Days */}
            {currentSchedule.isRecurring ? (
              <View>
                <Text style={[styles.inputLabel, { color: textColor }]}>Days of Week</Text>
                <View style={styles.daysContainer}>
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        { backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' },
                        currentSchedule.days.includes(day) && { backgroundColor: tintColor }
                      ]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text 
                        style={[
                          styles.dayText, 
                          { color: textColor },
                          currentSchedule.days.includes(day) && { color: 'white' }
                        ]}
                      >
                        {getDayName(day).charAt(0)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={[styles.inputLabel, { color: textColor }]}>Time of Day</Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    { 
                      borderColor: borderColor,
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9'
                    }
                  ]}
                  onPress={() => setTimePickerVisible(true)}
                >
                  <Text style={{ color: textColor }}>
                    {format(new Date(currentSchedule.dateTime), 'h:mm a')}
                  </Text>
                </TouchableOpacity>
                
                {timePickerVisible && (
                  <DateTimePicker
                    value={new Date(currentSchedule.dateTime)}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>
            ) : (
              <View>
                <Text style={[styles.inputLabel, { color: textColor }]}>Date</Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    { 
                      borderColor: borderColor,
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9'
                    }
                  ]}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Text style={{ color: textColor }}>
                    {format(new Date(currentSchedule.dateTime), 'EEEE, MMMM d, yyyy')}
                  </Text>
                </TouchableOpacity>
                
                {datePickerVisible && (
                  <DateTimePicker
                    value={new Date(currentSchedule.dateTime)}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
                
                <Text style={[styles.inputLabel, { color: textColor, marginTop: 16 }]}>Time</Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    { 
                      borderColor: borderColor,
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9'
                    }
                  ]}
                  onPress={() => setTimePickerVisible(true)}
                >
                  <Text style={{ color: textColor }}>
                    {format(new Date(currentSchedule.dateTime), 'h:mm a')}
                  </Text>
                </TouchableOpacity>
                
                {timePickerVisible && (
                  <DateTimePicker
                    value={new Date(currentSchedule.dateTime)}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor }]}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={{ color: textColor }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: tintColor }]}
              onPress={handleSaveSchedule}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContentContainer: {
    paddingBottom: 100, // Add padding at the bottom to prevent content from being hidden
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
  },
  warningButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  warningButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  scheduleContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  scheduleItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  inactiveItem: {
    opacity: 0.6,
  },
  scheduleInfo: {
    marginBottom: 8,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  notifyText: {
    fontSize: 14,
    marginTop: 2,
  },
  scheduleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
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
  addButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 80, // Position above tab bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  scheduleTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontWeight: '600',
  },
  dateTimeButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  notifyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notifyOption: {
    flex: 1,
    margin: 4,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    height: 50,
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    height: 50,
    flex: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 