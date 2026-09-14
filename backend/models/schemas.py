from pydantic import BaseModel, Field
from typing import List, Optional

class BoundingBox(BaseModel):
    xmin: float
    ymin: float
    xmax: float
    ymax: float

class Point(BaseModel):
    x: float
    y: float
    
class GeoPoint(BaseModel):
    longitude: float
    latitude: float

class SegmentationInfo(BaseModel):
    valid: bool
    pixel_count: Optional[int] = None

class TreeDetectionResult(BaseModel):
    tree_id: int
    bbox: BoundingBox
    centroid_pixel: Point
    centroid_geo: Optional[GeoPoint] = None
    confidence: float
    
    segmentation: SegmentationInfo
    circular_area_m2: Optional[float] = None
    segmented_area_m2: Optional[float] = None
    
    canopy_area_m2: Optional[float] = None
    area_method: str = Field(..., description="Method used for canopy area: 'segmentation' or 'circular_fallback'")

class AnalysisSummary(BaseModel):
    tree_count: int
    total_canopy_area_m2: Optional[float] = None
    mean_crown_area_m2: Optional[float] = None
    crown_density_per_hectare: Optional[float] = None
    segmentation_success_count: int
    circular_fallback_count: int

class ImageInfo(BaseModel):
    filename: str
    width: int
    height: int
    format: str
    crs: Optional[str] = None
    gsd_m_per_pixel: Optional[float] = None

class AoiInfo(BaseModel):
    source: str
    area_m2: Optional[float] = None

class AnalysisResult(BaseModel):
    analysis_id: str
    image: ImageInfo
    aoi: Optional[AoiInfo] = None
    summary: AnalysisSummary
    trees: List[TreeDetectionResult]
