/**
 * PurchaseNudge — Smart spending nudge card for the dashboard.
 *
 * Shows the ML model's prediction of purchase probability and
 * provides actionable nudge feedback. Uses the XGBoost model from
 * the Purchase Predictor pipeline.
 *
 * Source: https://github.com/Abhinavvvkk07/pp_roots
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useFinance } from "@/lib/finance-context";

function getRiskColor(level: string): string {
  switch (level) {
    case "high":
      return Colors.light.negative;
    case "medium":
      return Colors.light.neonYellow;
    case "low":
      return Colors.light.positive;
    default:
      return Colors.light.textSecondary;
  }
}

function getRiskIcon(level: string): string {
  switch (level) {
    case "high":
      return "flame";
    case "medium":
      return "alert-circle";
    case "low":
      return "checkmark-circle";
    default:
      return "help-circle";
  }
}

function getRiskMessage(prediction: {
  probability: number;
  risk_level: string;
  should_nudge: boolean;
  in_danger_zone?: boolean;
}): string {
  if (prediction.in_danger_zone && prediction.should_nudge) {
    return "You're near a danger zone and likely to spend. Take a moment to reconsider.";
  }
  if (prediction.should_nudge) {
    return "High purchase probability detected. Is this a planned expense?";
  }
  if (prediction.risk_level === "medium") {
    return "Moderate spending risk. Stay mindful of your budget.";
  }
  return "Spending risk is low. You're on track with your budget.";
}

export function PurchaseNudge() {
  const { latestPrediction, budgets, transactions, runPrediction } = useFinance();
  const [isRunning, setIsRunning] = useState(false);

  // Auto-run a prediction based on current financial state
  useEffect(() => {
    if (transactions.length === 0 || budgets.length === 0) return;

    const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const budgetUtilization = totalLimit > 0 ? totalSpent / totalLimit : 0.5;

    // Calculate avg regret rate from transactions
    const regretTxns = transactions.filter((t) => (t.regretScore || 0) > 50);
    const merchantRegretRate = transactions.length > 0 ? regretTxns.length / transactions.length : 0;

    runPrediction(budgetUtilization, merchantRegretRate).catch(() => {});
  }, [transactions.length, budgets]);

  const handleRefresh = async () => {
    setIsRunning(true);
    try {
      const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
      const budgetUtilization = totalLimit > 0 ? totalSpent / totalLimit : 0.5;

      const regretTxns = transactions.filter((t) => (t.regretScore || 0) > 50);
      const merchantRegretRate = transactions.length > 0 ? regretTxns.length / transactions.length : 0;

      await runPrediction(budgetUtilization, merchantRegretRate);
    } finally {
      setIsRunning(false);
    }
  };

  if (!latestPrediction) return null;

  const prediction = latestPrediction;
  const riskColor = getRiskColor(prediction.risk_level);
  const riskIcon = getRiskIcon(prediction.risk_level);
  const probabilityPercent = Math.round(prediction.probability * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${riskColor}20` }]}>
          <Ionicons name={riskIcon as any} size={20} color={riskColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Smart Spending Nudge</Text>
          <Text style={styles.modelBadge}>
            {prediction.model_type === "xgboost" ? "ML Model" : "Heuristic"} Analysis
          </Text>
        </View>
        <Pressable onPress={handleRefresh} disabled={isRunning} style={styles.refreshBtn}>
          {isRunning ? (
            <ActivityIndicator size="small" color={Colors.light.tint} />
          ) : (
            <Ionicons name="refresh" size={18} color={Colors.light.textSecondary} />
          )}
        </Pressable>
      </View>

      {/* Probability Gauge */}
      <View style={styles.gaugeSection}>
        <View style={styles.gaugeRow}>
          <Text style={styles.gaugeLabel}>Purchase Probability</Text>
          <Text style={[styles.gaugeValue, { color: riskColor }]}>{probabilityPercent}%</Text>
        </View>
        <View style={styles.gaugeBarBg}>
          <View
            style={[
              styles.gaugeBarFill,
              {
                width: `${Math.min(probabilityPercent, 100)}%`,
                backgroundColor: riskColor,
              },
            ]}
          />
          {/* Threshold marker */}
          <View
            style={[
              styles.thresholdMarker,
              { left: `${prediction.threshold * 100}%` },
            ]}
          />
        </View>
        <View style={styles.gaugeLegend}>
          <Text style={styles.gaugeLegendText}>Low</Text>
          <Text style={styles.gaugeLegendThreshold}>
            Nudge threshold: {Math.round(prediction.threshold * 100)}%
          </Text>
          <Text style={styles.gaugeLegendText}>High</Text>
        </View>
      </View>

      {/* Risk Message */}
      <View style={[styles.messageBox, { borderLeftColor: riskColor }]}>
        <Text style={styles.messageText}>{getRiskMessage(prediction)}</Text>
      </View>

      {/* Risk Level Badge */}
      <View style={styles.footer}>
        <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20` }]}>
          <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
          <Text style={[styles.riskText, { color: riskColor }]}>
            {prediction.risk_level.toUpperCase()} RISK
          </Text>
        </View>
        {prediction.should_nudge && (
          <View style={styles.nudgeBadge}>
            <Ionicons name="notifications" size={12} color={Colors.light.neonYellow} />
            <Text style={styles.nudgeText}>Nudge Active</Text>
          </View>
        )}
        {prediction.in_danger_zone && (
          <View style={styles.dangerBadge}>
            <MaterialIcons name="location-on" size={12} color={Colors.light.negative} />
            <Text style={styles.dangerText}>Danger Zone</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.light.text,
  },
  modelBadge: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeSection: {
    marginBottom: 16,
  },
  gaugeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.light.textSecondary,
  },
  gaugeValue: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
  },
  gaugeBarBg: {
    height: 10,
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 5,
    overflow: "visible",
    position: "relative",
  },
  gaugeBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  thresholdMarker: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 16,
    backgroundColor: Colors.light.text,
    borderRadius: 1,
    marginLeft: -1,
  },
  gaugeLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  gaugeLegendText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.light.textTertiary,
  },
  gaugeLegendThreshold: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: Colors.light.textSecondary,
  },
  messageBox: {
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    marginBottom: 14,
  },
  messageText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.light.text,
    lineHeight: 19,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  nudgeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255, 229, 0, 0.12)",
    gap: 4,
  },
  nudgeText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.light.neonYellow,
  },
  dangerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.light.negativeLight,
    gap: 4,
  },
  dangerText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.light.negative,
  },
});

export default PurchaseNudge;
