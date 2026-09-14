# Flora Carbon AI 🌳

Flora Carbon AI is an end-to-end web application designed to automatically detect tree crowns and estimate canopy areas from high-resolution satellite imagery (GeoTIFF) and Region of Interest (KML) files. 

This project was built as an MVP for forest analysis, carbon estimation approximations, and high-resolution spatial mapping.

---

## 🏗️ System Architecture & Workflow

The architecture uses a decoupled **React/Next.js Frontend** and a **Python/FastAPI Backend**, combining Deep Learning computer vision with Geospatial processing.

### **Workflow:**
1. **Upload**: User uploads a GeoTIFF image, an optional KML boundary, and provides an optional Ground Sample Distance (GSD) via the frontend interface.
2. **Preprocessing**: The FastAPI backend parses the raster using `rasterio` to extract geographical transforms, coordinate reference systems (CRS), and the internal GSD.
3. **Tree Detection**: The `DeepForest` ML model processes the image to identify bounding boxes for potential tree crowns.
4. **Segmentation**: A Marker-Controlled Watershed algorithm (`scikit-image` + `opencv`) crops each bounding box and segments the exact pixels representing the tree crown. 
5. **Geospatial Mapping**: Pixel data is translated into real-world geographic coordinates using the affine transform extracted from the GeoTIFF metadata.
6. **Delivery & Visualization**: The backend returns a highly structured JSON response detailing each tree's centroid, bounding box, confidence score, and calculated canopy area. The frontend visualizes this instantly on an interactive `Leaflet` map.

---

## 🧮 Algorithms & Calculations

The pipeline leverages several models and mathematical formulas to derive meaningful metrics from raw pixels:

### 1. Tree Detection (DeepForest)
- **Algorithm**: A deep-learning object detection model (RetinaNet) pre-trained on airborne RGB imagery.
- **Process**: The image array is fed into the `DeepForest` predictor, which returns bounding boxes `[xmin, ymin, xmax, ymax]` and confidence scores for every detected tree crown.

### 2. Crown Segmentation (Watershed Algorithm)
- **Algorithm**: Marker-Controlled Watershed Segmentation (`scikit-image`, `opencv`).
- **Process**: For each bounding box, the image is cropped. The algorithm applies Gaussian blurring and Otsu's thresholding to create a foreground/background map. A distance transform identifies the "peak" (the center of the tree), which acts as a marker. The watershed algorithm then floods from this marker to accurately segment the specific crown canopy from overlapping branches.

### 3. Canopy Area Calculation
- **Without GSD (Pixels)**: The system sums the number of pixels within the segmented mask. 
  - *Calculation*: `Area (px²) = Sum of valid canopy pixels`
- **With GSD (Meters)**: If the image has Ground Sample Distance (e.g., 0.3 m/px) or geographic metadata, the pixel area is scaled to square meters.
  - *Calculation*: `Area (m²) = Area (px²) × (GSD_X × GSD_Y)`

### 4. Mean Crown Area
- **Process**: Averages the canopy area across all detected trees to provide a single representative metric.
- **Calculation**: `Mean Crown Area = Total Canopy Area ÷ Total Trees Detected`

### 5. Tree Density
- **With GSD (Per Hectare)**: Calculates the number of trees per hectare of the analyzed image.
  - *Calculation*: `Total Image Area (ha) = (Width × Height × GSD_X × GSD_Y) ÷ 10,000`
  - *Density*: `Trees per Hectare = Total Trees Detected ÷ Total Image Area (ha)`
- **Without GSD (Per 1 Million px²)**: Reverts to a relative pixel-density scale.
  - *Calculation*: `Total Image Area (1M px²) = (Width × Height) ÷ 1,000,000`
  - *Density*: `Trees per 1M px² = Total Trees Detected ÷ Total Image Area (1M px²)`

---

## 🛠️ Tech Stack & Dependencies

### **Frontend**
- **Framework**: Next.js 14, React
- **Styling**: Vanilla CSS with a custom "Neubrutalism" green/dark design system
- **Mapping**: Leaflet, React-Leaflet
- **Icons**: Lucide React

### **Backend**
- **Framework**: FastAPI (Python 3)
- **Computer Vision / ML**: DeepForest (v2.1.0+), OpenCV, Scikit-Image
- **Geospatial Processing**: Rasterio, Shapely, PyKML, GeoPandas
- **Data Manipulation**: NumPy, Pandas

---

## 🚀 Getting Started

Follow these steps to set up the environment and run both the frontend and backend locally.

### **1. Clone the Repository**
```bash
git clone https://github.com/pratyush06-aec/flora_carbon_ai.git
cd flora_carbon_ai
```

### **2. Backend Setup**
Navigate to the backend directory, create a virtual environment, install dependencies, and start the FastAPI server.

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On MacOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the development server
uvicorn main:app --reload --port 8000
```
> The API documentation will be automatically available at `http://localhost:8000/docs`.

### **3. Frontend Setup**
Open a new terminal window, navigate to the frontend directory, install npm packages, and start the Next.js server.

```bash
cd frontend

# Install Node modules
npm install

# Start the development server
npm run dev
```
> The web application will now be running on `http://localhost:3000`.

---

## 🧪 How to Test the Application
1. Open your browser and navigate to `http://localhost:3000`.
2. Upload a valid **GeoTIFF (.tif)** file containing high-resolution satellite imagery (RGB).
3. (Optional) Upload a **KML** boundary file.
4. (Optional) Provide the **Ground Sample Distance (m/px)** if your GeoTIFF does not have internal georeferencing metadata.
5. Click **"Analyze Forest"**. 
6. Scroll down to see the detected trees rendered beautifully on the interactive Leaflet map, alongside analytical canopy area statistics.

---

## ⚠️ Scientific Limitations
- **Estimation:** Area calculations are automated estimates derived from computer-vision segmentation and should not replace field-validated measurements.
- **Scale:** Calculating square meters requires a valid Ground Sample Distance (GSD). If the GeoTIFF lacks transform data and GSD is not provided, the API will fallback to computing raw pixel areas.
- **Canopy Overlap:** Densely packed forest canopies may result in under-segmentation (treating grouped trees as a single large crown).

---

Developed by the Flora Carbon AI Team.
