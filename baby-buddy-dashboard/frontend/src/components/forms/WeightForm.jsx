import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError } from "../Modal";
import DeleteButton from "../DeleteButton";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { logError } from "../../utils/errorLog";

function toLocalDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function WeightForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const isEdit = !!entry;
  const [weight, setWeight] = useState(entry?.weight ? String(entry.weight) : "");
  const [date, setDate] = useState(entry?.date ? toLocalDate(entry.date) : toLocalDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weight) return;
    setSaving(true);
    setError(null);
    try {
      const data = {
        weight: parseFloat(weight),
        date,
      };
      if (isEdit) {
        await api.updateWeight(entry.id, data);
      } else {
        data.child = childId;
        await api.createWeight(data);
      }
      onDone();
    } catch (err) {
      setSaving(false);
      setError("Save failed - check your connection and try again.");
      logError(isEdit ? "Update Weight" : "Save Weight", err.message);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await api.deleteWeight(entry.id);
      onDone();
    } catch (err) {
      setError("Delete failed - check your connection and try again.");
      logError("Delete Weight", err.message);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Weight" : "Log Weight"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`Weight (${units.weight})`}>
          <FormInput
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="5.0"
            min="0"
            max="30"
            step="0.01"
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
        {isEdit && <DeleteButton onDelete={handleDelete} disabled={saving} />}
        <FormButton color={colors.growth} disabled={saving || !weight}>
          {saving ? "Saving..." : isEdit ? "Update Weight" : "Save Weight"}
        </FormButton>
      </form>
    </Modal>
  );
}
