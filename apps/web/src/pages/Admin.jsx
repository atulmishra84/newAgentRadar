import { useEffect, useMemo, useState } from "react";
import useStore from "../store/useStore";
import { adminAPI } from "../lib/api";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-proj-..." },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
  { id: "gemini", name: "Google Gemini", placeholder: "AIzaSy..." },
  { id: "azure_oai", name: "Azure OpenAI", placeholder: "Azure API Key..." },
  { id: "cohere", name: "Cohere", placeholder: "Cohere API Key..." },
  { id: "mistral", name: "Mistral", placeholder: "Mistral API Key..." },
];

function AIKeysPanel() {
  const [keys, setKeys] = useState({});
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState(null);

  const fetchConfig = useStore((s) => s.fetchConfig);

  const loadKeys = async () => {
    try {
      const res = await adminAPI.getAIKeys();
      setKeys(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const configuredCount = useMemo(
    () => PROVIDERS.filter((provider) => keys[provider.id]?.configured).length,
    [keys]
  );

  const setDraft = (providerId, value) => {
    setDrafts((current) => ({ ...current, [providerId]: value }));
  };

  const enableEditing = (providerId) => {
    setEditing((current) => ({ ...current, [providerId]: true }));
  };

  const disableEditing = (providerId) => {
    setEditing((current) => ({ ...current, [providerId]: false }));
    setDrafts((current) => ({ ...current, [providerId]: "" }));
  };

  const handleSave = async (providerId) => {
    const keyInput = drafts[providerId]?.trim();
    if (!keyInput) return;

    setSavingProvider(providerId);
    try {
      await adminAPI.setAIKey(providerId, keyInput);
      disableEditing(providerId);
      await loadKeys();
      await fetchConfig();
    } catch (e) {
      alert("Failed to save key");
    } finally {
      setSavingProvider(null);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--text-muted)" }}>Loading AI keys...</div>;
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
        LLM Integrations
      </div>
      <div
        style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}
      >
        Configure API keys for each supported provider. Radar Assistant will let
        you choose from any LLMs you have configured here.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 16px",
          marginBottom: 20,
          background: "rgba(200,210,240,0.04)",
          border: "1px solid rgba(200,210,240,0.1)",
          borderRadius: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Provider Coverage</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {configuredCount} of {PROVIDERS.length} providers configured
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Chat routing now follows your selected provider.
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {PROVIDERS.map((provider) => {
          const providerState = keys[provider.id] || { configured: false, masked: null };
          const isConfigured = providerState.configured;
          const isEditing = editing[provider.id] || !isConfigured;
          const isSaving = savingProvider === provider.id;
          const draftValue = drafts[provider.id] || "";

          return (
            <div
              key={provider.id}
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid rgba(200,210,240,0.12)",
                background: "rgba(200,210,240,0.03)",
                display: "grid",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{provider.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {isConfigured
                      ? "Ready for Radar Assistant chat selection."
                      : "No API key saved yet."}
                  </div>
                </div>
                {isConfigured && !isEditing ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 999,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>
                      Key Configured
                    </span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      {providerState.masked}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {isEditing ? "Enter a new key to save." : ""}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="password"
                    className="inp"
                    placeholder={provider.placeholder}
                    value={draftValue}
                    onChange={(e) => setDraft(provider.id, e.target.value)}
                    style={{ flex: 1, minWidth: 240 }}
                  />
                  <button
                    type="button"
                    className="btn primary"
                    disabled={isSaving || !draftValue.trim()}
                    onClick={() => handleSave(provider.id)}
                  >
                    {isSaving ? "Saving..." : "Save Key"}
                  </button>
                  {isConfigured ? (
                    <button
                      type="button"
                      className="btn outline"
                      disabled={isSaving}
                      onClick={() => disableEditing(provider.id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Use Update to replace the stored key for this provider.
                  </div>
                  <button
                    type="button"
                    className="btn sm outline"
                    onClick={() => enableEditing(provider.id)}
                  >
                    Update
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin() {
  const tenants = useStore((s) => s.tenants) || [];
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div
      className="view-enter"
      style={{ padding: 24, height: "100%", overflowY: "auto" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 24,
          maxWidth: 1000,
          margin: "0 auto",
          alignItems: "start",
        }}
      >
        <div
          className="card"
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            "General Settings",
            "Tenants & OUs",
            "Users & Roles",
            "Audit Logs",
            "LLM Integrations",
          ].map((t, i) => {
            const key = ["general", "tenants", "users", "audit", "api"][i];
            return (
              <div
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: 8,
                  background:
                    activeTab === key
                      ? "rgba(255,255,255,0.06)"
                      : "transparent",
                  color:
                    activeTab === key
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {t}
              </div>
            );
          })}
        </div>

        <div className="card" style={{ padding: "24px 30px" }}>
          {activeTab === "general" && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                General Settings
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 16,
                    borderBottom: "1px solid rgba(200,210,240,0.1)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      Enforce MFA
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Require multi-factor authentication for all platform
                      users.
                    </div>
                  </div>
                  <div className="sc-toggle on">
                    <div className="sc-toggle-knob" />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 16,
                    borderBottom: "1px solid rgba(200,210,240,0.1)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      Data Retention
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Number of days to keep audit logs.
                    </div>
                  </div>
                  <select className="inp" style={{ width: 120 }}>
                    <option>90 days</option>
                    <option>180 days</option>
                    <option>1 year</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tenants" && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                Tenants & Organizational Units
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {tenants.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 16px",
                      background: "rgba(200,210,240,0.03)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: "1px solid rgba(200,210,240,0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: t.c,
                      }}
                    />
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>
                      {t.n}
                    </div>
                    <button className="btn sm outline">Manage</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {["users", "audit"].includes(activeTab) && (
            <div
              style={{
                color: "var(--text-muted)",
                padding: 40,
                textAlign: "center",
              }}
            >
              Configuration panel for '{activeTab}' coming soon.
            </div>
          )}

          {activeTab === "api" && <AIKeysPanel />}
        </div>
      </div>
    </div>
  );
}
