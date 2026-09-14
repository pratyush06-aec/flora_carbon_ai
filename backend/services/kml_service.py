from pathlib import Path
from fastkml import kml
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import geopandas as gpd

def parse_kml_to_gdf(kml_path: Path) -> gpd.GeoDataFrame:
    """
    Parses a KML file and returns a GeoDataFrame containing its geometries.
    Always assumes the source KML uses EPSG:4326 (WGS84).
    """
    with open(kml_path, "rt", encoding="utf-8") as f:
        doc = f.read()

    k = kml.KML()
    # Handle potentially malformed KMLs or missing namespaces
    try:
        k.from_string(doc.encode("utf-8"))
    except Exception as e:
        raise ValueError(f"Failed to parse KML: {str(e)}")

    geometries = []
    
    def extract_geometries(feature):
        if hasattr(feature, 'geometry') and feature.geometry:
            geometries.append(feature.geometry)
        if getattr(feature, 'features', None):
            for sub_feature in feature.features():
                extract_geometries(sub_feature)
                
    for feature in k.features():
        extract_geometries(feature)

    if not geometries:
        raise ValueError("No geometries found in the KML file.")

    # Convert all valid Geometries into a GeoDataFrame
    gdf = gpd.GeoDataFrame(geometry=geometries, crs="EPSG:4326")
    return gdf

def get_aoi_polygon(gdf: gpd.GeoDataFrame) -> Polygon | MultiPolygon:
    """
    Returns a unified Shapely geometry representing the Area of Interest (AOI).
    """
    unified = unary_union(gdf.geometry)
    return unified
