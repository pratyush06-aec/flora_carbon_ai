"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Upload, Activity, Layers, TreeDeciduous } from "lucide-react";

// Dynamically import the map to avoid SSR issues with leaflet window object
const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [gsd, setGsd] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    if (imageFile) formData.append("image", imageFile);
    if (kmlFile) formData.append("kml", kmlFile);
    if (gsd) formData.append("gsd", gsd);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/analyze/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="brutal-card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-background p-3 brutal-border brutal-shadow">
            <TreeDeciduous size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Tree Crown Analyzer</h1>
            <p className="font-bold opacity-80">Forest Canopy Area & Detection</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <section className="brutal-card lg:col-span-1 h-fit space-y-6">
          <h2 className="text-xl font-black uppercase flex items-center gap-2 border-b-4 border-[var(--border-color)] pb-2 mb-4">
            <Upload size={24} /> Upload Data
          </h2>
          
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="space-y-2">
              <label className="font-bold uppercase text-sm block">1. Satellite Imagery (TIFF/PNG/JPG)</label>
              <input 
                type="file" 
                accept=".tif,.tiff,.jpg,.jpeg,.png"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full brutal-input" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold uppercase text-sm block">2. Forest Boundary (KML)</label>
              <input 
                type="file" 
                accept=".kml"
                onChange={(e) => setKmlFile(e.target.files?.[0] || null)}
                className="w-full brutal-input" 
              />
              <p className="text-xs font-bold opacity-75">Optional: Used to restrict analysis area.</p>
            </div>

            <div className="space-y-2">
              <label className="font-bold uppercase text-sm block">3. Ground Sample Distance (m/px)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="e.g. 0.30"
                value={gsd}
                onChange={(e) => setGsd(e.target.value)}
                className="w-full brutal-input" 
              />
              <p className="text-xs font-bold opacity-75">Leave blank to auto-detect from GeoTIFF.</p>
            </div>

            <button 
              type="submit" 
              disabled={loading || !imageFile}
              className={`w-full brutal-button flex justify-center items-center gap-2 ${loading || !imageFile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? <Activity className="animate-spin" /> : <Layers />}
              {loading ? "Analyzing..." : "Analyze Forest"}
            </button>
            {error && <div className="bg-red-200 border-4 border-black p-2 font-bold text-red-900">{error}</div>}
          </form>
        </section>

        {/* Visualization & Results */}
        <section className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Results Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="brutal-card p-4 text-center">
              <p className="text-xs font-bold uppercase mb-1 opacity-80">Trees Detected</p>
              <p className="text-2xl font-black">{result ? result.summary.tree_count : "--"}</p>
            </div>
            <div className="brutal-card p-4 text-center">
              <p className="text-xs font-bold uppercase mb-1 opacity-80">Total Canopy</p>
              <p className="text-2xl font-black">{result?.summary.total_canopy_area_m2 ? result.summary.total_canopy_area_m2.toFixed(1) + " m²" : "-- m²"}</p>
            </div>
            <div className="brutal-card p-4 text-center">
              <p className="text-xs font-bold uppercase mb-1 opacity-80">Tree Density</p>
              <p className="text-2xl font-black">{result?.summary.crown_density_per_hectare ? result.summary.crown_density_per_hectare.toFixed(1) + " /ha" : "-- /ha"}</p>
            </div>
            <div className="brutal-card p-4 text-center">
              <p className="text-xs font-bold uppercase mb-1 opacity-80">Mean Crown</p>
              <p className="text-2xl font-black">{result?.summary.mean_crown_area_m2 ? result.summary.mean_crown_area_m2.toFixed(1) + " m²" : "-- m²"}</p>
            </div>
          </div>

          {/* Map Area */}
          <div className="brutal-card flex-1 min-h-[500px] p-0 relative z-0">
            {!result && (
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center font-bold uppercase text-lg border-2 border-dashed border-[var(--border-color)] m-2 z-10 pointer-events-none opacity-50">
                Map Visualization pending analysis...
              </div>
            )}
            <MapView data={result} />
          </div>

        </section>
      </div>

      {/* Limitations Warning */}
      <footer className="brutal-card bg-yellow-300 text-black border-black mt-8">
        <h3 className="font-black uppercase text-lg mb-2">Scientific Limitations</h3>
        <ul className="list-disc pl-5 font-bold space-y-1 text-sm">
          <li>These are automated estimates from remote-sensing imagery and should not be interpreted as field-validated measurements.</li>
          <li>Canopy area requires valid GSD or georeferencing to calculate square meters. Without it, only pixel areas are returned.</li>
          <li>Dense or overlapping crowns may be under-segmented.</li>
        </ul>
      </footer>
    </div>
  );
}
