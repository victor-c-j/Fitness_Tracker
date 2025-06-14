import { Platform } from 'react-native';
import HealthService, { HealthData } from './HealthService';
import GoogleFitService from './GoogleFitService';

/**
 * HealthTracker - A unified interface for health tracking
 * across iOS and Android platforms
 */
class HealthTracker {
  private static instance: HealthTracker;
  private isInitialized: boolean = false;
  private defaultData: HealthData = {
    steps: 0,
    distanceKm: 0,
    caloriesBurned: 0,
    sleepHours: 0,
    heartRate: 0,
    lastUpdated: new Date(),
  };

  private constructor() {}

  public static getInstance(): HealthTracker {
    if (!HealthTracker.instance) {
      HealthTracker.instance = new HealthTracker();
    }
    return HealthTracker.instance;
  }

  /**
   * Initialize health tracking
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      if (Platform.OS === 'ios') {
        this.isInitialized = await HealthService.initialize();
      } else if (Platform.OS === 'android') {
        this.isInitialized = await GoogleFitService.initialize();
      } else {
        console.log('Health tracking not supported on this platform');
        return false;
      }
      
      return this.isInitialized;
    } catch (error) {
      console.error('Error initializing health tracking:', error);
      return false;
    }
  }

  /**
   * Get health data from the appropriate health service
   */
  public getHealthData(): HealthData {
    if (!this.isInitialized) {
      return this.defaultData;
    }

    if (Platform.OS === 'ios') {
      return HealthService.getHealthData();
    } else if (Platform.OS === 'android') {
      return GoogleFitService.getHealthData();
    }

    return this.defaultData;
  }

  /**
   * Refresh all health data
   */
  public async refreshHealthData(): Promise<HealthData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (Platform.OS === 'ios') {
        return await HealthService.fetchAllHealthData();
      } else if (Platform.OS === 'android') {
        return await GoogleFitService.fetchAllHealthData();
      }
    } catch (error) {
      console.error('Error refreshing health data:', error);
    }

    return this.defaultData;
  }
}

export default HealthTracker.getInstance(); 