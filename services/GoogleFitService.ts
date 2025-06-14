import { Platform } from 'react-native';
import GoogleFit from 'react-native-google-fit';
import { HealthData } from './HealthService';

// Singleton GoogleFitService class
class GoogleFitService {
  private static instance: GoogleFitService;
  private isInitialized: boolean = false;
  private healthData: HealthData = {
    steps: 0,
    distanceKm: 0,
    caloriesBurned: 0,
    sleepHours: 0,
    heartRate: 0,
    lastUpdated: new Date(),
  };

  private constructor() {}

  public static getInstance(): GoogleFitService {
    if (!GoogleFitService.instance) {
      GoogleFitService.instance = new GoogleFitService();
    }
    return GoogleFitService.instance;
  }

  /**
   * Initialize Google Fit tracking
   */
  public async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('GoogleFit is only available on Android');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    // Define options and use 'as any' to bypass type checking
    const options = {
      scopes: [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.activity.write',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.body.write',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
      ],
    } as any;

    try {
      // Check if permissions are granted
      const authResult = await GoogleFit.authorize(options);
      
      if (authResult.success) {
        console.log('GoogleFit authorization successful');
        this.isInitialized = true;
        
        // Start recording fitness data using 'as any' for type assertion
        (GoogleFit as any).startRecording({
          dataTypes: ['step', 'distance', 'activity', 'calories'],
        });
        
        // Initial data fetch
        await this.fetchAllHealthData();
        return true;
      } else {
        console.log('GoogleFit authorization denied', authResult);
        return false;
      }
    } catch (error) {
      console.error('Error initializing GoogleFit:', error);
      return false;
    }
  }

  /**
   * Fetch all health data at once
   */
  public async fetchAllHealthData(): Promise<HealthData> {
    if (Platform.OS !== 'android') {
      return this.healthData;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await Promise.all([
        this.fetchDailySteps(),
        this.fetchDailyDistance(),
        this.fetchDailyCalories(),
        this.fetchSleepData(),
        this.fetchHeartRateData(),
      ]);

      this.healthData.lastUpdated = new Date();
    } catch (error) {
      console.error('Error fetching health data:', error);
    }

    return this.healthData;
  }

  /**
   * Get daily step count
   */
  private async fetchDailySteps(): Promise<void> {
    if (Platform.OS !== 'android' || !this.isInitialized) return;

    try {
      const today = new Date();
      const startDate = new Date(today.setHours(0, 0, 0, 0));
      const endDate = new Date();
      
      const result = await (GoogleFit as any).getDailyStepCountSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      let totalSteps = 0;
      
      // Process the result with careful type checking
      if (Array.isArray(result)) {
        for (const source of result) {
          if (source && Array.isArray(source.steps)) {
            source.steps.forEach((stepData: any) => {
              if (stepData && typeof stepData.value === 'number') {
                totalSteps += stepData.value;
              }
            });
          }
        }
      }
      
      this.healthData.steps = totalSteps;
    } catch (error) {
      console.error('Error fetching steps from GoogleFit:', error);
    }
  }

  /**
   * Get distance walked/run
   */
  private async fetchDailyDistance(): Promise<void> {
    if (Platform.OS !== 'android' || !this.isInitialized) return;

    try {
      const today = new Date();
      const startDate = new Date(today.setHours(0, 0, 0, 0));
      const endDate = new Date();
      
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      
      const result = await (GoogleFit as any).getDailyDistanceSamples(options);
      
      let totalDistance = 0;
      
      if (Array.isArray(result)) {
        result.forEach((data: any) => {
          if (data && typeof data.distance === 'number') {
            totalDistance += data.distance;
          }
        });
      }
      
      // Convert from meters to kilometers
      this.healthData.distanceKm = totalDistance / 1000;
    } catch (error) {
      console.error('Error fetching distance from GoogleFit:', error);
    }
  }

  /**
   * Get active calories burned
   */
  private async fetchDailyCalories(): Promise<void> {
    if (Platform.OS !== 'android' || !this.isInitialized) return;

    try {
      const today = new Date();
      const startDate = new Date(today.setHours(0, 0, 0, 0));
      const endDate = new Date();
      
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      
      const result = await (GoogleFit as any).getDailyCalorieSamples(options);
      
      let totalCalories = 0;
      
      if (Array.isArray(result)) {
        result.forEach((data: any) => {
          if (data && typeof data.calorie === 'number') {
            totalCalories += data.calorie;
          }
        });
      }
      
      this.healthData.caloriesBurned = Math.round(totalCalories);
    } catch (error) {
      console.error('Error fetching calories from GoogleFit:', error);
    }
  }

  /**
   * Get sleep data
   */
  private async fetchSleepData(): Promise<void> {
    if (Platform.OS !== 'android' || !this.isInitialized) return;

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      
      const result = await (GoogleFit as any).getSleepSamples(options);
      
      let totalSleepMs = 0;
      
      if (Array.isArray(result)) {
        result.forEach((sample: any) => {
          if (sample && sample.startDate && sample.endDate) {
            const start = new Date(sample.startDate).getTime();
            const end = new Date(sample.endDate).getTime();
            totalSleepMs += (end - start);
          }
        });
      }
      
      this.healthData.sleepHours = totalSleepMs / (1000 * 60 * 60);
    } catch (error) {
      console.error('Error fetching sleep data from GoogleFit:', error);
    }
  }

  /**
   * Get heart rate data
   */
  private async fetchHeartRateData(): Promise<void> {
    if (Platform.OS !== 'android' || !this.isInitialized) return;

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      
      const result = await (GoogleFit as any).getHeartRateSamples(options);
      
      if (Array.isArray(result) && result.length > 0) {
        const latestHeartRate = result[result.length - 1];
        if (latestHeartRate && typeof latestHeartRate.value === 'number') {
          this.healthData.heartRate = Math.round(latestHeartRate.value);
        }
      }
    } catch (error) {
      console.error('Error fetching heart rate from GoogleFit:', error);
    }
  }

  /**
   * Get current health data
   */
  public getHealthData(): HealthData {
    return { ...this.healthData };
  }
}

export default GoogleFitService.getInstance(); 