import { MapContainer, TileLayer, Marker, Popup, FeatureGroup, Rectangle, ImageOverlay } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

// Fix for missing marker icons in Leaflet + Vite
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
  
  const hasGeo = hasData && data.trees[0].centroid_geo != null;

  let center: [number, number] = [20.5937, 78.9629]; // Default India
  if (hasData) {
    if (hasGeo) {
      center = [data.trees[0].centroid_geo.latitude, data.trees[0].centroid_geo.longitude];
    } else {
      center = [data.image.height / 2, data.image.width / 2];
    }
  }

  const crs = hasGeo ? L.CRS.EPSG3857 : L.CRS.Simple;

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer 
        key={imageUrl ? imageUrl : (hasData ? 'data-loaded' : 'empty')}
        center={center} 
        zoom={hasData ? (hasGeo ? 18 : -2) : 4} 
        minZoom={hasGeo ? 0 : -5}
        maxZoom={hasGeo ? 22 : 5}
        crs={crs}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0, backgroundColor: "transparent" }}
        attributionControl={false}
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
          <Rectangle bounds={[[0, 0], [data.image.height, data.image.width]]} pathOptions={{ color: '#65F649', fillOpacity: 0.1 }} />
        )}

        {hasData && data.trees.map((tree: any) => {
          let pos: [number, number];
          let bounds: [[number, number], [number, number]];

          if (hasGeo && tree.centroid_geo) {
            pos = [tree.centroid_geo.latitude, tree.centroid_geo.longitude];
            bounds = [
              [pos[0] - 0.00005, pos[1] - 0.00005],
              [pos[0] + 0.00005, pos[1] + 0.00005]
            ];
          } else {
            pos = [data.image.height - tree.centroid_pixel.y, tree.centroid_pixel.x];
            bounds = [
              [data.image.height - tree.bbox.ymax, tree.bbox.xmin],
              [data.image.height - tree.bbox.ymin, tree.bbox.xmax]
            ];
          }

          return (
            <FeatureGroup key={tree.tree_id}>
              <Rectangle bounds={bounds} pathOptions={{ color: '#65F649', weight: 2, fillOpacity: 0.2 }} />
              <Marker position={pos}>
                <Popup>
                  <div className="font-bold text-foreground">
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
