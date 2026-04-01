import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, ActivityIndicator, Alert, StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

interface LocationPickerMapProps {
  /** Initial latitude (defaults to Qena, Egypt) */
  initialLat?: number;
  /** Initial longitude (defaults to Qena, Egypt) */
  initialLng?: number;
  /** Current selected lat */
  latitude?: number | null;
  /** Current selected lng */
  longitude?: number | null;
  /** Called when user drags the map manually */
  onLocationSelect: (lat: number, lng: number) => void;
  /** Called when GPS auto-detection succeeds (separate from manual drag) */
  onGpsDetected?: (lat: number, lng: number) => void;
  /** Map height */
  height?: number;
  /** Theme colors */
  colors: {
    primary: string;
    primarySoft: string;
    text: string;
    textMuted: string;
    surface: string;
    border: string;
    bg: string;
  };
}

// Default center: Qena, Egypt
const DEFAULT_LAT = 26.1551;
const DEFAULT_LNG = 32.7160;

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat,
  initialLng,
  latitude,
  longitude,
  onLocationSelect,
  onGpsDetected,
  height = 220,
  colors,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const centerLat = latitude ?? initialLat ?? DEFAULT_LAT;
  const centerLng = longitude ?? initialLng ?? DEFAULT_LNG;
  const hasPin = latitude != null && longitude != null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .crosshair {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000; pointer-events: none;
          font-size: 32px; text-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .hint {
          position: absolute; bottom: 8px; left: 50%;
          transform: translateX(-50%);
          z-index: 1000; pointer-events: none;
          background: rgba(0,0,0,0.65); color: white;
          padding: 4px 12px; border-radius: 20px;
          font-size: 12px; white-space: nowrap;
          font-family: sans-serif;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="crosshair">📍</div>
      <div class="hint">اسحب الخريطة لتحديد الموقع</div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], ${hasPin ? 16 : 14});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 19
        }).addTo(map);

        // Send center coordinates after map movement
        function sendCenter() {
          var c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location',
            lat: c.lat,
            lng: c.lng
          }));
        }

        map.on('moveend', sendCenter);
        map.on('load', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        });

        // Also send initial center after a short delay
        setTimeout(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          ${hasPin ? 'sendCenter();' : ''}
        }, 500);

        // Function to move map to specific location (called from RN)
        window.moveToLocation = function(lat, lng) {
          map.setView([lat, lng], 17, { animate: true });
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setMapReady(true);
      } else if (data.type === "location") {
        onLocationSelect(data.lat, data.lng);
      }
    } catch {}
  }, [onLocationSelect]);

  const handleUseMyLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "صلاحية الموقع",
          "يرجى السماح بالوصول للموقع من إعدادات التطبيق لتحديد موقعك تلقائياً"
        );
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      // Use dedicated GPS callback if provided, otherwise fall back to onLocationSelect
      if (onGpsDetected) {
        onGpsDetected(lat, lng);
      } else {
        onLocationSelect(lat, lng);
      }
      // Move the map to the GPS location
      webViewRef.current?.injectJavaScript(
        `window.moveToLocation(${lat}, ${lng}); true;`
      );
    } catch {
      Alert.alert("خطأ", "تعذر الحصول على موقعك الحالي، يرجى المحاولة مرة أخرى");
    } finally {
      setGpsLoading(false);
    }
  }, [onLocationSelect, onGpsDetected]);

  return (
    <View style={{ marginTop: 8 }}>
      {/* Map */}
      <View style={[
        styles.mapContainer,
        { height, borderColor: colors.border },
      ]}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          scrollEnabled={false}
          bounces={false}
          nestedScrollEnabled
          style={{ borderRadius: 14 }}
        />
      </View>

      {/* GPS button */}
      <Pressable
        onPress={handleUseMyLocation}
        disabled={gpsLoading}
        style={[
          styles.gpsBtn,
          { backgroundColor: colors.primarySoft, borderColor: colors.primary },
        ]}
      >
        {gpsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Text style={{ fontSize: 16 }}>📡</Text>
            <Text style={[styles.gpsBtnText, { color: colors.primary }]}>
              استخدم موقعي الحالي
            </Text>
          </>
        )}
      </Pressable>

      {/* Coordinates display */}
      {hasPin && (
        <View style={[styles.coordsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 12 }}>📍</Text>
          <Text style={[styles.coordsText, { color: colors.textMuted }]}>
            {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
          </Text>
          <Text style={[styles.coordsCheck, { color: colors.primary }]}>✓ تم تحديد الموقع</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  gpsBtnText: {
    fontWeight: "800",
    fontSize: 13,
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  coordsText: {
    fontSize: 11,
    flex: 1,
    fontFamily: "monospace",
  },
  coordsCheck: {
    fontSize: 11,
    fontWeight: "800",
  },
});
