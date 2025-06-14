import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';

// Define types for our health data
export interface HealthData {
  steps: number;
  distanceKm: number;
  caloriesBurned: number;
  sleepHours: number;
  heartRate: number;
  lastUpdated: Date;
}

// Singleton HealthService class
class HealthService {
  private static instance: HealthService;
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

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  /**
   * Initialize health tracking - request permissions and set up watchers
   */
  public async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    // Define permissions
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.HeartRate,
        ],
        write: [],
      },
    };

    return new Promise<boolean>((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('Error initializing HealthKit:', error);
          resolve(false);
          return;
        }
        
        this.isInitialized = true;
        this.setupObservers();
        this.fetchAllHealthData()
          .then(() => resolve(true))
          .catch(() => resolve(true)); // Still resolve true even if initial data fetch fails
      });
    });
  }

  /**
   * Set up observers for health data changes
   */
  private setupObservers(): void {
    if (!this.isInitialized || Platform.OS !== 'ios') return;

    try {
      // Set up observers using string literals
      // This bypasses TypeScript checking but works with the actual API
      (AppleHealthKit.setObserver as any)({ type: 'StepCount' });
      (AppleHealthKit.setObserver as any)({ type: 'DistanceWalkingRunning' });
      (AppleHealthKit.setObserver as any)({ type: 'ActiveEnergyBurned' });
    } catch (error) {
      console.error('Error setting up HealthKit observers:', error);
    }
  }

  /**
   * Fetch all health data at once
   */
  public async fetchAllHealthData(): Promise<HealthData> {
    if (Platform.OS !== 'ios') {
      return this.healthData;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await Promise.all([
        this.fetchDailySteps(),
        this.fetchDistanceWalkingRunning(),
        this.fetchActiveEnergyBurned(),
        this.fetchSleepHours(),
        this.fetchLatestHeartRate(),
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
    if (Platform.OS !== 'ios' || !this.isInitialized) return;

    const options = {
      date: new Date().toISOString(),
    };

    return new Promise<void>((resolve) => {
      AppleHealthKit.getStepCount(options, (err, results) => {
        if (err) {
          console.error('Error fetching steps:', err);
        } else if (results) {
          // Type cast to any to prevent TypeScript errors
          this.healthData.steps = (results as any).value || 0;
        }
        resolve();
      });
    });
  }

  /**
   * Get distance walked/run
   */
  private async fetchDistanceWalkingRunning(): Promise<void> {
    if (Platform.OS !== 'ios' || !this.isInitialized) return;

    const options = {
      date: new Date().toISOString(),
      // Unit parameters are handled internally by the library
    };

    return new Promise<void>((resolve) => {
      AppleHealthKit.getDistanceWalkingRunning(options, (err, results) => {
        if (err) {
          console.error('Error fetching walking/running distance:', err);
        } else if (results) {
          // Type cast to any to prevent TypeScript errors
          this.healthData.distanceKm = (results as any).value || 0;
        }
        resolve();
      });
    });
  }

  /**
   * Get active calories burned
   */
  private async fetchActiveEnergyBurned(): Promise<void> {
    if (Platform.OS !== 'ios' || !this.isInitialized) return;

    const options = {
      date: new Date().toISOString(),
    };

    return new Promise<void>((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
        if (err) {
          console.error('Error fetching active energy burned:', err);
        } else if (results) {
          // Type cast to any to prevent TypeScript errors
          this.healthData.caloriesBurned = (results as any).value || 0;
        }
        resolve();
      });
    });
  }

  /**
   * Get sleep hours
   */
  private async fetchSleepHours(): Promise<void> {
    if (Platform.OS !== 'ios' || !this.isInitialized) return;

    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
    };

    return new Promise<void>((resolve) => {
      AppleHealthKit.getSleepSamples(options, (err, results) => {
        if (err) {
          console.error('Error fetching sleep data:', err);
        } else if (results && Array.isArray(results)) {
          // Calculate total sleep duration in hours
          let totalSleepMs = 0;
          results.forEach((sample: any) => {
            if (sample.value === 'ASLEEP') {
              const start = new Date(sample.startDate).getTime();
              const end = new Date(sample.endDate).getTime();
              totalSleepMs += (end - start);
            }
          });
          
          this.healthData.sleepHours = totalSleepMs / (1000 * 60 * 60);
        }
        resolve();
      });
    });
  }

  /**
   * Get latest heart rate
   */
  private async fetchLatestHeartRate(): Promise<void> {
    if (Platform.OS !== 'ios' || !this.isInitialized) return;

    const options = {
      startDate: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      limit: 1,
      ascending: false,
    };

    return new Promise<void>((resolve) => {
      AppleHealthKit.getHeartRateSamples(options, (err, results) => {
        if (err) {
          console.error('Error fetching heart rate:', err);
        } else if (results && Array.isArray(results) && results.length > 0) {
          // Type cast to any to prevent TypeScript errors
          this.healthData.heartRate = (results[0] as any).value || 0;
        }
        resolve();
      });
    });
  }

  /**
   * Get current health data
   */
  public getHealthData(): HealthData {
    return { ...this.healthData };
  }
}

export default HealthService.getInstance(); 