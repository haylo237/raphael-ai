import React, { useState } from "react";
import { Alert } from "react-native";

import Field from "../../components/shared/Field";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { usePatientStore } from "../../services/PatientStore";

export default function RecordVitalsScreen({ navigation, route }) {
  const { getPatient, recordVitals } = usePatientStore();
  const patient = getPatient(route.params?.patientId);

  const [temperature, setTemperature] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [resp, setResp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");

  function onSave() {
    if (!patient) return;
    const vitals = {
      temperature,
      bloodPressure: bp,
      pulse,
      respiratoryRate: resp,
      spo2,
      weight,
      height,
      bloodSugar,
    };
    const hasAny = Object.values(vitals).some((v) => v && String(v).trim());
    if (!hasAny) {
      Alert.alert("Empty form", "Enter at least one vital sign.");
      return;
    }
    recordVitals(patient.id, vitals);
    navigation.goBack();
  }

  if (!patient) {
    return <Screen title="Patient not found" />;
  }

  return (
    <Screen
      title="Record Vitals"
      subtitle={`${patient.basic.firstName} ${patient.basic.lastName} · ${patient.id}`}
    >
      <Section title="Vital signs">
        <Field label="Temperature (°C)" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" />
        <Field label="Blood Pressure (e.g. 120/80)" value={bp} onChangeText={setBp} autoCapitalize="none" />
        <Field label="Pulse Rate (bpm)" value={pulse} onChangeText={setPulse} keyboardType="numeric" />
        <Field label="Respiratory Rate (/min)" value={resp} onChangeText={setResp} keyboardType="numeric" />
        <Field label="Oxygen Saturation (%)" value={spo2} onChangeText={setSpo2} keyboardType="numeric" />
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
        <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
        <Field label="Blood Sugar (mg/dL)" value={bloodSugar} onChangeText={setBloodSugar} keyboardType="decimal-pad" />
      </Section>
      <PrimaryButton title="Save Vitals" onPress={onSave} />
    </Screen>
  );
}
