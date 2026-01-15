import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function TrackingScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      setLoading(false);

      // Start watching location (for real-time tracking)
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 100, // Or every 100 meters
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="location-outline" size={64} color="#6b7280" />
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Text style={styles.errorSubtext}>Enable location services to track deliveries</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // Example route (in production, this would come from API)
  const route = [
    {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    },
    {
      latitude: location.coords.latitude + 0.05,
      longitude: location.coords.longitude + 0.05,
    },
  ];

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Current Location Marker */}
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title="Your Location"
        >
          <View style={styles.currentLocationMarker}>
            <Ionicons name="car" size={24} color="#fff" />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker
          coordinate={route[route.length - 1]}
          title="Destination"
          pinColor="#22c55e"
        />

        {/* Route Line */}
        <Polyline
          coordinates={route}
          strokeColor="#22c55e"
          strokeWidth={4}
        />
      </MapView>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color="#22c55e" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Current Location</Text>
            <Text style={styles.infoValue}>
              {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Ionicons name="speedometer" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Speed</Text>
            <Text style={styles.infoValue}>
              {location.coords.speed
                ? `${(location.coords.speed * 3.6).toFixed(0)} km/h`
                : 'Stationary'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  currentLocationMarker: {
    backgroundColor: '#22c55e',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  infoCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 12,
  },
});
