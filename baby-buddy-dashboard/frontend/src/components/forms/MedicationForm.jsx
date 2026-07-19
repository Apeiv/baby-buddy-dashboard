import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton, FormError } from "../Modal";
import DeleteButton from "../DeleteButton";
import { colors } from "../../utils/colors";
import { logError } from "../../utils/errorLog";

const DOSAGE_UNITS = [
  { value: "", label: "Not specified" },
  { value: "mg", label: "MG" },
  { value: "ml", label: "ML" },
  { value: "tablets", label: "Tablets" },
  { value: "drops", label: "Drops" },
];

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseNextDoseHours(interval) {
  if (!interval) return "";
  const parts = String(interval).trim().split(" ");
  const days = parts.length > 1 ? parseFloat(parts[0]) || 0 : 0;
  const hms = (parts.length > 1 ? parts[1] : parts[0]).split(":").map(Number);
  const hours = days * 24 + (hms[0] || 0) + (hms[1] || 0) / 60;
  return hours ? String(hours) : "";
}

export default function MedicationForm({ childId, entry, onDone, onClose }) {
  const isEdit = !!entry;
  const [name, setName] = useState(entry?.name || "");
  const [dosage, setDosage] = useState(entry?.dosage != null ? String(entry.dosage) : "");
  const [dosageUnit, setDosageUnit] = useState(entry?.dosage_unit || "");
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const [nextDoseHours, setNextDoseHours] = useState(parseNextDoseHours(entry?.next_dose_interval));
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = { name: name.trim(), time: `${time}:00` };
      if (dosage) data.dosage = parseFloat(dosage);
      if (dosageUnit) data.dosage_unit = dosageUnit;
      if (nextDoseHours) data.next_dose_interval = `${nextDoseHours}:00:00`;
      if (notes.trim()) data.notes = notes.trim();
      if (isEdit) {
        await api.updateMedication(entry.id, data);
      } else {
        data.child = childId;
        await api.createMedication(data);
      }
      onDone();
    } catch (err) {
      setSaving(false);
      setError("Save failed - check your connection and try again.");
      logError(isEdit ? "Update Medication" : "Save Medication", err.message);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await api.deleteMedication(entry.id);
      onDone();
    } catch (err) {
      setError("Delete failed - check your connection and try again.");
      logError("Delete Medication", err.message);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Medication" : "Log Medication"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Medication">
          <FormInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Paracetamol"
            autoFocus
            required
          />
        </FormField>
        <FormField label="Dosage">
          <FormInput
            type="number"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Optional"
            min="0"
            step="0.1"
          />
        </FormField>
        <FormField label="Dosage Unit">
          <FormSelect options={DOSAGE_UNITS} value={dosageUnit} onChange={(e) => setDosageUnit(e.target.value)} />
        </FormField>
        <FormField label="Time Given">
          <FormInput
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Next Dose In (hours)">
          <FormInput
            type="number"
            value={nextDoseHours}
            onChange={(e) => setNextDoseHours(e.target.value)}
            placeholder="Optional, e.g. 8"
            min="0"
            step="0.5"
          />
        </FormField>
        <FormField label="Notes">
          <FormInput
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </FormField>
        <FormError message={error} />
        {isEdit && <DeleteButton onDelete={handleDelete} disabled={saving} />}
        <FormButton color={colors.medication} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : isEdit ? "Update Medication" : "Save Medication"}
        </FormButton>
      </form>
    </Modal>
  );
}
