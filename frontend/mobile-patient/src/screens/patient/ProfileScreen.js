import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import Field from "../../components/shared/Field";
import KeyValue from "../../components/shared/KeyValue";
import PillGroup from "../../components/shared/PillGroup";
import PrimaryButton from "../../components/shared/PrimaryButton";
import RoleHero from "../../components/shared/RoleHero";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, radius, spacing, typography } from "../../theme";
import { usePatientSelf } from "../../services/PatientSelfStore";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function ProfileScreen({ navigation }) {
  const { state, saveProfile, signOut } = usePatientSelf();
  const profile = state.profile;
  const [editing, setEditing] = useState(!profile);

  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [dob, setDob] = useState(profile?.dob || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || "");
  const [ecName, setEcName] = useState(profile?.emergencyContact?.name || "");
  const [ecPhone, setEcPhone] = useState(profile?.emergencyContact?.phone || "");
  const [ecRel, setEcRel] = useState(profile?.emergencyContact?.relation || "");
  const [allergies, setAllergies] = useState(profile?.allergies || "");
  const [chronic, setChronic] = useState(profile?.chronic || "");

  const save = async () => {
    await saveProfile({
      firstName,
      lastName,
      dob,
      gender,
      bloodGroup,
      emergencyContact: { name: ecName, phone: ecPhone, relation: ecRel },
      allergies,
      chronic,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <Screen subtitle="Profile" title={profile ? "Edit profile" : "Complete your profile"}>
        <Section title="Identity">
          <Field label="First name" value={firstName} onChangeText={setFirstName} />
          <Field label="Last name" value={lastName} onChangeText={setLastName} />
          <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
          <PillGroup label="Gender" options={["F", "M", "Other"]} value={gender} onChange={setGender} />
          <PillGroup label="Blood group" options={BLOOD_GROUPS} value={bloodGroup} onChange={setBloodGroup} />
        </Section>
        <Section title="Emergency contact">
          <Field label="Full name" value={ecName} onChangeText={setEcName} />
          <Field label="Phone" value={ecPhone} onChangeText={setEcPhone} keyboardType="phone-pad" />
          <Field label="Relation" value={ecRel} onChangeText={setEcRel} placeholder="Mother, spouse, …" />
        </Section>
        <Section title="Medical">
          <Field label="Allergies" value={allergies} onChangeText={setAllergies} multiline />
          <Field label="Chronic conditions" value={chronic} onChangeText={setChronic} multiline />
        </Section>
        <PrimaryButton title="Save profile" onPress={save} />
      </Screen>
    );
  }

  const fullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Patient";

  return (
    <Screen subtitle="My Profile" title={fullName}>
      <RoleHero
        eyebrow="My Care"
        title="Simple and reassuring"
        subtitle="Keep your emergency contact and medical summary up to date."
      />

      <View style={styles.headerRow}>
        <Badge label="Verified" variant="success" pulse />
        {profile?.bloodGroup ? <Badge label={`Blood · ${profile.bloodGroup}`} variant="info" /> : null}
      </View>

      <Section title="Identity">
        <KeyValue label="Phone" value={state.phone} mono />
        <KeyValue label="Date of birth" value={profile?.dob || "—"} />
        <KeyValue label="Gender" value={profile?.gender || "—"} />
      </Section>

      <Section title="Emergency contact" glow>
        <KeyValue label="Name" value={profile?.emergencyContact?.name || "—"} />
        <KeyValue label="Phone" value={profile?.emergencyContact?.phone || "—"} mono />
        <KeyValue label="Relation" value={profile?.emergencyContact?.relation || "—"} />
      </Section>

      <Section title="Medical background">
        <KeyValue label="Allergies" value={profile?.allergies || "None recorded"} />
        <KeyValue label="Chronic conditions" value={profile?.chronic || "None recorded"} />
      </Section>

      <View style={styles.sosWrap}>
        <PrimaryButton title="🚨  Request Emergency Help" variant="danger" onPress={() => navigation.navigate("RequestEmergency")} />
      </View>

      {state.lastEmergencyId ? (
        <PrimaryButton
          title={`View last emergency · ${state.lastEmergencyId}`}
          variant="secondary"
          onPress={() => navigation.navigate("EmergencyStatus", { emergencyId: state.lastEmergencyId })}
        />
      ) : null}

      <View style={{ height: spacing.lg }} />
      <PrimaryButton title="Edit profile" variant="ghost" onPress={() => setEditing(true)} />
      <PrimaryButton title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, flexWrap: "wrap" },
  sosWrap: { marginVertical: spacing.lg },
});
