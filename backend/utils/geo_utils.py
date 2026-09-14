from pyproj import CRS, Transformer
from shapely.geometry import shape, Polygon
import geopandas as gpd

def get_transformer(src_crs: str, dst_crs: str) -> Transformer:
    """Creates a transformer from source CRS to destination CRS."""
    return Transformer.from_crs(src_crs, dst_crs, always_xy=True)

def transform_polygon(polygon: Polygon, transformer: Transformer) -> Polygon:
    """Transforms a Shapely polygon coordinates using a pyproj Transformer."""
    from shapely.ops import transform
    return transform(transformer.transform, polygon)

def align_gdf_crs(gdf: gpd.GeoDataFrame, target_crs: str) -> gpd.GeoDataFrame:
    """Aligns a GeoDataFrame to the target CRS."""
    if gdf.crs != target_crs:
        return gdf.to_crs(target_crs)
    return gdf
