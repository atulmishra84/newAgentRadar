import { useState, useEffect, useRef } from "react";
import useStore from "../store/useStore";
import { scanAPI } from "../lib/api";
import { SCANNERS } from "../lib/scanners";

export default function LiveDetection() {
  const [activeTab, setActiveTab] = useState("scanners");
  const [filter, setFilter] = useState("all");
  const [sysStatus, setSysStatus] = useState(null);
  const [feed, setFeed] = useState([]);

  const pollInterval = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await scanAPI.getStatus();
      if (res.data) {
        setSysStatus(res.data);
        if (res.data.events && res.data.events.length > 0) {
          setFeed(
            res.data.events.map((e, i) => ({
              t:
                typeof e === "string"
                  ? e
                  : e.t || e.message || JSON.stringify(e),
              c: "log-acc",
              id: Date.now() + i,
              time: e.time || new Date().toLocaleTimeString(),
            })),
          );
        }
      }
    } catch (e) {
      console.error("Failed to fetch scan status", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    pollInterval.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollInterval.current);
  }, []);

  async function runScan(id) {
    setSysStatus((prev) => ({
      ...prev,
      scannersMetrics: {
        ...(prev?.scannersMetrics || {}),
        [id]: {
          ...((prev?.scannersMetrics || {})[id] || {}),
          status: "running",
        },
      },
    }));
    try {
      await scanAPI.triggerScan(id);
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  }

  async function runAllScanners() {
    SCANNERS.forEach((s) => runScan(s.id));
  }

  const filteredScanners =
    filter === "all" ? SCANNERS : SCANNERS.filter((s) => s.category === filter);

  const activeCount = sysStatus?.activeWorkers || 0;
  const eps = sysStatus?.totalAgentsDetected || 0;
  const epm = activeCount * 42;

  const tabs = [
    { id: "scanners", label: "Active Scanners" },
    { id: "feed", label: "Live Events Feed" },
  ];

  const filterList = [
    { id: "all", label: "All scanners" },
    { id: "network", label: "Network" },
    { id: "cloud", label: "Cloud API" },
    { id: "healthcare", label: "Healthcare" },
    { id: "process", label: "Process" },
    { id: "log", label: "Log / SIEM" },
    { id: "dns", label: "DNS / Traffic" },
  ];

  return (
    <div
      className="view-enter"
      style={{
        padding: 24,
        height: "100%",
        overflowY: "auto",
        background: "radial-gradient(circle at top left, #0f172a, #020617)",
      }}
    >
      <div
        style={{
          background: "rgba(30, 41, 59, 0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          padding: "24px",
          borderRadius: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: activeCount > 0 ? "#10b981" : "#64748b",
            boxShadow: activeCount > 0 ? "0 0 20px #10b981" : "none",
            animation: activeCount > 0 ? "livePulse 2s infinite" : "none",
          }}
        ></div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#f8fafc",
              marginBottom: "4px",
            }}
          >
            Live Detection Engine — {activeCount > 0 ? "Active" : "Standby"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Continuously monitoring internal and external surfaces for shadow AI
            and agentic endpoints. Integrated with PostgreSQL telemetry.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "12px",
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              color: "#10b981",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            Active Scanners
          </div>
          <div
            style={{
              fontSize: "2.5rem",
              color: "#f8fafc",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {activeCount}{" "}
            <span style={{ fontSize: "1rem", color: "#64748b" }}>
              / {SCANNERS.length}
            </span>
          </div>
          {activeCount > 0 && (
            <div
              style={{
                position: "absolute",
                right: -20,
                bottom: -20,
                width: 100,
                height: 100,
                background: "#10b981",
                filter: "blur(50px)",
                opacity: 0.3,
              }}
            />
          )}
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.02))",
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: "12px",
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              color: "#38bdf8",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            Agents Detected
          </div>
          <div
            style={{
              fontSize: "2.5rem",
              color: "#f8fafc",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {eps}
          </div>
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.02))",
            border: "1px solid rgba(244,63,94,0.2)",
            borderRadius: "12px",
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              color: "#f43f5e",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            Events / Min
          </div>
          <div
            style={{
              fontSize: "2.5rem",
              color: "#f8fafc",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {epm}
          </div>
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.02))",
            border: "1px solid rgba(168,85,247,0.2)",
            borderRadius: "12px",
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              color: "#a855f7",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            DB Sync Status
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              color: "#f8fafc",
              fontWeight: 700,
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#a855f7",
                boxShadow: "0 0 10px #a855f7",
              }}
            ></span>{" "}
            Real-time
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "2px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          marginBottom: "16px",
        }}
      >
        {tabs.map((t) => (
          <span
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "12px 24px",
              cursor: "pointer",
              color: activeTab === t.id ? "#f8fafc" : "#94a3b8",
              borderBottom:
                activeTab === t.id
                  ? "2px solid #38bdf8"
                  : "2px solid transparent",
              transition: "all 0.2s ease",
              fontWeight: activeTab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </span>
        ))}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
            paddingRight: "8px",
          }}
        >
          <button
            style={{
              background: "linear-gradient(to right, #2563eb, #3b82f6)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              transition: "transform 0.1s",
            }}
            onClick={runAllScanners}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.96)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            ⟳ Run All Capabilities
          </button>
        </div>
      </div>

      {activeTab === "scanners" && (
        <>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              padding: "8px 0 16px",
            }}
          >
            {filterList.map((f) => (
              <span
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background:
                    filter === f.id
                      ? "rgba(56, 189, 248, 0.15)"
                      : "transparent",
                  color: filter === f.id ? "#38bdf8" : "#94a3b8",
                  border:
                    filter === f.id
                      ? "1px solid rgba(56, 189, 248, 0.4)"
                      : "1px solid rgba(148, 163, 184, 0.2)",
                  transition: "all 0.2s ease",
                }}
              >
                {f.label}
              </span>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredScanners.map((s) => {
              const metrics = sysStatus?.scannersMetrics?.[s.id] || {};
              const isRun = metrics.status === "running";
              const lastRunDate = metrics.lastRun
                ? new Date(metrics.lastRun)
                : null;
              const lastRunText = lastRunDate
                ? `${lastRunDate.getHours()}:${lastRunDate.getMinutes().toString().padStart(2, "0")}`
                : "Never";

              return (
                <div
                  key={s.id}
                  style={{
                    background: "rgba(30, 41, 59, 0.5)",
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${isRun ? s.color : "rgba(148, 163, 184, 0.1)"}`,
                    borderRadius: "16px",
                    padding: "20px",
                    transition: "all 0.3s ease",
                    boxShadow: isRun
                      ? `0 0 20px ${s.color}20, inset 0 0 10px ${s.color}10`
                      : "none",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "12px",
                        background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`,
                        border: `1px solid ${s.color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        boxShadow: isRun ? `0 0 15px ${s.color}40` : "none",
                      }}
                    >
                      {s.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          color: "#f8fafc",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: s.color,
                          marginTop: "2px",
                          fontWeight: 500,
                        }}
                      >
                        {s.category.toUpperCase()}
                      </div>
                    </div>
                    <button
                      style={{
                        background: isRun
                          ? `${s.color}20`
                          : "rgba(255,255,255,0.05)",
                        color: isRun ? s.color : "#cbd5e1",
                        border: `1px solid ${isRun ? s.color : "rgba(255,255,255,0.1)"}`,
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: isRun ? "default" : "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      onClick={() => !isRun && runScan(s.id)}
                      disabled={isRun}
                    >
                      {isRun ? (
                        <>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: s.color,
                              animation: "livePulse 1s infinite",
                            }}
                          ></span>{" "}
                          Scanning
                        </>
                      ) : (
                        "Run Now"
                      )}
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      lineHeight: 1.5,
                      flex: 1,
                      marginBottom: "16px",
                    }}
                  >
                    {s.desc}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                      background: "rgba(15, 23, 42, 0.4)",
                      borderRadius: "8px",
                      padding: "12px",
                      border: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          marginBottom: "4px",
                        }}
                      >
                        Hits
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          color: "#f8fafc",
                          fontWeight: 600,
                        }}
                      >
                        {metrics.hits || 0}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          marginBottom: "4px",
                        }}
                      >
                        Scanned
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          color: "#f8fafc",
                          fontWeight: 600,
                        }}
                      >
                        {metrics.scanned || 0}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          marginBottom: "4px",
                        }}
                      >
                        Last Run
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          color: "#f8fafc",
                          fontWeight: 500,
                        }}
                      >
                        {lastRunText}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "feed" && (
        <div
          style={{
            background: "#020617",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              background: "#0f172a",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 10px #10b981",
                animation: "livePulse 2s infinite",
              }}
            ></span>
            <span
              style={{
                color: "#e2e8f0",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "1px",
              }}
            >
              SYSTEM EVENT FEED
            </span>
          </div>
          <div
            style={{
              padding: "20px",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.85rem",
              lineHeight: 1.6,
              height: "400px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {feed.length === 0 && (
              <div style={{ color: "#475569" }}>
                No events recorded. Run a scan to generate events.
              </div>
            )}
            {feed.map((f) => (
              <div key={f.id} style={{ display: "flex", gap: "16px" }}>
                <span style={{ color: "#475569", minWidth: "85px" }}>
                  [{f.time}]
                </span>
                <span
                  style={{
                    color: f.t.includes("COMPLETED")
                      ? "#10b981"
                      : f.t.includes("STARTED")
                        ? "#38bdf8"
                        : "#e2e8f0",
                  }}
                >
                  {f.t}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
