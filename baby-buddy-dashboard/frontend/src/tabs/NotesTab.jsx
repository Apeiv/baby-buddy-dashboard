import { useState } from "react";
import SectionCard from "../components/SectionCard";
import TimelineItem from "../components/TimelineItem";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { toNoteTimeline, toMedicationTimeline, getMedicationStatus } from "../utils/formatters";
import { clickableProps } from "../utils/a11y";

const COLLAPSED_COUNT = 5;
const COLLAPSED_COUNT_MEDS = 2;

export default function NotesTab({ notes, medications, onEditEntry }) {
  const [expanded, setExpanded] = useState({});
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
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: s.overdue ? "#EF444412" : `${colors.medication}10`,
                    border: `1px solid ${s.overdue ? "#EF444430" : `${colors.medication}25`}`,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.overdue ? "#EF4444" : colors.medication }}>
                    {s.overdue
                      ? `Overdue since ${s.dueAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : `Next dose ${s.dueAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                </div>
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
    </>
  );
}
