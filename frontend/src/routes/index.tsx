import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Github, Linkedin, TreePine, Upload, TriangleAlert, Scan, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tree Crown Analyzer — Canopy Detection & Area Stats" },
      {
        name: "description",
        content:
          "Upload satellite imagery to detect tree crowns, measure canopy area, and read density and mean crown statistics.",
      },
      { property: "og:title", content: "Tree Crown Analyzer — Canopy Detection & Area Stats" },
      {
        property: "og:description",
        content:
          "Upload satellite imagery to detect tree crowns, measure canopy area, and read density and mean crown statistics.",
      },
    ],
  }),
  component: Index,
});

// TODO: confirm these profile URLs.
const SOCIALS = [
  {
    label: "LinkedIn profile",
    href: "https://www.linkedin.com/in/pratyush-dutta-221b94302/",
    Icon: Linkedin,
  },
  { label: "GitHub profile", href: "https://github.com/pratyush06-aec", Icon: Github },
  { label: "X profile", href: "https://x.com/pd_0406official", Icon: XIcon },
] as const;

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const LIMITATIONS = [
  "Automated estimates derived from remote-sensing imagery — not field-validated measurements.",
  "Canopy area in square metres requires a valid GSD or georeferencing; otherwise pixel areas are returned.",
  "Dense or overlapping crowns may be under-segmented, lowering the detected tree count.",
];

function Index() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [gsd, setGsd] = useState("0.30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [MapViewComponent, setMapViewComponent] = useState<any>(null);

  useEffect(() => {
    // Only import the map component in the browser to avoid Leaflet SSR crashes
    import("../components/MapView").then((mod) => {
      setMapViewComponent(() => mod.default);
    });
  }, []);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImageUrl(null);
    }
  }, [imageFile]);

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError("Please select an image file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    const formData = new FormData();
    formData.append("image", imageFile);
    if (kmlFile) {
      formData.append("kml", kmlFile);
    }
    formData.append("gsd", gsd);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const targetUrl = `${API_URL}/api/analyze/`;
      
      const response = await fetch(targetUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errDetail = `${response.statusText}`;
        try {
          const errData = await response.json();
          errDetail = errData.detail || errDetail;
        } catch (e) {
          // ignore parsing error if not json
        }
        throw new Error(`Error ${response.status}: ${errDetail}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      setError(`${err.message} (URL: ${API_URL}/api/analyze/)`);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: "Trees Detected", value: result ? result.summary.tree_count.toString() : "--", unit: "crowns" },
    { label: "Total Canopy", value: result ? result.summary.total_canopy_area_m2.toFixed(1) : "--", unit: result?.image?.gsd_m_per_pixel ? "m²" : "px²" },
    { label: "Tree Density", value: result ? result.summary.crown_density_per_hectare.toFixed(1) : "--", unit: result?.image?.gsd_m_per_pixel ? "/ ha" : "/ M px²" },
    { label: "Mean Crown", value: result ? result.summary.mean_crown_area_m2.toFixed(1) : "--", unit: result?.image?.gsd_m_per_pixel ? "m²" : "px²" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="brutal flex size-14 items-center justify-center bg-primary text-primary-foreground">
              <TreePine className="size-8" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl leading-none sm:text-3xl">Tree Crown Analyzer</h1>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Forest canopy area &amp; detection
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Upload panel */}
          <section className="brutal h-fit bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg">
              <Upload className="size-5 text-primary" strokeWidth={3} />
              Upload Data
            </h2>
            {error && (
              <div className="mt-4 border-l-4 border-red-500 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}
            <div className="mt-5 space-y-5">
              <Field label="Satellite Imagery" hint="Accepts .tiff, .png, .jpg">
                <input
                  type="file"
                  accept=".tif,.tiff,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    setImageFile(e.target.files?.[0] || null);
                    setResult(null);
                  }}
                  className="brutal-sm w-full cursor-pointer bg-input px-3 py-2.5 text-sm file:mr-3 file:border-0 file:bg-primary file:px-2 file:py-1 file:font-mono file:text-xs file:font-bold file:uppercase file:text-primary-foreground"
                />
              </Field>
              <Field label="Forest Boundary (KML)" hint="Optional: restricts the analysis area">
                <input
                  type="file"
                  accept=".kml"
                  onChange={(e) => setKmlFile(e.target.files?.[0] || null)}
                  className="brutal-sm w-full cursor-pointer bg-input px-3 py-2.5 text-sm file:mr-3 file:border-0 file:bg-secondary file:px-2 file:py-1 file:font-mono file:text-xs file:font-bold file:uppercase file:text-secondary-foreground"
                />
              </Field>
              <Field label="Ground Sample Distance" hint="Metres per pixel">
                <input
                  type="number"
                  step="0.01"
                  value={gsd}
                  onChange={(e) => setGsd(e.target.value)}
                  className="brutal-sm w-full bg-input px-3 py-2.5 font-mono text-sm focus:outline-none"
                />
              </Field>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="brutal brutal-press flex w-full items-center justify-center gap-2 bg-primary px-4 py-3.5 font-display text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" strokeWidth={3} />
                ) : (
                  <Scan className="size-5" strokeWidth={3} />
                )}
                {loading ? "Analyzing..." : "Analyze Forest"}
              </button>
            </div>
          </section>

          <div className="space-y-6">
            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <h2 className="sr-only">Detection statistics</h2>
              {stats.map((s, i) => (
                <article
                  key={s.label}
                  className={`brutal p-4 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  <p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest opacity-80">
                    {s.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold leading-none">{s.value}</p>
                  <p className="mt-1 font-mono text-xs opacity-70">{s.unit}</p>
                </article>
              ))}
            </section>

            {/* Map / output */}
            <section className="brutal bg-card">
              <div className="flex items-center justify-between border-b-4 border-border px-4 py-3">
                <h2 className="text-lg">Detection Output</h2>
                <div className="flex items-center gap-4 font-mono text-[0.65rem] uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 border-2 border-primary bg-primary/20" /> Crown
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-accent" /> Centroid
                  </span>
                </div>
              </div>
              <div className="grid-paper relative h-[420px] bg-background">
                {result ? (
                  MapViewComponent ? (
                    <MapViewComponent data={result} imageUrl={imageUrl} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                  )
                ) : (
                  <>
                    <svg
                      viewBox="0 0 600 320"
                      className="absolute inset-0 size-full"
                      role="img"
                      aria-label="Preview of detected tree crown polygons and centroid markers"
                    >
                      {[
                        [90, 90, 34],
                        [180, 150, 26],
                        [260, 80, 30],
                        [350, 170, 38],
                        [450, 100, 24],
                        [500, 210, 32],
                        [140, 230, 28],
                        [300, 250, 22],
                      ].map(([cx, cy, r]) => (
                        <g key={`${cx}-${cy}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            className="fill-primary/20 stroke-primary"
                            strokeWidth={3}
                          />
                          <circle cx={cx} cy={cy} r={4} className="fill-accent" />
                        </g>
                      ))}
                    </svg>
                    <p className="absolute bottom-3 left-3 brutal-sm bg-card px-2 py-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground z-10 pointer-events-none">
                      Sample overlay · load imagery to analyze
                    </p>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Limitations */}
        <section className="brutal mt-6 bg-secondary p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <TriangleAlert className="size-5 text-primary" strokeWidth={3} />
            Scientific Limitations
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {LIMITATIONS.map((text) => (
              <li
                key={text}
                className="border-l-4 border-primary bg-card p-3 text-sm leading-relaxed text-muted-foreground"
              >
                {text}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Tree Crown Analyzer — built for forest insights
          </p>
          <ul className="flex items-center gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${label} (opens in a new tab)`}
                  className="brutal-sm brutal-press flex size-10 items-center justify-center bg-background text-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="font-mono text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
