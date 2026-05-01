import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { submitCase } from "./src/services/api";

const urgencyOptions = ["normal", "emergency"];
const networkOptions = ["good", "fair", "poor", "offline"];

export default function App() {
  const [symptomsText, setSymptomsText] = useState("fever, headache");
  const [urgency, setUrgency] = useState("normal");
  const [networkQuality, setNetworkQuality] = useState("fair");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const parsedSymptoms = useMemo(
    () => symptomsText.split(",").map((s) => s.trim()).filter(Boolean),
    [symptomsText]
  );

  async function onSubmit() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await submitCase({
        patient_id: "patient-001",
        symptoms: parsedSymptoms,
        urgency,
        network_quality: networkQuality,
        device_reachable: true,
        location: "Lagos"
      });
      setResult(response);
    } catch (err) {
      setError(err.message || "Failed to submit case");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Raphael AI</Text>
        <Text style={styles.subtitle}>Network-Aware Healthcare Intake</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Symptoms (comma separated)</Text>
          <TextInput
            value={symptomsText}
            onChangeText={setSymptomsText}
            style={styles.input}
            multiline
          />

          <Text style={styles.label}>Urgency</Text>
          <View style={styles.row}>
            {urgencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setUrgency(option)}
                style={[
                  styles.pill,
                  urgency === option && styles.pillActive
                ]}
              >
                <Text style={styles.pillText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Network Quality</Text>
          <View style={styles.rowWrap}>
            {networkOptions.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setNetworkQuality(option)}
                style={[
                  styles.pill,
                  networkQuality === option && styles.pillActive
                ]}
              >
                <Text style={styles.pillText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={onSubmit}
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Submitting..." : "Submit Case"}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Decision Output</Text>
            <Text style={styles.resultText}>
              {JSON.stringify(result.decision, null, 2)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6f8fb"
  },
  container: {
    padding: 20,
    gap: 14
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#13315c"
  },
  subtitle: {
    fontSize: 16,
    color: "#355070"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    gap: 12
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1d3557"
  },
  input: {
    minHeight: 58,
    borderColor: "#d6deeb",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top"
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  rowWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  pill: {
    borderColor: "#9fb3c8",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14
  },
  pillActive: {
    backgroundColor: "#13315c",
    borderColor: "#13315c"
  },
  pillText: {
    color: "#13315c",
    fontWeight: "600"
  },
  button: {
    marginTop: 6,
    backgroundColor: "#e76f51",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  error: {
    color: "#b42318",
    marginTop: 8
  },
  resultCard: {
    backgroundColor: "#0b2545",
    borderRadius: 14,
    padding: 16
  },
  resultTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },
  resultText: {
    color: "#d0e4ff",
    fontFamily: "monospace"
  }
});
