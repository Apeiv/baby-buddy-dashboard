import { useState } from "react";
import SectionCard from "../components/SectionCard";
import TimelineItem from "../components/TimelineItem";
import MedicationStatusRow from "../components/MedicationStatusRow";
import MedicationLogModal from "../components/MedicationLogModal";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { toNoteTimeline, toMedicationTimeline, getMedicationStatus } from "../utils/formatters";
import { clickableProps } from "../utils/a11y";

const COLLAPSED_COUNT = 5;
const COLLAPSED_COUNT_MEDS = 2;

export default function NotesTab({ childId, notes, medications, onEditEntry, onDataChanged }) {
  const [expanded, setExpanded] = useState({});
  const [showMedicationLog, setShowMedicationLog] = useState(false);
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const noteTimeline = toNoteTimeline(notes || []);
  const medicationTimeline = toMedicationTimeline(medications || []);
  const medicationStatus = getMedicationStatus(medications || []);

  return (
    <>
      <div className="fade-in fade-in-1">
        <SectionCard title="Medications" icon={<Icons.Pill />} color={colors.medication}>
          {medicationStatus.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: medicationTimeline.length > 0 ? 14 : 0 }}>
              {medicationStatus.map((s) => (
                <MedicationStatusRow key={s.name} status={s} childId={childId} onUpdated={onDataChanged} />
              ))}
            </div>
          )}
          {medicationTimeline.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(expanded.medications ? medicationTimeline : medicationTimeline.slice(0, COLLAPSED_COUNT_MEDS)).map((m, i, arr) => (
                <div key={i} className="entry-clickable" {...clickableProps(() => onEditEntry?.("medication", m.entry))}>
                  <TimelineItem
                    time={m.time}
                    label={m.label}
                    detail={m.detail}
                    color={colors.medication}
                    isLast={i === arr.length - 1}
                  />
                </div>
              ))}
              {medicationTimeline.length > COLLAPSED_COUNT_MEDS && (
                <button className="expand-toggle" onClick={() => toggle("medications")}>
                  {expanded.medications ? "Show less" : `Show ${medicationTimeline.length - COLLAPSED_COUNT_MEDS} more`}
                </button>
              )}
            </div>
          ) : (
            medicationStatus.length === 0 && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
                No medications logged
              </div>
            )
          )}
          <button
            onClick={() => setShowMedicationLog(true)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 12,
              padding: "6px 0",
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Log →
          </button>
        </SectionCard>
      </div>

      <div className="fade-in fade-in-2" style={{ marginTop: 16 }}>
        <SectionCard title="Notes" icon={<Icons.StickyNote />} color={colors.note}>
          {noteTimeline.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(expanded.notes ? noteTimeline : noteTimeline.slice(0, COLLAPSED_COUNT)).map((n, i, arr) => (
                <div
                  key={i}
                  className="entry-clickable"
                  {...clickableProps(() => onEditEntry?.("note", n.entry))}
                >
                  <TimelineItem
                    time={n.time}
                    label={n.text}
                    detail={n.ago}
                    color={colors.note}
                    isLast={i === arr.length - 1}
                  />
                </div>
              ))}
              {noteTimeline.length > COLLAPSED_COUNT && (
                <button
                  className="expand-toggle"
                  onClick={() => toggle("notes")}
                >
                  {expanded.notes ? "Show less" : `Show ${noteTimeline.length - COLLAPSED_COUNT} more`}
                </button>
              )}
            </div>
          ) : (
            <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
              No notes yet — tap + to add one
            </div>
          )}
        </SectionCard>
      </div>
      {showMedicationLog && (
        <MedicationLogModal childId={childId} onClose={() => setShowMedicationLog(false)} />
      )}
    </>
  );
}
