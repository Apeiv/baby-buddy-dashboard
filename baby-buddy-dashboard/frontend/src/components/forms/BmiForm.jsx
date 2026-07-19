import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError } from "../Modal";
import { colors } from "../../utils/colors";
import { logError } from "../../utils/errorLog";

function toLocalDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function BmiForm({ childId, entry, onDone, onClose }) {
  const isEdit = !!entry;
  const [bmi, setBmi] = useState(entry?.bmi ? String(entry.bmi) : "");
  const [date, setDate] = useState(entry?.date ? toLocalDate(entry.date) : toLocalDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bmi) return;
    setSaving(true);
    setError(null);
    try {
      const data = {
        bmi: parseFloat(bmi),
        date,
      };
      if (isEdit) {
        await api.updateBmi(entry.id, data);
      } else {
        data.child = childId;
        await api.createBmi(data);
      }
      onDone();
    } catch (err) {
      setSaving(false);
      setError("Save failed - check your connection and try again.");
      logError(isEdit ? "Update BMI" : "Save BMI", err.message);
    }
  };

  return (
    <Modal title={isEdit ? "Edit BMI" : "Log BMI"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="BMI">
          <FormInput
            type="number"
            value={bmi}
            onChange={(e) => setBmi(e.target.value)}
            placeholder="16.5"
            min="0"
            max="50"
            step="0.1"
            autoFocus
            required
          />
        </FormField>
        <FormField label="Date">
          <FormInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </FormField>
        <FormError message={error} />
        <FormButton color={colors.bmi} disabled={saving || !bmi}>
          {saving ? "Saving..." : isEdit ? "Update BMI" : "Save BMI"}
        </FormButton>
      </form>
    </Modal>
  );
}
