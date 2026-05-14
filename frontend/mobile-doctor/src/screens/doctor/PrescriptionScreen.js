import React, { useState } from "react";
import { Alert, StyleSheet } from "react-native";

import Field from "../../components/shared/Field";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { addPrescription, createConsultation } from "../../services/api";

export default function PrescriptionScreen({ route, navigation }) {
  const { consultationId, emergencyId } = route.params || {};
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (!medication.trim()) {
      Alert.alert("Missing field", "Medication is required.");
      return;
    }
    setBusy(true);
    let targetId = consultationId;
    if (!targetId && emergencyId) {
      const created = await createConsultation({ emergency_id: emergencyId });
      targetId = created?.data?.id;
    }
    if (targetId) {
      await addPrescription(targetId, { medication, dosage, duration, instructions });
    }
    setBusy(false);
    navigation.goBack();
  };

  return (
    <Screen subtitle="Prescription" title="New medication">
      <Section title="Medication" glow>
        <Field label="Medication" value={medication} onChangeText={setMedication} placeholder="e.g. Amoxicillin 500mg" />
        <Field label="Dosage" value={dosage} onChangeText={setDosage} placeholder="1 tablet, 3× daily" />
        <Field label="Duration" value={duration} onChangeText={setDuration} placeholder="7 days" />
        <Field label="Instructions" value={instructions} onChangeText={setInstructions} multiline placeholder="Take after meals" />
        <PrimaryButton title={busy ? "Saving…" : "Save prescription"} onPress={onSave} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({});
