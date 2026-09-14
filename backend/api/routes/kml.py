from fastapi import APIRouter

router = APIRouter()

@router.post("/upload")
async def upload_kml():
    # TODO: Implement KML processing
    return {"message": "KML endpoint ready"}
