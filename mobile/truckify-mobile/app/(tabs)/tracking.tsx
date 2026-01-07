import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { locationService, calculateETA, LocationState } from '../../src/services/location';

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function Tracking() {
  const mapRef = useRef<MapView>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  const [liveETA, setLiveETA] = useState({ distance: 19, eta: '25 min' });
  const [speed, setSpeed] = useState<number | null>(null);

  const activeJob = {
    id: '3',
    pickup: { name: 'Perth CBD', lat: -31.9505, lng: 115.8605 },
    delivery: { name: 'Fremantle', lat: -32.0569, lng: 115.7439 },
    status: 'In Transit',
  };

  useEffect(() => {
    fetchRoute();
    return () => { locationService.stopTracking(); };
  }, []);

  useEffect(() => {
    if (currentLocation) {
      const { distance, eta } = calculateETA(
        currentLocation.latitude,
        currentLocation.longitude,
        activeJob.delivery.lat,
        activeJob.delivery.lng,
        currentLocation.speed
      );
      setLiveETA({ distance, eta });
      setSpeed(currentLocation.speed ? Math.round(currentLocation.speed * 3.6) : null);
    }
  }, [currentLocation]);

  const fetchRoute = async () => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${activeJob.pickup.lng},${activeJob.pickup.lat};${activeJob.delivery.lng},${activeJob.delivery.lat}?overview=full&geometries=polyline`
      );
      const data = await response.json();
      if (data.routes?.[0]) {
        const coords = decodePolyline(data.routes[0].geometry);
        setRouteCoords(coords);
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
        }, 500);
      }
    } catch (error) {
      console.error('Route fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      await locationService.stopTracking();
      setIsTracking(false);
      setCurrentLocation(null);
      Alert.alert('Tracking Stopped', 'Location tracking has been paused');
    } else {
      const started = await locationService.startTracking((location) => {
        setCurrentLocation(location);
        // Center map on current location
        mapRef.current?.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 500);
      });
      if (started) {
        setIsTracking(true);
        Alert.alert('Tracking Started', 'Your location is being tracked and sent to dispatch');
      } else {
        Alert.alert('Permission Required', 'Please enable location permissions in settings');
      }
    }
  };

  const handleComplete = () => {
    Alert.alert('Complete Delivery', 'Mark this delivery as complete?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
        await locationService.stopTracking();
        setIsTracking(false);
        Alert.alert('Delivery Complete', 'Great job! The delivery has been marked as complete.');
      }}
    ]);
  };

  // Calculate progress based on current location
  const getProgress = () => {
    if (!currentLocation || routeCoords.length === 0) return 0.5;
    let minDist = Infinity, closestIdx = 0;
    routeCoords.forEach((coord, idx) => {
      const dist = Math.sqrt(Math.pow(coord.latitude - currentLocation.latitude, 2) + Math.pow(coord.longitude - currentLocation.longitude, 2));
      if (dist < minDist) { minDist = dist; closestIdx = idx; }
    });
    return closestIdx / routeCoords.length;
  };

  const progress = getProgress();
  const progressIndex = Math.floor(routeCoords.length * progress);
  const completedRoute = routeCoords.slice(0, progressIndex + 1);
  const remainingRoute = routeCoords.slice(progressIndex);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading route...</Text>
          </View>
        ) : (
          <MapView ref={mapRef} style={styles.map} provider={PROVIDER_DEFAULT}
            initialRegion={{ latitude: (activeJob.pickup.lat + activeJob.delivery.lat) / 2, longitude: (activeJob.pickup.lng + activeJob.delivery.lng) / 2, latitudeDelta: 0.15, longitudeDelta: 0.15 }}>
            {remainingRoute.length > 1 && <Polyline coordinates={remainingRoute} strokeColor="#3b82f6" strokeWidth={5} lineDashPattern={[1]} />}
            {completedRoute.length > 1 && <Polyline coordinates={completedRoute} strokeColor="#22c55e" strokeWidth={6} />}
            <Marker coordinate={{ latitude: activeJob.pickup.lat, longitude: activeJob.pickup.lng }} title="Pickup">
              <View style={[styles.marker, styles.pickupMarker]}><Text style={styles.markerText}>A</Text></View>
            </Marker>
            {currentLocation && (
              <Marker coordinate={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }} title="You" anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.truckMarker}><Text style={styles.truckEmoji}>🚛</Text></View>
              </Marker>
            )}
            <Marker coordinate={{ latitude: activeJob.delivery.lat, longitude: activeJob.delivery.lng }} title="Delivery">
              <View style={[styles.marker, styles.deliveryMarker]}><Text style={styles.markerText}>B</Text></View>
            </Marker>
          </MapView>
        )}
        {isTracking && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Traveled</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendText}>Remaining</Text></View>
        </View>
      </View>

      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>Active Delivery</Text>
          <TouchableOpacity style={[styles.trackingBadge, isTracking ? styles.trackingOn : styles.trackingOff]} onPress={toggleTracking}>
            <View style={[styles.trackingDot, { backgroundColor: isTracking ? '#22c55e' : '#6b7280' }]} />
            <Text style={styles.trackingText}>{isTracking ? 'Tracking ON' : 'Start Tracking'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.route}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <View style={styles.routeInfo}><Text style={styles.routeLabel}>PICKUP</Text><Text style={styles.location}>{activeJob.pickup.name}</Text></View>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
            <View style={styles.routeInfo}><Text style={styles.routeLabel}>IN TRANSIT</Text><Text style={styles.location}>{liveETA.distance} km remaining</Text></View>
            <Text style={styles.truckIcon}>🚛</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <View style={styles.routeInfo}><Text style={styles.routeLabel}>DELIVERY</Text><Text style={styles.location}>{activeJob.delivery.name}</Text></View>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}% complete</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statIcon}>⏱️</Text><Text style={styles.statLabel}>ETA</Text><Text style={styles.statValue}>{liveETA.eta}</Text></View>
          <View style={styles.stat}><Text style={styles.statIcon}>📏</Text><Text style={styles.statLabel}>Distance</Text><Text style={styles.statValue}>{liveETA.distance} km</Text></View>
          <View style={styles.stat}><Text style={styles.statIcon}>🚀</Text><Text style={styles.statLabel}>Speed</Text><Text style={styles.statValue}>{speed ? `${speed} km/h` : '--'}</Text></View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Issue Reported', 'Dispatch has been notified')}>
            <Text style={styles.actionText}>⚠️ Report Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={handleComplete}>
            <Text style={[styles.actionText, styles.primaryText]}>✅ Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  mapContainer: { height: 280 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9ca3af', marginTop: 10 },
  liveIndicator: { position: 'absolute', top: 10, right: 10, backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  legend: { position: 'absolute', bottom: 30, left: 10, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 20, height: 4, borderRadius: 2 },
  legendText: { color: '#fff', fontSize: 10 },
  marker: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  pickupMarker: { backgroundColor: '#22c55e' },
  deliveryMarker: { backgroundColor: '#ef4444' },
  markerText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  truckMarker: { backgroundColor: '#1f2937', borderRadius: 20, padding: 5, borderWidth: 2, borderColor: '#3b82f6' },
  truckEmoji: { fontSize: 22 },
  jobCard: { flex: 1, backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, marginTop: -20 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  trackingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  trackingOn: { backgroundColor: '#14532d' },
  trackingOff: { backgroundColor: '#374151' },
  trackingDot: { width: 8, height: 8, borderRadius: 4 },
  trackingText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  route: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 9, color: '#6b7280', fontWeight: '600' },
  location: { fontSize: 14, color: '#fff', fontWeight: '500' },
  routeLine: { width: 2, height: 12, backgroundColor: '#374151', marginLeft: 5, marginVertical: 2 },
  checkmark: { color: '#22c55e', fontSize: 14, fontWeight: 'bold' },
  truckIcon: { fontSize: 14 },
  progressContainer: { marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  progressText: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'right' },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 10, alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statLabel: { color: '#6b7280', fontSize: 10, marginTop: 2 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 10, padding: 12, alignItems: 'center' },
  primaryBtn: { backgroundColor: '#22c55e' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  primaryText: { color: '#fff' },
});
