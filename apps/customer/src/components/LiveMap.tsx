import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

interface LiveMapProps {
  driverLat: number;
  driverLng: number;
  customerLat: number;
  customerLng: number;
  restaurantLat: number;
  restaurantLng: number;
  height?: number | string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  driverLat,
  driverLng,
  customerLat,
  customerLng,
  restaurantLat,
  restaurantLng,
  height = "100%",
}) => {
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .marker-label {
          background: white;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
        }
        .driver-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { r: 12; opacity: 1; }
          50% { r: 18; opacity: 0.5; }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Initialize map - centered on driver
        const map = L.map('map').setView([${driverLat}, ${driverLng}], 15);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Custom icons
        const driverIcon = L.divIcon({
          html: '<div style="background: #2563EB; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 10px rgba(37, 99, 235, 0.5);"><span>🛵</span></div>',
          iconSize: [36, 36],
          className: 'driver-pulse'
        });

        const customerIcon = L.divIcon({
          html: '<div style="background: #10B981; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;"><span>📍</span></div>',
          iconSize: [34, 34]
        });

        const restaurantIcon = L.divIcon({
          html: '<div style="background: #F59E0B; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;"><span>🍽️</span></div>',
          iconSize: [34, 34]
        });

        // Add markers
        L.marker([${driverLat}, ${driverLng}], { icon: driverIcon })
          .addTo(map)
          .bindPopup('<strong>🛵 موقع المندوب</strong><br>يتحدث مباشرة', { className: 'marker-label' });

        L.marker([${customerLat}, ${customerLng}], { icon: customerIcon })
          .addTo(map)
          .bindPopup('<strong>📍 عنوان التوصيل</strong>', { className: 'marker-label' });

        L.marker([${restaurantLat}, ${restaurantLng}], { icon: restaurantIcon })
          .addTo(map)
          .bindPopup('<strong>🍽️ المطعم</strong>', { className: 'marker-label' });

        // Draw route line
        const latlngs = [
          [${restaurantLat}, ${restaurantLng}],
          [${driverLat}, ${driverLng}],
          [${customerLat}, ${customerLng}]
        ];

        L.polyline(latlngs, { color: '#7C3AED', weight: 3, opacity: 0.7 }).addTo(map);

        // Fit bounds
        const group = new L.featureGroup([
          L.marker([${driverLat}, ${driverLng}]),
          L.marker([${customerLat}, ${customerLng}]),
          L.marker([${restaurantLat}, ${restaurantLng}])
        ]);
        map.fitBounds(group.getBounds().pad(0.1));
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ height, width: "100%", backgroundColor: "#E8E4F0" }}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        )}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
};
