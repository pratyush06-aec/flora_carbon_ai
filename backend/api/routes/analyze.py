import uuid
import numpy as np
import logging
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks
from typing import Optional
from utils.file_utils import validate_image_file, validate_kml_file, save_upload_file_tmp, cleanup_tmp_file
from services.raster_service import get_raster_metadata, read_raster_array
from services.kml_service import parse_kml_to_gdf, get_aoi_polygon
from services.detection_service import get_detector
from services.segmentation_service import segment_crown_watershed
from services.geometry_service import mask_to_polygon, bounding_box_to_polygon
from services.area_service import calculate_canopy_area
from utils.image_utils import extract_crop
from models.schemas import AnalysisResult, ImageInfo, AoiInfo, AnalysisSummary, TreeDetectionResult, BoundingBox, Point, GeoPoint, SegmentationInfo

router = APIRouter()

@router.post("/", response_model=AnalysisResult)
async def analyze_image(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    kml: Optional[UploadFile] = File(None),
    gsd: Optional[float] = Form(None)
):
    try:
        # Validate inputs
        validate_image_file(image)
        if kml:
            validate_kml_file(kml)
            
        # Save files temporarily
        image_path = save_upload_file_tmp(image)
        kml_path = save_upload_file_tmp(kml) if kml else None
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_tmp_file, image_path)
        if kml_path:
            background_tasks.add_task(cleanup_tmp_file, kml_path)

        # 1. Raster Metadata
        meta = get_raster_metadata(image_path)
        gsd_x = gsd if gsd is not None else meta.get("gsd_x")
        gsd_y = gsd if gsd is not None else meta.get("gsd_y")
        
        # 2. Geo Processing / AOI
        aoi_area = None
        aoi_source = "None"
        if kml_path:
            aoi_gdf = parse_kml_to_gdf(kml_path)
            # Use Shapely bounding box or convex hull for simple mapping
            # For simplicity in MVP, we just record KML source presence
            aoi_source = "KML"
        
        # 3. Read Image Array
        image_array_chw = read_raster_array(image_path)
        if len(image_array_chw.shape) == 3:
            image_array = np.transpose(image_array_chw, (1, 2, 0))
        else:
            image_array = image_array_chw
            
        # Keep 3 channels
        if image_array.shape[2] > 3:
            image_array = image_array[:, :, :3]
            
        # 4. Detection
        detector = get_detector()
        boxes = detector.detect_trees(image_array)
        
        trees = []
        total_canopy = 0.0
        seg_success = 0
        circ_fallback = 0
        
        for idx, row in boxes.iterrows():
            xmin, ymin, xmax, ymax = row["xmin"], row["ymin"], row["xmax"], row["ymax"]
            cx, cy = row["centroid_x"], row["centroid_y"]
            conf = row.get("score", 0.0)
            
            # 5. Segmentation
            crop, start_x, start_y = extract_crop(image_array, int(xmin), int(ymin), int(xmax), int(ymax))
            lcx = cx - start_x
            lcy = cy - start_y
            
            is_valid, mask = segment_crown_watershed(crop, lcx, lcy)
            
            # 6. Area Calculation
            area_val, method = calculate_canopy_area(
                is_valid, mask, xmin, ymin, xmax, ymax, gsd_x, gsd_y
            )
            
            geo_pt = None
            if meta.get("transform") and not meta.get("transform").is_identity:
                t = meta["transform"]
                gx, gy = t * (cx, cy)
                geo_pt = GeoPoint(longitude=gx, latitude=gy)
                
            total_canopy += area_val
            if method == "segmentation":
                seg_success += 1
            else:
                circ_fallback += 1
                
            tree = TreeDetectionResult(
                tree_id=int(idx) + 1,
                bbox=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                centroid_pixel=Point(x=cx, y=cy),
                centroid_geo=geo_pt,
                confidence=float(conf),
                segmentation=SegmentationInfo(valid=is_valid, pixel_count=int(np.sum(mask)) if is_valid else None),
                canopy_area_m2=float(area_val) if gsd_x else None,
                segmented_area_m2=float(area_val) if method == "segmentation" else None,
                circular_area_m2=float(area_val) if method == "circular_fallback" else None,
                area_method=method
            )
            trees.append(tree)
            
        tree_count = len(trees)
        mean_area = float(total_canopy / tree_count) if tree_count > 0 else 0.0
        
        # Calculate density
        density = 0.0
        if tree_count > 0:
            if gsd_x and gsd_y:
                area_ha = (meta["width"] * meta["height"] * gsd_x * gsd_y) / 10000.0
                density = float(tree_count / area_ha) if area_ha > 0 else 0.0
            else:
                area_1Mpx = (meta["width"] * meta["height"]) / 1000000.0
                density = float(tree_count / area_1Mpx) if area_1Mpx > 0 else 0.0
        
        res = AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            image=ImageInfo(
                filename=image.filename,
                width=meta["width"],
                height=meta["height"],
                format=meta.get("driver", "Unknown"),
                crs=meta.get("crs"),
                gsd_m_per_pixel=gsd_x
            ),
            aoi=AoiInfo(source=aoi_source, area_m2=None),
            summary=AnalysisSummary(
                tree_count=tree_count,
                total_canopy_area_m2=float(total_canopy),
                mean_crown_area_m2=mean_area,
                crown_density_per_hectare=density,
                segmentation_success_count=seg_success,
                circular_fallback_count=circ_fallback
            ),
            trees=trees
        )
        return res
        
    except Exception as e:
        logging.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal error occurred during analysis.")
