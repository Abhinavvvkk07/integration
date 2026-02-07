import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import OnDevicePredictor from '@/modules/on-device-predictor';
import dangerZones from '@/purchase_predictor/data/danger_zones.json';

const GEOFENCING_TASK = 'SILENT_GUARDIAN_GEOFENCING';

export interface GeofencingEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

export interface GeofencingTaskData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Define the background task BEFORE app initialization
TaskManager.defineTask<GeofencingTaskData>(
  GEOFENCING_TASK,
  async ({ data, error }) => {
    if (error) {
      console.error('❌ Geofencing task error:', error);
      return;
    }

    if (!data) {
      console.warn('⚠️ No data received in geofencing task');
      return;
    }

    const { eventType, region } = data;

    console.log('🎯 Geofencing event:', {
      eventType: eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT',
      region: region.identifier,
    });

    // Only act on ENTER events
    if (eventType !== Location.GeofencingEventType.Enter) {
      return;
    }

    try {
      // Find the danger zone from our data
      const zone = dangerZones.find(
        (z) => `${z.merchant}_${z.lat}_${z.lng}` === region.identifier
      );

      if (!zone) {
        console.warn('⚠️ Zone not found:', region.identifier);
        return;
      }

      // Prepare features for ML prediction
      const now = new Date();
      const hourOfDay = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6 ? 1 : 0;

      // Use heuristic defaults for background prediction
      const features = {
        distanceToMerchant: 0.1, // Very close (100m)
        hourOfDay,
        isWeekend,
        budgetUtilization: 0.75, // Assume moderate budget usage
        merchantRegretRate: zone.regret_count / 100, // Normalize regret count
        dwellTime: 0, // Just entered
      };

      console.log('🤖 Running on-device prediction with features:', features);

      // Run on-device CoreML prediction
      const prediction = await OnDevicePredictor.predict(features);

      console.log('📊 Prediction result:', prediction);

      // Send notification if high risk
      if (prediction.shouldNudge) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Spending Alert',
            body: `You're near ${zone.merchant}, a danger zone. ${Math.round(prediction.probability * 100)}% chance you'll regret this purchase.`,
            data: {
              zone: zone.merchant,
              probability: prediction.probability,
              riskLevel: prediction.riskLevel,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // Immediate notification
        });

        console.log('🔔 Notification sent for high-risk zone:', zone.merchant);
      } else {
        console.log('✅ Low risk, no notification needed');
      }
    } catch (err) {
      console.error('❌ Error in geofencing task:', err);
    }
  }
);

export class SilentGuardianService {
  private static isRegistered = false;

  /**
   * Request location permissions (foreground first, then background)
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.warn('⚠️ Geofencing only supported on iOS and Android');
      return false;
    }

    // Step 1: Request foreground location permission
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      console.error('❌ Foreground location permission denied');
      return false;
    }

    console.log('✅ Foreground location permission granted');

    // Step 2: Request background location permission
    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();

    if (backgroundStatus !== 'granted') {
      console.error('❌ Background location permission denied');
      return false;
    }

    console.log('✅ Background location permission granted');

    // Step 3: Request notification permission
    const { status: notificationStatus } =
      await Notifications.requestPermissionsAsync();

    if (notificationStatus !== 'granted') {
      console.warn('⚠️ Notification permission denied (optional)');
    } else {
      console.log('✅ Notification permission granted');
    }

    return true;
  }

  /**
   * Start geofencing with danger zones from JSON
   */
  static async startGeofencing(): Promise<boolean> {
    try {
      // Check permissions
      const { status: foregroundStatus } =
        await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } =
        await Location.getBackgroundPermissionsAsync();

      if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
        console.error('❌ Required permissions not granted');
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }

      // Load danger zones
      if (!dangerZones || dangerZones.length === 0) {
        console.error('❌ No danger zones found in data file');
        return false;
      }

      console.log(`📍 Registering ${dangerZones.length} danger zones for geofencing`);

      // Convert danger zones to location regions
      const regions: Location.LocationRegion[] = dangerZones.map((zone) => ({
        identifier: `${zone.merchant}_${zone.lat}_${zone.lng}`,
        latitude: zone.lat,
        longitude: zone.lng,
        radius: 200, // 200m radius as per requirements
        notifyOnEnter: true,
        notifyOnExit: false, // Only care about entry
      }));

      // Start geofencing
      await Location.startGeofencingAsync(GEOFENCING_TASK, regions);

      this.isRegistered = true;
      console.log('✅ Silent Guardian geofencing started successfully');

      return true;
    } catch (error) {
      console.error('❌ Failed to start geofencing:', error);
      return false;
    }
  }

  /**
   * Stop geofencing
   */
  static async stopGeofencing(): Promise<void> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCING_TASK);

      if (isTaskDefined) {
        await Location.stopGeofencingAsync(GEOFENCING_TASK);
        this.isRegistered = false;
        console.log('🛑 Silent Guardian geofencing stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop geofencing:', error);
    }
  }

  /**
   * Check if geofencing is currently active
   */
  static async isGeofencingActive(): Promise<boolean> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCING_TASK);
      if (!isTaskDefined) {
        return false;
      }

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        GEOFENCING_TASK
      );

      return isTaskRegistered;
    } catch (error) {
      console.error('❌ Failed to check geofencing status:', error);
      return false;
    }
  }

  /**
   * Get list of registered danger zones
   */
  static getDangerZones() {
    return dangerZones;
  }

  /**
   * Check if the CoreML model is loaded and ready
   */
  static isModelReady(): boolean {
    return OnDevicePredictor.isModelLoaded();
  }
}

export default SilentGuardianService;
