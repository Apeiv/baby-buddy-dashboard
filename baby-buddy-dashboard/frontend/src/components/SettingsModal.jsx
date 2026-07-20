import { useSyncExternalStore } from "react";
import Modal from "./Modal";
import { Icons } from "./Icons";
import { subscribeErrorLog, getErrorLog, clearErrorLog } from "../utils/errorLog";
import { downloadFile } from "../utils/download";

function formatTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SettingsModal({ connected, lastSync, errorMessage, onRefresh, onClose }) {
  const log = useSyncExternalStore(subscribeErrorLog, getErrorLog);

  const handleExport = () => {
    const lines = log.map((e) => `${e.time}\t${e.action}\t${e.message}`);
    downloadFile(
      `baby-buddy-error-log-${new Date().toISOString().slice(0, 10)}.txt`,
      ["time\taction\tmessage", ...lines].join("\n"),
      "text/plain"
    );
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderRadius: 10,
          marginBottom: 20,
          background: connected ? "#22C55E12" : "#EF444412",
          border: `1px solid ${connected ? "#22C55E30" : "#EF444430"}`,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: connected ? "#22C55E" : "#EF4444",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: connected ? "#22C55E" : "#EF4444" }}>
              {connected ? "Connected" : "Connection error"}
            </span>
          </div>
          {connected && lastSync && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontFamily: "var(--mono)" }}>
              Last sync {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          {!connected && errorMessage && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{errorMessage}</div>
          )}
        </div>
        <button
          onClick={onRefresh}
          title="Refresh now"
          aria-label="Refresh now"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icons.Activity />
        </button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
        Error Log
      </div>
      {log.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
          No errors recorded. Save failures will show up here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 16 }}>
          {log.map((e, i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)", marginBottom: 4 }}>
                <span>{e.action}</span>
                <span>{formatTime(e.time)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text)" }}>{e.message}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleExport}
          disabled={log.length === 0}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 600,
            cursor: log.length === 0 ? "default" : "pointer",
            opacity: log.length === 0 ? 0.5 : 1,
            fontFamily: "inherit",
          }}
        >
          <Icons.Download /> Export log
        </button>
        <button
          onClick={clearErrorLog}
          disabled={log.length === 0}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #EF444440",
            background: "#EF444415",
            color: "#EF4444",
            fontSize: 13,
            fontWeight: 600,
            cursor: log.length === 0 ? "default" : "pointer",
            opacity: log.length === 0 ? 0.5 : 1,
            fontFamily: "inherit",
          }}
        >
          <Icons.Trash /> Clear
        </button>
      </div>
    </Modal>
  );
}
