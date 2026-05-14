import React, { useState } from "react";
import { Alert } from "react-native";

import Field from "../../components/shared/Field";
import PillGroup from "../../components/shared/PillGroup";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { decideCase } from "../../services/api";
import { usePatientStore } from "../../services/PatientStore";

const EMERGENCY_TYPES = ["Cardiac", "Trauma", "Respiratory", "Obstetric", "Neurological", "Other"];
const SEVERITIES = ["Mild", "Moderate", "Severe", "Critical"];
const NETWORK_QUALITIES = ["good", "fair", "poor", "offline"];

export default function TriggerEmergencyScreen({ navigation, route }) {
  const { getPatient, recordEmergency } = usePatientStore();
  const patient = getPatient(route.params?.patientId);

  const [type, setType] = useState("Cardiac");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("Severe");
  const [location, setLocation] = useState(patient?.basic?.city || patient?.basic?.region || "");
  const [networkQuality, setNetworkQuality] = useState("fair");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!patient) {
    return <Screen title="Patient not found" />;
  }

  async function onTrigger() {
    if (!type) {
      Alert.alert("Missing info", "Pick an emergency type.");
      return;
    }
    setSubmitting(true);

    const symptomList = symptoms.split(",").map((s) => s.trim()).filter(Boolean);
    const urgency = severity === "Critical" || severity === "Severe" ? "EMERGENCY" : "HIGH";

    const decision = await decideCase({
      patient_id: patient.id,
      symptoms: symptomList.length ? symptomList : [type],
      urgency,
      network_quality: networkQuality,
      device_reachable: true,
      location: location || "unknown",
    });

    const emergencyRecord = {
      type,
      symptoms: symptomList,
      severity,
      location,
      notes,
      networkQuality,
      is_emergency: Boolean(decision?.is_emergency),
      decision: decision?.decision || null,
      assigned_hospital: decision?.assigned_hospital || null,
      timeline: decision?.timeline || [],
      explanation: decision?.explanation || [],
      pulse_response: decision,
    };
    recordEmergency(patient.id, emergencyRecord);
    setSubmitting(false);

    navigation.replace("EmergencyStatus", {
      patientId: patient.id,
      decision,
      emergencyMeta: { type, severity, location, notes },
    });
  }

  return (
    <Screen
      title="Create Emergency Alert"
      subtitle={`${patient.basic.firstName} ${patient.basic.lastName} · ${patient.id}`}
    >
      <Section title="Emergency type">
        <PillGroup options={EMERGENCY_TYPES} value={type} onChange={setType} />
      </Section>

      <Section title="Symptoms (comma separated)">
        <Field value={symptoms} onChangeText={setSymptoms} placeholder="chest pain, shortness of breath" multiline />
      </Section>

      <Section title="Severity">
        <PillGroup options={SEVERITIES} value={severity} onChange={setSeverity} />
      </Section>

      <Section title="Current location">
        <Field label="Place / village / city" value={location} onChangeText={setLocation} placeholder="e.g. Yaoundé" />
      </Section>

      <Section title="Network quality (observed)">
        <PillGroup options={NETWORK_QUALITIES} value={networkQuality} onChange={setNetworkQuality} />
      </Section>

      <Section title="Additional notes">
        <Field value={notes} onChangeText={setNotes} multiline placeholder="Anything else the responding team should know" />
      </Section>

      <PrimaryButton
        title={submitting ? "Triggering…" : "Trigger Emergency Alert"}
        variant="danger"
        loading={submitting}
        onPress={onTrigger}
      />
    </Screen>
  );
}
