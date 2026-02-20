import { useState, useRef, useEffect, useCallback } from "react";

const Ken_BURNS_PRESETS = [
  { name: "Zoom In", startScale: 1, endScale: 1.4, startX: 50, startY: 50, endX: 50, endY: 50 },
  { name: "Zoom Out", startScale: 1.4, endScale: 1, startX: 50, startY: 50, endX: 50, endY: 50 },
  { name: "Pan Right", startScale: 1.3, endScale: 1.3, startX: 30, startY: 50, endX: 70, endY: 50 },
  { name: "Pan Left", startScale: 1.3, endScale: 1.3, startX: 70, startY: 50, endX: 30, endY: 50 },
  { name: "Pan Down", startScale: 1.3, endScale: 1.3, startX: 50, startY: 30, endX: 50, endY: 70 },
  { name: "Pan Up", startScale: 1.3, endScale: 1.3, startX: 50, startY: 70, endX: 50, endY: 30 },
  { name: "Zoom In + Pan Right", startScale: 1, endScale: 1.5, startX: 30, startY: 40, endX: 70, endY: 60 },
  { name: "Zoom Out + Pan Left", startScale: 1.5, endScale: 1, startX: 70, startY: 60, endX: 30, endY: 40 },
  { name: "Dramatic Zoom", startScale: 1, endScale: 1.8, startX: 50, startY: 40, endX: 50, endY: 40 },
  { name: "Slow Drift", startScale: 1.15, endScale: 1.25, startX: 45, startY: 45, endX: 55, endY: 55 },
];

function createSlide(imageUrl, fileName) {
  return {
    id: Date.now() + Math.random(),
    imageUrl,
    fileName,
    duration: 5,
    kenBurns: { ...KEN_BURNS_PRESETS[0] },
    transition: "crossfade",
  };
}

// ── Slide Thumbnail ──
function SlideThumbnail({ slide, index, isSelected, isPlaying, onClick, onRemove, onReorder }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("slideIndex", index)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fromIndex = parseInt(e.dataTransfer.getData("slideIndex"));
        if (!isNaN(fromIndex)) onReorder(fromIndex, index);
      }}
      onClick={onClick}
      style={{
        position: "relative",
        width: 120,
        minWidth: 120,
        height: 80,
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        border: isSelected ? "2px solid #E8A87C" : dragOver ? "2px dashed #E8A87C" : "2px solid transparent",
        boxShadow: isSelected ? "0 0 16px rgba(232,168,124,0.3)" : "0 2px 8px rgba(0,0,0,0.3)",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      <img src={slide.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        padding: "12px 6px 4px", fontSize: 10, color: "#ccc", textAlign: "center",
      }}>
        {index + 1} · {slide.duration}s
      </div>
      {isPlaying && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "#E8A87C",
        }} />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          position: "absolute", top: 3, right: 3,
          background: "rgba(0,0,0,0.6)", border: "none", color: "#aaa",
          width: 18, height: 18, borderRadius: "50%", cursor: "pointer",
          fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

// ── Ken Burns Preview ──
function KenBurnsCanvas({ slide, progress, width, height }) {
  const t = progress ?? 0;
  const kb = slide.kenBurns;
  const scale = kb.startScale + (kb.endScale - kb.startScale) * t;
  const x = kb.startX + (kb.endX - kb.startX) * t;
  const y = kb.startY + (kb.endY - kb.startY) * t;

  return (
    <div style={{ width, height, overflow: "hidden", background: "#000", position: "relative" }}>
      <img
        src={slide.imageUrl}
        alt=""
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: `${x}% ${y}%`,
          transition: progress === undefined ? "transform 0.3s ease" : "none",
        }}
      />
    </div>
  );
}

// ── Playback Engine ──
function PlaybackView({ slides, musicUrl, narrationUrl, musicVolume, narrationVolume, onStop }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [globalTime, setGlobalTime] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const musicRef = useRef(null);
  const narrationRef = useRef(null);

  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);

  const getSlideAtTime = useCallback((time) => {
    let acc = 0;
    for (let i = 0; i < slides.length; i++) {
      if (time < acc + slides[i].duration) {
        return { index: i, slideProgress: (time - acc) / slides[i].duration };
      }
      acc += slides[i].duration;
    }
    return { index: slides.length - 1, slideProgress: 1 };
  }, [slides]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    if (narrationRef.current) narrationRef.current.volume = narrationVolume;
  }, [narrationVolume]);

  useEffect(() => {
    startTimeRef.current = performance.now();

    if (musicUrl) {
      musicRef.current = new Audio(musicUrl);
      musicRef.current.volume = musicVolume;
      musicRef.current.loop = true;
      musicRef.current.play().catch(() => {});
    }
    if (narrationUrl) {
      narrationRef.current = new Audio(narrationUrl);
      narrationRef.current.volume = narrationVolume;
      narrationRef.current.play().catch(() => {});
    }

    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      if (elapsed >= totalDuration) {
        if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
        if (narrationRef.current) { narrationRef.current.pause(); narrationRef.current = null; }
        onStop();
        return;
      }
      setGlobalTime(elapsed);
      const { index, slideProgress } = getSlideAtTime(elapsed);

      const slide = slides[index];
      const transTime = 0.8;
      const remaining = slide.duration - (slideProgress * slide.duration);
      if (remaining < transTime) {
        setFadeOpacity(remaining / transTime);
      } else if (slideProgress * slide.duration < transTime) {
        setFadeOpacity(Math.min(1, (slideProgress * slide.duration) / transTime));
      } else {
        setFadeOpacity(1);
      }

      setCurrentSlide(index);
      setProgress(slideProgress);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
      if (narrationRef.current) { narrationRef.current.pause(); narrationRef.current = null; }
    };
  }, [slides, musicUrl, narrationUrl, totalDuration, getSlideAtTime, onStop, musicVolume, narrationVolume]);

  const slide = slides[currentSlide];
  if (!slide) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000" }}>
      <div style={{ opacity: fadeOpacity, transition: "opacity 0.1s linear", width: "100%", height: "100%" }}>
        <KenBurnsCanvas slide={slide} progress={progress} width="100%" height="100%" />
      </div>
      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
        background: "rgba(255,255,255,0.15)",
      }}>
        <div style={{
          height: "100%", background: "#E8A87C",
          width: `${(globalTime / totalDuration) * 100}%`,
          transition: "width 0.1s linear",
        }} />
      </div>
      {/* Slide counter */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        background: "rgba(0,0,0,0.5)", color: "#fff",
        padding: "4px 12px", borderRadius: 20, fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {currentSlide + 1} / {slides.length}
      </div>
      {/* Stop button */}
      <button
        onClick={onStop}
        style={{
          position: "absolute", top: 16, left: 16,
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff", padding: "6px 16px", borderRadius: 20, cursor: "pointer",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          backdropFilter: "blur(8px)",
        }}
      >
        ■ Stop
      </button>
    </div>
  );
}

// ── Audio Recorder ──
function AudioRecorder({ onRecorded, label }) {
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onRecorded(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setTime(0);
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stop = () => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {!recording ? (
        <button onClick={start} style={btnSmall}>⏺ Record {label}</button>
      ) : (
        <button onClick={stop} style={{ ...btnSmall, background: "#c0392b", borderColor: "#c0392b" }}>
          ■ Stop ({fmt(time)})
        </button>
      )}
    </div>
  );
}

const btnSmall = {
  background: "transparent",
  border: "1px solid rgba(232,168,124,0.4)",
  color: "#E8A87C",
  padding: "6px 14px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "'DM Sans', sans-serif",
  transition: "all 0.2s",
};

const btnPrimary = {
  background: "linear-gradient(135deg, #E8A87C, #D4845A)",
  border: "none",
  color: "#1a1a2e",
  padding: "10px 24px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  transition: "all 0.2s",
};

const labelStyle = {
  fontSize: 11,
  color: "#8a8a9a",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  fontFamily: "'DM Sans', sans-serif",
};

const panelStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: 16,
};

// ── Main App ──
export default function DigitalStoryCreator() {
  const [slides, setSlides] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [musicUrl, setMusicUrl] = useState(null);
  const [musicName, setMusicName] = useState("");
  const [narrationUrl, setNarrationUrl] = useState(null);
  const [narrationName, setNarrationName] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewAnimRef = useRef(null);
  const fileInputRef = useRef(null);
  const musicInputRef = useRef(null);
  const narrationInputRef = useRef(null);

  const selectedSlide = selectedIndex >= 0 && selectedIndex < slides.length ? slides[selectedIndex] : null;

  // Auto-animate preview
  useEffect(() => {
    if (playing || !selectedSlide) {
      cancelAnimationFrame(previewAnimRef.current);
      return;
    }
    let start = performance.now();
    const dur = selectedSlide.duration * 1000;
    const animate = () => {
      const elapsed = performance.now() - start;
      const p = (elapsed % dur) / dur;
      setPreviewProgress(p);
      previewAnimRef.current = requestAnimationFrame(animate);
    };
    previewAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(previewAnimRef.current);
  }, [selectedSlide, playing, selectedSlide?.kenBurns, selectedSlide?.duration]);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newSlides = [];
    let loaded = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newSlides.push(createSlide(ev.target.result, file.name));
        loaded++;
        if (loaded === files.length) {
          setSlides((prev) => {
            const updated = [...prev, ...newSlides];
            if (prev.length === 0) setSelectedIndex(0);
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleAudioUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "music") { setMusicUrl(url); setMusicName(file.name); }
    else { setNarrationUrl(url); setNarrationName(file.name); }
    e.target.value = "";
  };

  const updateSlide = (index, updates) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const removeSlide = (index) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex >= slides.length - 1) setSelectedIndex(Math.max(0, slides.length - 2));
  };

  const reorderSlides = (from, to) => {
    if (from === to) return;
    setSlides((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    if (selectedIndex === from) setSelectedIndex(to);
  };

  const applyKenBurnsPreset = (preset) => {
    if (selectedIndex < 0) return;
    updateSlide(selectedIndex, { kenBurns: { ...preset } });
  };

  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);

  // ─── Playback Mode ───
  if (playing) {
    return (
      <div style={{
        width: "100vw", height: "100vh", background: "#000",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <PlaybackView
          slides={slides}
          musicUrl={musicUrl}
          narrationUrl={narrationUrl}
          musicVolume={musicVolume}
          narrationVolume={narrationVolume}
          onStop={() => setPlaying(false)}
        />
      </div>
    );
  }

  // ─── Editor Mode ───
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      color: "#e0e0e0",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet" />

      {/* ── Top Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700,
            background: "linear-gradient(135deg, #E8A87C, #D4845A)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            StoryMotion
          </span>
          <span style={{ fontSize: 11, color: "#6a6a7a", borderLeft: "1px solid #333", paddingLeft: 12 }}>
            {slides.length} slide{slides.length !== 1 ? "s" : ""} · {totalDuration}s total
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={btnSmall}
          >
            + Add Photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
          />
          {slides.length >= 1 && (
            <button onClick={() => setPlaying(true)} style={btnPrimary}>
              ▶ Play Story
            </button>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Preview Panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16 }}>
          {/* Preview */}
          <div style={{
            flex: 1,
            borderRadius: 12,
            overflow: "hidden",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            minHeight: 0,
          }}>
            {selectedSlide ? (
              <KenBurnsCanvas
                slide={selectedSlide}
                progress={previewProgress}
                width="100%"
                height="100%"
              />
            ) : (
              <div style={{
                textAlign: "center", color: "#555", padding: 40,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🎬</div>
                <div style={{ fontSize: 16 }}>
                  {slides.length === 0 ? "Add photos to begin your story" : "Select a slide to preview"}
                </div>
                {slides.length === 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ ...btnPrimary, marginTop: 20 }}
                  >
                    + Upload Photos
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Slide Strip (Timeline) ── */}
          <div style={{
            display: "flex", gap: 8, overflowX: "auto",
            padding: "8px 4px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 10,
            minHeight: 96,
            alignItems: "center",
          }}>
            {slides.map((slide, i) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                index={i}
                isSelected={i === selectedIndex}
                isPlaying={false}
                onClick={() => setSelectedIndex(i)}
                onRemove={() => removeSlide(i)}
                onReorder={reorderSlides}
              />
            ))}
            {slides.length > 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80, minWidth: 80, height: 80, borderRadius: 8,
                  border: "2px dashed rgba(255,255,255,0.12)",
                  background: "transparent", color: "#555", fontSize: 24,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
              >+</button>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{
          width: 320, minWidth: 320,
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.15)",
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {/* ── Slide Settings ── */}
          {selectedSlide ? (
            <>
              <div>
                <div style={labelStyle}>Slide {selectedIndex + 1}: {selectedSlide.fileName}</div>
              </div>

              {/* Duration */}
              <div style={panelStyle}>
                <div style={labelStyle}>Duration</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={0.5}
                    value={selectedSlide.duration}
                    onChange={(e) => updateSlide(selectedIndex, { duration: parseFloat(e.target.value) })}
                    style={{ flex: 1, accentColor: "#E8A87C" }}
                  />
                  <span style={{ fontSize: 14, color: "#E8A87C", minWidth: 32, textAlign: "right" }}>
                    {selectedSlide.duration}s
                  </span>
                </div>
              </div>

              {/* Ken Burns */}
              <div style={panelStyle}>
                <div style={labelStyle}>Ken Burns Effect</div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12,
                }}>
                  {KEN_BURNS_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyKenBurnsPreset(preset)}
                      style={{
                        ...btnSmall,
                        fontSize: 10,
                        padding: "5px 8px",
                        textAlign: "center",
                        background:
                          selectedSlide.kenBurns.name === preset.name
                            ? "rgba(232,168,124,0.15)"
                            : "transparent",
                        borderColor:
                          selectedSlide.kenBurns.name === preset.name
                            ? "rgba(232,168,124,0.5)"
                            : "rgba(255,255,255,0.1)",
                        color:
                          selectedSlide.kenBurns.name === preset.name
                            ? "#E8A87C"
                            : "#999",
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                {/* Custom controls */}
                <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>Fine-tune</div>
                {[
                  ["startScale", "Start Zoom", 0.8, 2],
                  ["endScale", "End Zoom", 0.8, 2],
                  ["startX", "Start X", 0, 100],
                  ["startY", "Start Y", 0, 100],
                  ["endX", "End X", 0, 100],
                  ["endY", "End Y", 0, 100],
                ].map(([key, lbl, min, max]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#777", width: 56, flexShrink: 0 }}>{lbl}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={key.includes("Scale") ? 0.05 : 1}
                      value={selectedSlide.kenBurns[key]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateSlide(selectedIndex, {
                          kenBurns: { ...selectedSlide.kenBurns, [key]: val, name: "Custom" },
                        });
                      }}
                      style={{ flex: 1, accentColor: "#E8A87C" }}
                    />
                    <span style={{ fontSize: 10, color: "#999", width: 28, textAlign: "right" }}>
                      {selectedSlide.kenBurns[key].toFixed(key.includes("Scale") ? 1 : 0)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ ...panelStyle, textAlign: "center", color: "#555", padding: 32 }}>
              {slides.length === 0
                ? "Upload photos to get started"
                : "Select a slide to edit its properties"}
            </div>
          )}

          {/* ── Audio Section ── */}
          <div style={panelStyle}>
            <div style={labelStyle}>🎵 Background Music</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => musicInputRef.current?.click()} style={btnSmall}>
                {musicUrl ? "Change Music" : "Upload Music"}
              </button>
              <input
                ref={musicInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => handleAudioUpload(e, "music")}
                style={{ display: "none" }}
              />
              {musicUrl && (
                <>
                  <div style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ♫ {musicName || "Recorded"}
                    </span>
                    <button
                      onClick={() => { setMusicUrl(null); setMusicName(""); }}
                      style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}
                    >×</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#666" }}>Vol</span>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: "#E8A87C" }}
                    />
                    <span style={{ fontSize: 10, color: "#999", width: 28 }}>
                      {Math.round(musicVolume * 100)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>🎙 Narration</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <AudioRecorder
                  label="Narration"
                  onRecorded={(url) => { setNarrationUrl(url); setNarrationName("Recording"); }}
                />
                <button onClick={() => narrationInputRef.current?.click()} style={btnSmall}>
                  Upload
                </button>
                <input
                  ref={narrationInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleAudioUpload(e, "narration")}
                  style={{ display: "none" }}
                />
              </div>
              {narrationUrl && (
                <>
                  <div style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      🎙 {narrationName}
                    </span>
                    <button
                      onClick={() => { setNarrationUrl(null); setNarrationName(""); }}
                      style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}
                    >×</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#666" }}>Vol</span>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={narrationVolume}
                      onChange={(e) => setNarrationVolume(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: "#E8A87C" }}
                    />
                    <span style={{ fontSize: 10, color: "#999", width: 28 }}>
                      {Math.round(narrationVolume * 100)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div style={{
            padding: 12, borderRadius: 8,
            background: "rgba(232,168,124,0.05)",
            border: "1px solid rgba(232,168,124,0.1)",
            fontSize: 11, color: "#8a7a6a", lineHeight: 1.5,
          }}>
            <strong style={{ color: "#E8A87C" }}>Tips:</strong><br/>
            · Drag slides to reorder them<br/>
            · Use presets or fine-tune the Ken Burns effect<br/>
            · Record narration directly or upload an audio file<br/>
            · Music loops automatically during playback
          </div>
        </div>
      </div>
    </div>
  );
}
