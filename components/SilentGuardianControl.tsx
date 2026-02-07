import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import SilentGuardianService from "@/lib/silent-guardian";

export function SilentGuardianControl() {
  const [isActive, setIsActive] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dangerZoneCount, setDangerZoneCount] = useState(0);

  useEffect(() => {
    checkStatus();
    loadDangerZones();
  }, []);

  const checkStatus = async () => {
    const active = await SilentGuardianService.isGeofencingActive();
    const ready = SilentGuardianService.isModelReady();
    setIsActive(active);
    setIsModelReady(ready);
  };

  const loadDangerZones = () => {
    const zones = SilentGuardianService.getDangerZones();
    setDangerZoneCount(zones.length);
  };

  const handleToggle = useCallback(async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      Alert.alert(
        'Not Supported',
        'Silent Guardian geofencing is only available on iOS and Android devices.'
      );
      return;
    }

    if (!isModelReady) {
      Alert.alert(
        'Model Not Ready',
        'The CoreML prediction model is not loaded. Please rebuild the app with Xcode to include the native module.'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (isActive) {
        // Stop geofencing
        await SilentGuardianService.stopGeofencing();
        setIsActive(false);
        Alert.alert(
          '🛑 Silent Guardian Disabled',
          'Background geofencing has been stopped. You will no longer receive location-based purchase alerts.'
        );
      } else {
        // Start geofencing
        const success = await SilentGuardianService.startGeofencing();
        
        if (success) {
          setIsActive(true);
          Alert.alert(
            '✅ Silent Guardian Enabled',
            `Now monitoring ${dangerZoneCount} danger zones in the background. You'll receive instant AI nudges when entering high-risk areas.\n\n⚡ 0% CPU drain when idle - uses hardware geofencing.`
          );
        } else {
          Alert.alert(
            '❌ Setup Failed',
            'Could not enable Silent Guardian. Please check location permissions in Settings and try again.'
          );
        }
      }
      
      await checkStatus();
    } catch (error) {
      console.error('Error toggling Silent Guardian:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isActive, isModelReady, dangerZoneCount]);

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null; // Don't show on web
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.light.neonYellow} />
          <Text style={styles.title}>Silent Guardian</Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          {isModelReady
            ? `On-device AI monitoring ${dangerZoneCount} danger zones`
            : 'CoreML model not loaded - rebuild required'}
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureRow}>
          <MaterialIcons name="location-on" size={16} color={Colors.light.positive} />
          <Text style={styles.featureText}>Hardware geofencing (200m radius)</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialIcons name="battery-full" size={16} color={Colors.light.positive} />
          <Text style={styles.featureText}>0% CPU usage when idle</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialIcons name="security" size={16} color={Colors.light.positive} />
          <Text style={styles.featureText}>100% private - all inference on-device</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialIcons name="speed" size={16} color={Colors.light.positive} />
          <Text style={styles.featureText}>Instant CoreML predictions (&lt;100ms)</Text>
        </View>
      </View>

      <Pressable
        style={[
          styles.button,
          isActive ? styles.buttonActive : styles.buttonInactive,
          (isLoading || !isModelReady) && styles.buttonDisabled,
        ]}
        onPress={handleToggle}
        disabled={isLoading || !isModelReady}
      >
        {isLoading ? (
          <Text style={styles.buttonText}>Processing...</Text>
        ) : (
          <>
            <Ionicons
              name={isActive ? "stop-circle" : "play-circle"}
              size={20}
              color="#fff"
            />
            <Text style={styles.buttonText}>
              {isActive ? "Disable Guardian" : "Enable Guardian"}
            </Text>
          </>
        )}
      </Pressable>

      {!isModelReady && (
        <View style={styles.warning}>
          <MaterialIcons name="warning" size={16} color={Colors.light.neonYellow} />
          <Text style={styles.warningText}>
            Run `npx expo prebuild` and build with Xcode to activate
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 229, 0, 0.2)",
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  activeBadge: {
    backgroundColor: Colors.light.positive,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  features: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: Colors.light.negative,
  },
  buttonInactive: {
    backgroundColor: Colors.light.positive,
  },
  buttonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: "rgba(255, 229, 0, 0.1)",
    borderRadius: 6,
  },
  warningText: {
    fontSize: 11,
    color: Colors.light.neonYellow,
    flex: 1,
  },
});

export default SilentGuardianControl;
