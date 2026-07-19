import { useState } from "react";
import { api } from "../api";
import { Icons } from "./Icons";
import { colors } from "../utils/colors";
import { formatDueLabel, formatDurationString } from "../utils/formatters";
import { logError } from "../utils/errorLog";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function MedicationStatusRow({ status, childId, onUpdated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nextDoseInput, setNextDoseInput] = useState(toLocalDatetime(status.dueAt));

  const handleMarkTaken = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = {
        child: childId,
        name: status.entry.name,
        time: `${toLocalDatetime(new Date())}:00`,
      };
      if (status.entry.dosage != null) data.dosage = status.entry.dosage;
      if (status.entry.dosage_unit) data.dosage_unit = status.entry.dosage_unit;
      if (status.entry.next_dose_interval) data.next_dose_interval = status.entry.next_dose_interval;
      await api.createMedication(data);
      await onUpdated?.();
    } catch (err) {
      setError("Failed to log dose");
      logError("Mark Medication Taken", err.message);
    }
    setSaving(false);
  };

  const handleSaveNextDose = async () => {
    if (!nextDoseInput) return;
    const target = new Date(nextDoseInput);
    const lastDoseTime = new Date(status.entry.time);
    const hours = (target.getTime() - lastDoseTime.getTime()) / 3600000;
    if (hours <= 0) {
      setError("Next dose must be after the last dose time");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateMedication(status.entry.id, { next_dose_interval: formatDurationString(hours) });
      setEditing(false);
      await onUpdated?.();
    } catch (err) {
      setError("Failed to update next dose");
      logError("Update Next Dose", err.message);
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        background: status.overdue ? "#EF444412" : `${colors.medication}10`,
        border: `1px solid ${status.overdue ? "#EF444430" : `${colors.medication}25`}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{status.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setEditing((e) => !e)}
            title="Set next dose time"
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 2, display: "flex" }}
            aria-label="Set next dose time"
          >
            <Icons.Clock />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: status.overdue ? "#EF4444" : colors.medication, whiteSpace: "nowrap" }}>
            {formatDueLabel(status.dueAt)}
          </span>
          <button
            onClick={handleMarkTaken}
            disabled={saving}
            style={{
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: colors.medication,
              background: `${colors.medication}20`,
              border: `1px solid ${colors.medication}30`,
              borderRadius: 6,
              cursor: saving ? "default" : "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : "Mark as taken"}
          </button>
        </div>
      </div>
      {editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input
            type="datetime-local"
            value={nextDoseInput}
            onChange={(e) => setNextDoseInput(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 12,
              fontFamily: "inherit",
              colorScheme: "dark",
            }}
          />
          <button
            onClick={handleSaveNextDose}
            disabled={saving}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "#22C55E",
              background: "#22C55E15",
              border: "1px solid #22C55E40",
              borderRadius: 8,
              cursor: saving ? "default" : "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Save
          </button>
        </div>
      )}
      {error && <div style={{ color: "#EF4444", fontSize: 11, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
