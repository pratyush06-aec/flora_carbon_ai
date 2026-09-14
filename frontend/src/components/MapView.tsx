"use client";

import { MapContainer, TileLayer, Polygon, Marker, Popup, FeatureGroup, Rectangle, ImageOverlay } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

// Fix for missing marker icons in Leaflet + Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView({ data, imageUrl }: { data?: any, imageUrl?: string | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hasData = data && data.trees && data.trees.length > 0;
  
  // If we have geo-coordinates, we can use standard Leaflet mapping.
  // Otherwise, we might just be plotting on a simple coordinate system.
  // For MVP, let's assume we either have geo_pts or we just plot using pixel coords with a simple CRS.
  
  const hasGeo = hasData && data.trees[0].centroid_geo != null;

  // Center calculation
  let center: [number, number] = [20.5937, 78.9629]; // India
  if (hasData) {
    if (hasGeo) {
      center = [data.trees[0].centroid_geo.latitude, data.trees[0].centroid_geo.longitude];
    } else {
      // Simple CRS: map pixel coordinates roughly (y is inverted usually, but let's just plot it)
      center = [data.image.height / 2, data.image.width / 2];
    }
  }

  // Create a custom CRS if no geo info
  const crs = hasGeo ? L.CRS.EPSG3857 : L.CRS.Simple;

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer 
        center={center} 
        zoom={hasData ? (hasGeo ? 18 : -2) : 4} 
        minZoom={hasGeo ? 0 : -5}
        maxZoom={hasGeo ? 22 : 5}
        crs={crs}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        {hasGeo && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        
        {!hasGeo && hasData && imageUrl && (
          <ImageOverlay 
            url={imageUrl} 
            bounds={[[0, 0], [data.image.height, data.image.width]]} 
          />
        )}
        {!hasGeo && hasData && !imageUrl && (
          // Fallback if no image provided
          <Rectangle bounds={[[0, 0], [data.image.height, data.image.width]]} pathOptions={{ color: 'green', fillOpacity: 0.1 }} />
        )}

        {hasData && data.trees.map((tree: any) => {
          let pos: [number, number];
          let bounds: [[number, number], [number, number]];

          if (hasGeo && tree.centroid_geo) {
            pos = [tree.centroid_geo.latitude, tree.centroid_geo.longitude];
            // Roughly map bbox to geo (assuming very small area so pixel scaling is linear-ish)
            // For MVP, we'll just show markers for geo or exact pixel boxes for Simple
            bounds = [
              [pos[0] - 0.00005, pos[1] - 0.00005],
              [pos[0] + 0.00005, pos[1] + 0.00005]
            ];
          } else {
            // Leaflet Simple CRS expects [y, x]. Image top is y=height, bottom is y=0.
            // Invert the y coordinates from the model (which has y=0 at top) to match Leaflet.
            pos = [data.image.height - tree.centroid_pixel.y, tree.centroid_pixel.x];
            bounds = [
              [data.image.height - tree.bbox.ymax, tree.bbox.xmin],
              [data.image.height - tree.bbox.ymin, tree.bbox.xmax]
            ];
          }

          return (
            <FeatureGroup key={tree.tree_id}>
              <Rectangle bounds={bounds} pathOptions={{ color: '#00ff00', weight: 2, fillOpacity: 0.2 }} />
              <Marker position={pos}>
                <Popup>
                  <div className="font-bold">
                    <p>Tree #{tree.tree_id}</p>
                    <p>Area: {tree.canopy_area_m2 ? `${tree.canopy_area_m2.toFixed(2)} m²` : `${tree.segmented_area_m2 || tree.circular_area_m2 || 0} px²`}</p>
                    <p>Method: {tree.area_method}</p>
                    <p>Confidence: {(tree.confidence * 100).toFixed(1)}%</p>
                  </div>
                </Popup>
              </Marker>
            </FeatureGroup>
          );
        })}
      </MapContainer>
    </div>
  );
}
