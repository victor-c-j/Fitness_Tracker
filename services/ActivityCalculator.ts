interface UserData {
  age: number;
  height: number; // in cm
  weight: number; // in kg
  gender: 'male' | 'female';
}

interface ActivityResult {
  estimatedSteps: number;
  estimatedHeartRate: number;
}

class ActivityCalculator {
  // Average step length in meters (can be adjusted based on user's height)
  private static readonly AVERAGE_STEP_LENGTH = 0.762; // ~30 inches

  /**
   * Calculate estimated steps based on distance
   * @param distanceKm Distance in kilometers
   * @param userData User's physical data
   * @returns Estimated number of steps
   */
  public static calculateSteps(distanceKm: number, userData: UserData): number {
    // Convert distance to meters
    const distanceMeters = distanceKm * 1000;
    
    // Adjust step length based on user's height
    const stepLength = this.calculateStepLength(userData.height);
    
    // Calculate steps
    const steps = Math.round(distanceMeters / stepLength);
    
    return steps;
  }

  /**
   * Calculate estimated heart rate based on distance and user data
   * @param distanceKm Distance in kilometers
   * @param userData User's physical data
   * @returns Estimated heart rate
   */
  public static calculateHeartRate(distanceKm: number, userData: UserData): number {
    // Calculate maximum heart rate using the Tanaka formula
    const maxHeartRate = 208 - (0.7 * userData.age);
    
    // Calculate resting heart rate (average for adults)
    const restingHeartRate = userData.gender === 'male' ? 70 : 75;
    
    // Calculate heart rate reserve
    const heartRateReserve = maxHeartRate - restingHeartRate;
    
    // Calculate intensity factor based on distance
    // For running, we'll use a higher intensity factor
    const intensityFactor = 0.7; // 70% of max heart rate
    
    // Calculate target heart rate
    const targetHeartRate = Math.round(
      restingHeartRate + (heartRateReserve * intensityFactor)
    );
    
    return targetHeartRate;
  }

  /**
   * Calculate step length based on height
   * @param height Height in centimeters
   * @returns Step length in meters
   */
  private static calculateStepLength(height: number): number {
    // Step length is approximately 45% of height
    return (height * 0.45) / 100; // Convert to meters
  }
}

export default ActivityCalculator; 