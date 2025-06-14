import { Platform } from 'react-native';
import { HealthData } from './HealthService';
import { format } from 'date-fns';
import { getRoutesForUser } from '@/database/database';

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

  private dailyDistances: { [date: string]: number } = {};
  private currentUserId: number | null = null;

  private constructor() {}

  public static getInstance(): HealthTracker {
    if (!HealthTracker.instance) {
      HealthTracker.instance = new HealthTracker();
    }
    return HealthTracker.instance;
  }

  /**
   * Set current user ID
   */
  public setCurrentUser(userId: number | null): void {
    this.currentUserId = userId;
    if (userId) {
      this.loadTodayDistances();
    }
  }

  /**
   * Load today's distances from database
   */
  private async loadTodayDistances(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const routes = await getRoutesForUser(this.currentUserId);
      
      // Filter routes from today and sum their distances
      const todayRoutes = routes.filter(route => 
        format(new Date(route.fecha), 'yyyy-MM-dd') === today
      );
      
      const totalDistance = todayRoutes.reduce((sum, route) => sum + route.distancia, 0) / 1000; // Convert to km
      this.dailyDistances[today] = totalDistance;
      
      // Update default data
      this.defaultData.distanceKm = totalDistance;
      this.defaultData.steps = this.calculateStepsFromDistance(totalDistance);
      this.defaultData.lastUpdated = new Date();
    } catch (error) {
      console.error('Error loading today\'s distances:', error);
    }
  }

  /**
   * Initialize health tracking
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      this.isInitialized = true;
      if (this.currentUserId) {
        await this.loadTodayDistances();
      }
      return true;
    } catch (error) {
      console.error('Error initializing health tracking:', error);
      return false;
    }
  }

  /**
   * Get health data
   */
  public getHealthData(): HealthData {
    return this.defaultData;
  }

  /**
   * Calculate steps based on distance
   * Average stride length is about 0.762 meters (2.5 feet)
   */
  private calculateStepsFromDistance(distanceKm: number): number {
    const strideLengthMeters = 0.762;
    const distanceMeters = distanceKm * 1000;
    return Math.round(distanceMeters / strideLengthMeters);
  }

  /**
   * Calculate heart rate based on distance and user data
   * This is a simplified calculation based on average running heart rate
   */
  private calculateHeartRate(distanceKm: number, weight: number | null): number {
    // If no weight data, use a default calculation
    const effectiveWeight = weight ?? 70;
    
    // Base heart rate for running (varies by person but using average)
    const baseHeartRate = 120;
    
    // Adjust heart rate based on distance and weight
    // More distance and higher weight = higher heart rate
    const distanceFactor = Math.min(distanceKm * 5, 30); // Max 30 bpm increase
    const weightFactor = Math.min((effectiveWeight - 70) * 0.5, 10); // Max 10 bpm increase
    
    return Math.round(baseHeartRate + distanceFactor + weightFactor);
  }

  /**
   * Get today's total distance
   */
  private getTodayDistance(): number {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.dailyDistances[today] || 0;
  }

  /**
   * Update health data based on running distance
   */
  public updateHealthDataFromRun(distanceKm: number, weight: number | null): void {
    const today = format(new Date(), 'yyyy-MM-dd');
    this.dailyDistances[today] = (this.dailyDistances[today] || 0) + distanceKm;
    
    const totalDistance = this.getTodayDistance();
    const steps = this.calculateStepsFromDistance(totalDistance);
    const heartRate = this.calculateHeartRate(distanceKm, weight);
    
    this.defaultData = {
      ...this.defaultData,
      steps,
      distanceKm: totalDistance,
      heartRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Refresh all health data
   */
  public async refreshHealthData(): Promise<HealthData> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.currentUserId) {
      await this.loadTodayDistances();
    }
    
    return this.defaultData;
  }
}

export default HealthTracker.getInstance(); 