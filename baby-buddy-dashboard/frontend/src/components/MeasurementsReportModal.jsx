import { useState } from "react";
import Modal from "./Modal";
import { buildDailyMeasurementsReport } from "../utils/formatters";
import { useUnits } from "../utils/units";
import { downloadFile } from "../utils/download";
import { colors } from "../utils/colors";
import ReportRangeBar from "./ReportRangeBar";

export default function MeasurementsReportModal({ weights, heights, headCircumferences, bmis, onClose }) {
  const units = useUnits();
  const [rangeDays, setRangeDays] = useState(30);

  const rows = buildDailyMeasurementsReport(
    weights || [],
    heights || [],
    headCircumferences || [],
    bmis || [],
    rangeDays
  ).filter((r) => r.weight != null || r.height != null || r.headCircumference != null || r.bmi != null);

  const handleExport = () => {
    const header = ["Date", `Weight (${units.weight})`, `Height (${units.length})`, `Head Circ. (${units.length})`, "BMI"];
    const lines = rows.map((r) =>
      [r.date, r.weight ?? "", r.height ?? "", r.headCircumference ?? "", r.bmi ?? ""].join(",")
    );
    downloadFile(`baby-buddy-measure-report-${rangeDays}d.csv`, [header.join(","), ...lines].join("\n"), "text/csv");
  };

  const cellStyle = { padding: "8px 6px", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <Modal title="Daily Report — Measure" onClose={onClose} maxWidth={560}>
      <ReportRangeBar
        rangeDays={rangeDays}
        setRangeDays={setRangeDays}
        onExport={handleExport}
        exportDisabled={rows.length === 0}
      />

      {rows.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
          No measurements logged in this range
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--text-dim)", fontWeight: 500 }}>Date</th>
                {[`Weight (${units.weight})`, `Height (${units.length})`, `Head Circ. (${units.length})`, "BMI"].map((h) => (
                  <th key={h} style={{ ...cellStyle, color: "var(--text-dim)", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 6px", color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap" }}>{r.date}</td>
                  <td style={{ ...cellStyle, color: colors.growth }}>{r.weight ?? "—"}</td>
                  <td style={{ ...cellStyle, color: colors.height }}>{r.height ?? "—"}</td>
                  <td style={{ ...cellStyle, color: colors.headCircumference }}>{r.headCircumference ?? "—"}</td>
                  <td style={{ ...cellStyle, color: colors.bmi }}>{r.bmi ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
