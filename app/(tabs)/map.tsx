import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState, Button, SafeAreaView, Platform, Modal, FlatList } from 'react-native';
import MapView, { Polyline, Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isSameDay, parseISO } from 'date-fns';
import { useColorScheme } from '@/hooks/useColorScheme';
import { initializeDatabase, saveRoute, getRoutesForUser, getRouteById, getUserById } from '@/database/database';
import { Ruta, NewRuta } from '@/database/entities';
import ActivityCalculator from '@/services/ActivityCalculator';
import { useUser } from '@/context/UserContext';
import HealthTracker from '@/services/HealthTracker';

// Define a primary color (you might want to move this to a constants file)
const PRIMARY_COLOR = '#007AFF';

// --- Helper Function: Calculate Distance ---
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
// ---

// Format seconds into HH:MM:SS
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Check if today is a rest day
async function checkIfRestDay(): Promise<boolean> {
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
      
      if (isTodayRestDay) return true;
    }
    
    // Check weekly pattern
    const savedPattern = await AsyncStorage.getItem('weeklyPattern');
    if (savedPattern) {
      const weeklyPattern = JSON.parse(savedPattern);
      const today = new Date();
      
      // Check if today is in the weekly pattern (0 = Sunday, 6 = Saturday)
      if (weeklyPattern.includes(today.getDay())) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking rest day:', error);
    return false;
  }
}

// Rest Day Warning Banner Component
function RestDayWarning({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.restDayWarning}>
      <View style={styles.restDayContent}>
        <MaterialIcons name="hotel" size={24} color="white" />
        <View style={styles.restDayTextContainer}>
          <Text style={styles.restDayTitle}>Rest Day Alert</Text>
          <Text style={styles.restDayMessage}>
            Today is scheduled as a rest day. Exercise with caution or consider rescheduling.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MapScreen() {
  // --- Refs ---
  const mapRef = useRef<MapView>(null); // Ref for MapView
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);
  const hasZoomedInitially = useRef(false); // Track if initial zoom happened

  // --- State ---
  const [initialLocation, setInitialLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  
  // State for routes and route selection
  const [savedRoutes, setSavedRoutes] = useState<Ruta[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Ruta | null>(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const { currentUserId } = useUser();
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Debug state
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown");
  const [locationDebug, setLocationDebug] = useState<string>("No location");
  const [isRestDay, setIsRestDay] = useState<boolean>(false);
  const [showRestWarning, setShowRestWarning] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [userData, setUserData] = useState({
    age: 30, // Default age
    height: 170, // Default height in cm
    weight: 70, // Default weight in kg
    gender: 'male' as const, // Default gender
  });

  const colorScheme = useColorScheme();

  // --- Effects ---

  // Effect for initial location permission
  useEffect(() => {
    (async () => {
      console.log("Requesting location permissions...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(`Foreground: ${status}`);
      console.log("Location permission status:", status);
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      
      try {
        let bgStatus = await Location.requestBackgroundPermissionsAsync();
        setPermissionStatus(prev => `${prev}, Background: ${bgStatus.status}`);
      } catch (err) {
        console.error("Error requesting background permissions:", err);
      }
      
      // Don't automatically get location, let user press the button
    })();
  }, []);

  // Initialize database and load routes
  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        await loadSavedRoutes();
      } catch (error) {
        console.error("Error initializing database:", error);
      }
    };
    
    initDb();
  }, [currentUserId]);

  // Function to load saved routes
  const loadSavedRoutes = async () => {
    try {
      const routes = await getRoutesForUser(currentUserId);
      setSavedRoutes(routes);
      console.log(`Loaded ${routes.length} routes`);
    } catch (error) {
      console.error("Error loading routes:", error);
    }
  };

  // Check if today is a rest day when component mounts
  useEffect(() => {
    const checkRestDay = async () => {
      const restDay = await checkIfRestDay();
      setIsRestDay(restDay);
      setShowRestWarning(restDay);
    };
    
    checkRestDay();
  }, []);

  // Show success notification for a few seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Add this function to fetch user data
  const fetchUserData = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const user = await getUserById(currentUserId);
      if (user) {
        setUserData({
          age: user.edad || 30,
          height: user.altura || 170,
          weight: user.peso || 70,
          gender: 'male', // Default to male if not specified
        });
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }, [currentUserId]);

  // Add this to your useEffect
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Separate function to get location that can be called directly from a button
  const getCurrentLocation = async () => {
    try {
      console.log("Getting current position...");
      setLocationDebug("Fetching location...");
      
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      console.log("Location received:", location.coords);
      setLocationDebug(`Lat: ${location.coords.latitude.toFixed(6)}, Lng: ${location.coords.longitude.toFixed(6)}`);
      setCurrentLocation(location);
      
      // Manually animate map to the location
      if (mapRef.current && location) {
        console.log("Animating map to location");
        const region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005, // Zoom in closer
          longitudeDelta: 0.005,
        };
        
        // Use a timeout to ensure the map is ready
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(region, 1000);
            hasZoomedInitially.current = true;
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationDebug(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setErrorMsg("Failed to get current location");
    }
  };

  // Modified toggleRecording to add rest day confirmation
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording - keep existing logic
      console.log("Stopping recording");
      setIsRecording(false);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Log the results
      console.log(`Recording stopped. Duration: ${formatTime(elapsedTime)}, Distance: ${(totalDistance / 1000).toFixed(2)}km`);
      
      // Save the route to the database
      if (routeCoordinates.length > 0) {
        try {
          const routeData: NewRuta = {
            usuario_id: currentUserId,
            fecha: new Date().toISOString(),
            distancia: totalDistance,
            coordenadas: JSON.stringify(routeCoordinates)
          };
          
          await saveRoute(routeData);
          console.log("Route saved to database");
          
          // Refresh the routes list
          await loadSavedRoutes();
          
          // Show success message or notification
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSaveSuccess(true);
        } catch (error) {
          console.error("Error saving route:", error);
          setErrorMsg("Failed to save route to database");
        }
      }

      // Calculate activity metrics
      const estimatedSteps = ActivityCalculator.calculateSteps(totalDistance, userData);
      const estimatedHeartRate = ActivityCalculator.calculateHeartRate(totalDistance, userData);

      // Update health data
      try {
        await HealthTracker.updateActivityData({
          steps: estimatedSteps,
          distanceKm: totalDistance,
          heartRate: estimatedHeartRate,
        });
      } catch (error) {
        console.error("Failed to update health data:", error);
      }

      setShowSummary(true);
    } else {
      // Check if it's a rest day before starting
      if (isRestDay) {
        // Show warning if not already shown
        setShowRestWarning(true);
        // Provide haptic feedback to alert user
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Start recording if we have location - keep existing logic
      if (!currentLocation) {
        console.log("Cannot start recording: No location");
        setErrorMsg("Cannot start recording: No current location");
        return;
      }
      
      console.log("Starting recording");
      const startCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      
      setInitialLocation(startCoords);
      setRouteCoordinates([startCoords]);
      setStartTime(new Date());
      setElapsedTime(0);
      setTotalDistance(0);
      setIsRecording(true);
      
      // Start the timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      // Start location tracking
      startLocationTracking();
    }
  };
  
  // Function to start tracking location
  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (location) => {
          console.log("New location:", location.coords);
          setCurrentLocation(location);
          
          setRouteCoordinates(prev => {
            const newCoords = [...prev, location.coords];
            if (newCoords.length >= 2) {
              const lastPoint = newCoords[newCoords.length - 2];
              const newPoint = newCoords[newCoords.length - 1];
              const distDelta = calculateDistance(
                lastPoint.latitude, lastPoint.longitude,
                newPoint.latitude, newPoint.longitude
              );
              
              if (distDelta < 100) { // Filter out large jumps
                setTotalDistance(prevDist => prevDist + distDelta);
              }
            }
            return newCoords;
          });
          
          // Animate map to follow user
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500);
          }
        }
      );
    } catch (error) {
      console.error("Error watching position:", error);
      setErrorMsg("Failed to watch position: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Function to load a saved route onto the map
  const loadSavedRoute = async (route: Ruta) => {
    try {
      // Parse the coordinates from the stored JSON string
      if (route.coordenadas) {
        const coordinates = JSON.parse(route.coordenadas) as {latitude: number, longitude: number}[];
        
        // Set the route coordinates to display on the map
        setRouteCoordinates(coordinates);
        
        // Set the initial location to the first point of the route
        if (coordinates.length > 0) {
          setInitialLocation(coordinates[0]);
          
          // Calculate center point of the route for the map view
          const latitudes = coordinates.map(coord => coord.latitude);
          const longitudes = coordinates.map(coord => coord.longitude);
          
          const minLat = Math.min(...latitudes);
          const maxLat = Math.max(...latitudes);
          const minLng = Math.min(...longitudes);
          const maxLng = Math.max(...longitudes);
          
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          
          // Add some padding to the delta to show the entire route
          const latDelta = (maxLat - minLat) * 1.5 || 0.005;
          const lngDelta = (maxLng - minLng) * 1.5 || 0.005;
          
          // Animate map to show the entire route
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: centerLat,
              longitude: centerLng,
              latitudeDelta: Math.max(latDelta, 0.005),
              longitudeDelta: Math.max(lngDelta, 0.005),
            }, 1000);
          }
        }
        
        // Close modal
        setRouteModalVisible(false);
        
        // Update selected route state
        setSelectedRoute(route);
        
        // Set the total distance
        if (route.distancia) {
          setTotalDistance(route.distancia);
        }
        
        console.log(`Loaded route from ${format(new Date(route.fecha), 'PPP')}`);
      }
    } catch (error) {
      console.error("Error loading saved route:", error);
      setErrorMsg("Failed to load route");
    }
  };

  const stopTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    // Calculate activity metrics
    const distance = totalDistance || 0;
    const estimatedSteps = ActivityCalculator.calculateSteps(distance, userData);
    const estimatedHeartRate = ActivityCalculator.calculateHeartRate(distance, userData);

    // Update health data
    try {
      await HealthTracker.updateActivityData({
        steps: estimatedSteps,
        distanceKm: distance,
        heartRate: estimatedHeartRate,
      });
    } catch (error) {
      console.error("Failed to update health data:", error);
    }

    setShowSummary(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {showRestWarning && <RestDayWarning onClose={() => setShowRestWarning(false)} />}
      
      {/* Success Notification */}
      {saveSuccess && (
        <View style={styles.successNotification}>
          <MaterialIcons name="check-circle" size={24} color="white" />
          <Text style={styles.successText}>Route saved successfully!</Text>
        </View>
      )}
      
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton
        userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
      >
        {initialLocation && (
          <Marker
            coordinate={initialLocation}
            title="Start Point"
            pinColor="green"
          />
        )}
        
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#FF0000"
          strokeWidth={4}
        />
      </MapView>
      
      {/* Route Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={routeModalVisible}
        onRequestClose={() => setRouteModalVisible(false)}
      >
        <View style={[
          styles.modalContainer,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
        ]}>
          <View style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                Your Routes
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setRouteModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
            
            {savedRoutes.length === 0 ? (
              <View style={styles.emptyRouteContainer}>
                <MaterialIcons name="directions" size={64} color={colorScheme === 'dark' ? '#555555' : '#CCCCCC'} />
                <Text style={[
                  styles.emptyRouteText,
                  { color: colorScheme === 'dark' ? '#ECEDEE' : '#333333' }
                ]}>
                  No saved routes yet. Go for a run and record your journey!
                </Text>
              </View>
            ) : (
              <FlatList
                data={savedRoutes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.routeItem,
                      { 
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                        borderBottomColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA' 
                      }
                    ]}
                    onPress={() => loadSavedRoute(item)}
                  >
                    <View style={styles.routeItemContent}>
                      <View style={[
                        styles.routeIconContainer, 
                        { backgroundColor: PRIMARY_COLOR }
                      ]}>
                        <MaterialIcons name="directions-run" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.routeInfo}>
                        <Text style={[
                          styles.routeDate,
                          { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                        ]}>
                          {format(new Date(item.fecha), 'EEEE, MMMM d, yyyy')}
                        </Text>
                        <View style={styles.routeStatsContainer}>
                          <MaterialIcons name="straighten" size={16} color={colorScheme === 'dark' ? '#AAAAAA' : '#666666'} />
                          <Text style={[
                            styles.routeStats,
                            { color: colorScheme === 'dark' ? '#AAAAAA' : '#666666' }
                          ]}>
                            {item.distancia ? `${(item.distancia / 1000).toFixed(2)} km` : 'No distance data'}
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={24} 
                        color={colorScheme === 'dark' ? '#777777' : '#CCCCCC'} 
                      />
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.routesList}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Bottom Controls Area - OUTSIDE of MapView */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.locationButton]} 
          onPress={getCurrentLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            styles.recordButton,
            isRecording ? styles.stopButton : (isRestDay ? styles.restDayButton : {}),
            !currentLocation && !isRecording ? styles.disabledButton : {}
          ]} 
          onPress={toggleRecording}
          disabled={!isRecording && !currentLocation}
        >
          <MaterialIcons 
            name={isRecording ? "stop" : "play-arrow"} 
            size={32} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.routesButton]} 
          onPress={() => setRouteModalVisible(true)}
        >
          <MaterialIcons name="map" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Button title="Clear" onPress={() => setErrorMsg(null)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    left: 0,
    right: 0,
    padding: 10,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  locationButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 3,
    borderColor: 'white',
  },
  routesButton: {
    backgroundColor: '#555555',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  restDayButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  errorContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    flex: 1,
  },
  restDayWarning: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  restDayContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restDayTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  restDayTitle: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 16,
  },
  restDayMessage: {
    color: 'white',
    fontSize: 14,
  },
  closeButton: {
    padding: 5,
  },
  restDayIndicator: {
    color: '#FF9500',
    fontWeight: 'bold',
    marginVertical: 5,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    marginTop: 50,
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyRouteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyRouteText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  routeItem: {
    padding: 16,
    borderBottomWidth: 1,
    width: '100%',
  },
  routeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routeStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeStats: {
    fontSize: 14,
    marginLeft: 4,
  },
  routesList: {
    width: '100%',
  },
  successNotification: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: '#4CD964',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});