import React, { useState } from "react";
import { Alert } from "react-native";

import Field from "../../components/shared/Field";
import PillGroup from "../../components/shared/PillGroup";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { usePatientStore } from "../../services/PatientStore";

const GENDERS = ["Female", "Male", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegisterPatientScreen({ navigation }) {
  const { createPatient } = usePatientStore();

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

  // Initial vitals
  const [temperature, setTemperature] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [resp, setResp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");

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
      initialVitals: hasAnyVital()
        ? {
            temperature,
            bloodPressure: bp,
            pulse,
            respiratoryRate: resp,
            spo2,
            weight,
            height,
            bloodSugar,
          }
        : null,
    });
    navigation.replace("PatientProfile", { patientId: id });
  }

  function hasAnyVital() {
    return [temperature, bp, pulse, resp, spo2, weight, height, bloodSugar].some((v) => v && String(v).trim());
  }

  return (
    <Screen
      title="New Patient"
      subtitle="Capture identity, contacts, medical background and initial vitals."
    >
      <Section title="Basic information">
        <Field label="First Name *" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name *" value={lastName} onChangeText={setLastName} />
        <Field label="Gender" value={gender} onChangeText={() => {}} />
        <PillGroup options={GENDERS} value={gender} onChange={setGender} />
        <Field label="Age (years)" value={age} onChangeText={setAge} keyboardType="numeric" />
        <Field label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
        <Field label="Alternative Phone" value={altPhone} onChangeText={setAltPhone} keyboardType="phone-pad" autoCapitalize="none" />
        <Field label="Address" value={address} onChangeText={setAddress} />
        <Field label="Village / Quarter" value={village} onChangeText={setVillage} />
        <Field label="City" value={city} onChangeText={setCity} />
        <Field label="Region" value={region} onChangeText={setRegion} />
        <Field label="Blood Group" value={bloodGroup} onChangeText={() => {}} />
        <PillGroup options={BLOOD_GROUPS} value={bloodGroup} onChange={setBloodGroup} />
      </Section>

      <Section title="Emergency contact">
        <Field label="Name" value={ecName} onChangeText={setEcName} />
        <Field label="Relationship" value={ecRel} onChangeText={setEcRel} />
        <Field label="Phone" value={ecPhone} onChangeText={setEcPhone} keyboardType="phone-pad" autoCapitalize="none" />
      </Section>

      <Section title="Medical background">
        <Field label="Known Allergies" value={allergies} onChangeText={setAllergies} multiline />
        <Field label="Chronic Conditions" value={chronic} onChangeText={setChronic} multiline />
        <Field label="Current Medications" value={meds} onChangeText={setMeds} multiline />
        <Field label="Past Medical History" value={pastHistory} onChangeText={setPastHistory} multiline />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      </Section>

      <Section title="Initial vitals (optional)">
        <Field label="Temperature (°C)" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" />
        <Field label="Blood Pressure (e.g. 120/80)" value={bp} onChangeText={setBp} autoCapitalize="none" />
        <Field label="Pulse Rate (bpm)" value={pulse} onChangeText={setPulse} keyboardType="numeric" />
        <Field label="Respiratory Rate (/min)" value={resp} onChangeText={setResp} keyboardType="numeric" />
        <Field label="Oxygen Saturation (%)" value={spo2} onChangeText={setSpo2} keyboardType="numeric" />
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
        <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
        <Field label="Blood Sugar (mg/dL)" value={bloodSugar} onChangeText={setBloodSugar} keyboardType="decimal-pad" />
      </Section>

      <PrimaryButton title="Save Patient" onPress={onSubmit} />
    </Screen>
  );
}
