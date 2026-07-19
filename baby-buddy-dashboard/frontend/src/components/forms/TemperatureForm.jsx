import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { logError } from "../../utils/errorLog";

export default function TemperatureForm({ childId, onDone, onClose }) {
  const units = useUnits();
  const [temp, setTemp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!temp) return;
    setSaving(true);
    setError(null);
    try {
      await api.createTemperature({
        child: childId,
        temperature: parseFloat(temp),
      });
      onDone();
    } catch (err) {
      setSaving(false);
      setError("Save failed - check your connection and try again.");
      logError("Save Temperature", err.message);
    }
  };

  return (
    <Modal title="Log Temperature" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`Temperature (${units.temp})`}>
          <FormInput
            type="number"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="36.6"
            min="30"
            max="45"
            step="0.1"
            autoFocus
          />
        </FormField>
        <FormError message={error} />
        <FormButton color={colors.temp} disabled={saving || !temp}>
          {saving ? "Saving..." : "Save Temperature"}
        </FormButton>
      </form>
    </Modal>
  );
}
