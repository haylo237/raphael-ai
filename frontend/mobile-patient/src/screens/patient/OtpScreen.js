import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import Field from "../../components/shared/Field";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { spacing, typography } from "../../theme";
import { usePatientSelf } from "../../services/PatientSelfStore";

export default function OtpScreen({ navigation }) {
  const { state, verifyPhone } = usePatientSelf();
  const [code, setCode] = useState("");

  const onVerify = async () => {
    if (code.trim().length < 4) {
      Alert.alert("Invalid code", "Please enter the 4–6 digit code we sent you.");
      return;
    }
    await verifyPhone();
    navigation.reset({ index: 0, routes: [{ name: "Profile" }] });
  };

  return (
    <Screen subtitle="Step 2 of 2" title="Verify your phone">
      <Section title="One-time code">
        <Text style={typography.muted}>
          Code sent to <Text style={typography.mono}>{state.phone || "—"}</Text>
        </Text>
        <View style={{ height: spacing.sm }} />
        <Field
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="123456"
        />
        <PrimaryButton title="Verify & continue" onPress={onVerify} />
      </Section>
      <Text style={[typography.muted, { textAlign: "center" }]}>
        Demo build · any 4–6 digit code is accepted
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({});
