import os
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/tiff"]
ALLOWED_KML_TYPES = ["application/vnd.google-earth.kml+xml", "application/xml", "text/xml"]

def validate_image_file(file: UploadFile):
    if file.content_type not in ALLOWED_IMAGE_TYPES and not file.filename.endswith((".tif", ".tiff", ".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=400, detail="Invalid image file type. Supported types: GeoTIFF, PNG, JPG.")
    return True

def validate_kml_file(file: UploadFile):
    if not file.filename.endswith(".kml"):
        raise HTTPException(status_code=400, detail="Invalid KML file type. Must be a .kml file.")
    return True

def save_upload_file_tmp(upload_file: UploadFile, suffix: str = "") -> Path:
    try:
        # Create a temp directory for uploads if not exists
        tmp_dir = Path("tmp")
        tmp_dir.mkdir(exist_ok=True)
        
        # Save file to a temporary location
        # A real production app would use tempfile.NamedTemporaryFile or similar
        file_path = tmp_dir / f"{upload_file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return file_path
    finally:
        upload_file.file.close()

def cleanup_tmp_file(file_path: Path):
    if file_path and file_path.exists():
        try:
            os.remove(file_path)
        except Exception:
            pass
