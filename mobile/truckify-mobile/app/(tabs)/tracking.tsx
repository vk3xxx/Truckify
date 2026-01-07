import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

// Decode Google polyline to coordinates
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function Tracking() {
  const mapRef = useRef<MapView>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const activeJob = {
    id: '3',
    pickup: { name: 'Perth CBD', lat: -31.9505, lng: 115.8605 },
    delivery: { name: 'Fremantle', lat: -32.0569, lng: 115.7439 },
    status: 'In Transit',
    eta: '25 min',
    distance: '19 km',
    progress: 0.52,
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  const fetchRoute = async () => {
    try {
      // Using OSRM (free, no API key needed)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${activeJob.pickup.lng},${activeJob.pickup.lat};${activeJob.delivery.lng},${activeJob.delivery.lat}?overview=full&geometries=polyline`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const coords = decodePolyline(data.routes[0].geometry);
        setRouteCoords(coords);
        
        // Fit map to route
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          });
        }, 500);
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
      // Fallback to straight line
      setRouteCoords([
        { latitude: activeJob.pickup.lat, longitude: activeJob.pickup.lng },
        { latitude: activeJob.delivery.lat, longitude: activeJob.delivery.lng },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Split route into completed and remaining based on progress
  const progressIndex = Math.floor(routeCoords.length * activeJob.progress);
  const completedRoute = routeCoords.slice(0, progressIndex + 1);
  const remainingRoute = routeCoords.slice(progressIndex);
  const currentPosition = routeCoords[progressIndex] || { latitude: activeJob.pickup.lat, longitude: activeJob.pickup.lng };

  const handleUpdateStatus = (status: string) => {
    Alert.alert('Status Updated', `Delivery marked as: ${status}`);
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading route...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: (activeJob.pickup.lat + activeJob.delivery.lat) / 2,
              longitude: (activeJob.pickup.lng + activeJob.delivery.lng) / 2,
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            }}
          >
            {/* Remaining route (blue) */}
            {remainingRoute.length > 1 && (
              <Polyline
                coordinates={remainingRoute}
                strokeColor="#3b82f6"
                strokeWidth={5}
                lineDashPattern={[1]}
              />
            )}

            {/* Completed route (green) */}
            {completedRoute.length > 1 && (
              <Polyline
                coordinates={completedRoute}
                strokeColor="#22c55e"
                strokeWidth={6}
              />
            )}

            {/* Pickup marker */}
            <Marker
              coordinate={{ latitude: activeJob.pickup.lat, longitude: activeJob.pickup.lng }}
              title="Pickup"
              description={activeJob.pickup.name}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.marker, styles.pickupMarker]}>
                  <Text style={styles.markerText}>A</Text>
                </View>
              </View>
            </Marker>

            {/* Current position / truck */}
            {routeCoords.length > 0 && (
              <Marker
                coordinate={currentPosition}
                title="Current Location"
                description="Your truck"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.truckMarker}>
                  <Text style={styles.truckEmoji}>🚛</Text>
                </View>
              </Marker>
            )}

            {/* Delivery marker */}
            <Marker
              coordinate={{ latitude: activeJob.delivery.lat, longitude: activeJob.delivery.lng }}
              title="Delivery"
              description={activeJob.delivery.name}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.marker, styles.deliveryMarker]}>
                  <Text style={styles.markerText}>B</Text>
                </View>
              </View>
            </Marker>
          </MapView>
        )}

        {/* Map Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Traveled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Remaining</Text>
          </View>
        </View>
      </View>

      {/* Active Job Card */}
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>Active Delivery</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{activeJob.status}</Text>
          </View>
        </View>

        <View style={styles.route}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.location}>{activeJob.pickup.name}</Text>
            </View>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>IN TRANSIT</Text>
              <Text style={styles.location}>{activeJob.distance} remaining</Text>
            </View>
            <Text style={styles.truckIcon}>🚛</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>DELIVERY</Text>
              <Text style={styles.location}>{activeJob.delivery.name}</Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${activeJob.progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(activeJob.progress * 100)}% complete</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statLabel}>ETA</Text>
            <Text style={styles.statValue}>{activeJob.eta}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>📏</Text>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={styles.statValue}>{activeJob.distance}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus('Issue Reported')}>
            <Text style={styles.actionText}>⚠️ Report Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => handleUpdateStatus('Delivered')}>
            <Text style={[styles.actionText, styles.primaryText]}>✅ Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  mapContainer: { height: 300 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9ca3af', marginTop: 10 },
  legend: { position: 'absolute', bottom: 30, left: 10, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 20, height: 4, borderRadius: 2 },
  legendText: { color: '#fff', fontSize: 10 },
  markerContainer: { alignItems: 'center' },
  marker: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  pickupMarker: { backgroundColor: '#22c55e' },
  deliveryMarker: { backgroundColor: '#ef4444' },
  markerText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  truckMarker: { backgroundColor: '#1f2937', borderRadius: 20, padding: 5, borderWidth: 2, borderColor: '#3b82f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  truckEmoji: { fontSize: 22 },
  jobCard: { flex: 1, backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, marginTop: -20 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statusBadge: { backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  route: { marginBottom: 16 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  location: { fontSize: 15, color: '#fff', fontWeight: '500' },
  routeLine: { width: 2, height: 16, backgroundColor: '#374151', marginLeft: 6, marginVertical: 2 },
  checkmark: { color: '#22c55e', fontSize: 16, fontWeight: 'bold' },
  truckIcon: { fontSize: 16 },
  progressContainer: { marginBottom: 16 },
  progressBar: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
  progressText: { color: '#9ca3af', fontSize: 12, marginTop: 6, textAlign: 'right' },
  stats: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 12, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statLabel: { color: '#6b7280', fontSize: 11 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 12, padding: 14, alignItems: 'center' },
  primaryBtn: { backgroundColor: '#22c55e' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  primaryText: { color: '#fff' },
});
