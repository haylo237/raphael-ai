import React, { useState } from "react";
import { Alert } from "react-native";

import Field from "../../components/shared/Field";
import PillGroup from "../../components/shared/PillGroup";
import PrimaryButton from "../../components/shared/PrimaryButton";
import RoleHero from "../../components/shared/RoleHero";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { usePatientStore } from "../../services/PatientStore";

const GENDERS = ["Female", "Male", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STEPS = ["Basic Info", "Medical Info", "Emergency Contact"];

export default function RegisterPatientScreen({ navigation }) {
  const { createPatient } = usePatientStore();
  const [step, setStep] = useState(0);

  // Basic
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Female");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [address, setAddress] = useState("");
  const [village, setVillage] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");

  // Emergency contact
  const [ecName, setEcName] = useState("");
  const [ecRel, setEcRel] = useState("");
  const [ecPhone, setEcPhone] = useState("");

  // Medical background
  const [allergies, setAllergies] = useState("");
  const [chronic, setChronic] = useState("");
  const [meds, setMeds] = useState("");
  const [pastHistory, setPastHistory] = useState("");
  const [notes, setNotes] = useState("");

  function onSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing info", "Please provide first and last name.");
      return;
    }
    const id = createPatient({
      basic: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        age: age ? Number(age) : null,
        phone: phone.trim(),
        altPhone: altPhone.trim(),
        address: address.trim(),
        village: village.trim(),
        city: city.trim(),
        region: region.trim(),
        bloodGroup,
      },
      emergencyContact: {
        name: ecName.trim(),
        relationship: ecRel.trim(),
        phone: ecPhone.trim(),
      },
      medical: {
        allergies: allergies.trim(),
        chronic: chronic.trim(),
        medications: meds.trim(),
        pastHistory: pastHistory.trim(),
        notes: notes.trim(),
      },
      initialVitals: null,
    });
    navigation.replace("PatientProfile", { patientId: id });
  }

  const canContinue =
    step === 0
      ? Boolean(firstName.trim() && lastName.trim() && phone.trim())
      : step === 1
      ? true
      : Boolean(ecName.trim() && ecPhone.trim());

  return (
    <Screen
      title="New Patient"
      subtitle="Step intake for fast nurse registration."
    >
      <RoleHero
        eyebrow="Patient Intake"
        title={`${step + 1}/${STEPS.length} ${STEPS[step]}`}
        subtitle="Small, focused forms reduce nurse data-entry friction."
      />

      {step === 0 && (
        <Section title="Step 1 — Basic info">
          <Field label="First Name *" value={firstName} onChangeText={setFirstName} />
          <Field label="Last Name *" value={lastName} onChangeText={setLastName} />
          <PillGroup options={GENDERS} value={gender} onChange={setGender} />
          <Field label="Age (years)" value={age} onChangeText={setAge} keyboardType="numeric" />
          <Field label="Phone Number *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Alternative Phone" value={altPhone} onChangeText={setAltPhone} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Address" value={address} onChangeText={setAddress} />
          <Field label="Village / Quarter" value={village} onChangeText={setVillage} />
          <Field label="City" value={city} onChangeText={setCity} />
          <Field label="Region" value={region} onChangeText={setRegion} />
        </Section>
      )}

      {step === 1 && (
        <Section title="Step 2 — Medical info">
          <PillGroup options={BLOOD_GROUPS} value={bloodGroup} onChange={setBloodGroup} />
          <Field label="Known Allergies" value={allergies} onChangeText={setAllergies} multiline />
          <Field label="Chronic Conditions" value={chronic} onChangeText={setChronic} multiline />
          <Field label="Current Medications" value={meds} onChangeText={setMeds} multiline />
          <Field label="Past Medical History" value={pastHistory} onChangeText={setPastHistory} multiline />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        </Section>
      )}

      {step === 2 && (
        <Section title="Step 3 — Emergency contact">
          <Field label="Contact Name *" value={ecName} onChangeText={setEcName} />
          <Field label="Relationship" value={ecRel} onChangeText={setEcRel} />
          <Field label="Contact Phone *" value={ecPhone} onChangeText={setEcPhone} keyboardType="phone-pad" autoCapitalize="none" />
        </Section>
      )}

      {step > 0 ? <PrimaryButton title="Back" variant="secondary" onPress={() => setStep(step - 1)} /> : null}
      {step < STEPS.length - 1 ? (
        <PrimaryButton title="Continue" disabled={!canContinue} onPress={() => canContinue && setStep(step + 1)} />
      ) : (
        <PrimaryButton title="Save Patient" disabled={!canContinue} onPress={onSubmit} />
      )}
    </Screen>
  );
}
