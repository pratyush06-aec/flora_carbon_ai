import rasterio
from rasterio.mask import mask
from rasterio.transform import Affine
from pathlib import Path
from shapely.geometry import Polygon
import geopandas as gpd
import numpy as np
from typing import Tuple, Dict, Any, Optional

def get_raster_metadata(image_path: Path) -> Dict[str, Any]:
    """
    Extracts metadata from a raster image.
    Works for GeoTIFF. For PNG/JPG, crs and transform might be None/default.
    """
    with rasterio.open(image_path) as src:
        meta = {
            "width": src.width,
            "height": src.height,
            "count": src.count,
            "crs": src.crs.to_string() if src.crs else None,
            "transform": src.transform,
            "bounds": src.bounds,
            "driver": src.driver
        }
        
        # Calculate GSD (Ground Sample Distance) if transform is valid
        # A standard affine transform is [a, b, c, d, e, f]
        # Pixel width = a, Pixel height = -e (usually)
        if src.transform and src.transform != Affine.identity():
            meta["gsd_x"] = abs(src.transform[0])
            meta["gsd_y"] = abs(src.transform[4])
        else:
            meta["gsd_x"] = None
            meta["gsd_y"] = None
            
        return meta

def crop_raster_to_aoi(image_path: Path, aoi_gdf: gpd.GeoDataFrame) -> Tuple[np.ndarray, Affine]:
    """
    Crops the raster image to the provided Area of Interest (AOI).
    Expects AOI to be in the same CRS as the raster.
    """
    with rasterio.open(image_path) as src:
        if not src.crs:
            raise ValueError("Raster has no CRS. Cannot automatically crop to geographic AOI.")
            
        # Ensure AOI is in the same CRS
        if aoi_gdf.crs and aoi_gdf.crs != src.crs:
            aoi_gdf = aoi_gdf.to_crs(src.crs)
            
        geometries = [geom for geom in aoi_gdf.geometry]
        
        # Mask the raster
        out_image, out_transform = mask(src, geometries, crop=True)
        return out_image, out_transform

def read_raster_array(image_path: Path) -> np.ndarray:
    """
    Reads the raster as a NumPy array (channels, height, width).
    """
    with rasterio.open(image_path) as src:
        return src.read()
