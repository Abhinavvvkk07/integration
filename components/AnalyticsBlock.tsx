import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from "react-native-gifted-charts";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinance } from '@/lib/finance-context';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function AnalyticsBlock() {
    const { categorySpending, topRegretTransactions, behavioralSummary } = useFinance();

    if (categorySpending.length === 0) return null;

    // Prepare data for Pie Chart
    // Limit to top 5 for visual clarity, aggregate others
    const topCategories = categorySpending.slice(0, 5);
    const otherValue = categorySpending.slice(5).reduce((sum, item) => sum + item.value, 0);

    const pieData = topCategories.map((c) => ({
        value: c.value,
        color: c.color,
        text: `${Math.round(c.value)}`, // Show value on slice if large enough? 
        // specific frontend library props
        shiftTextX: 0,
        shiftTextY: 0,
    }));

    if (otherValue > 0) {
        pieData.push({ value: otherValue, color: '#bdc3c7', text: '', shiftTextX: 0, shiftTextY: 0 });
    }

    // Render Legend
    const renderLegend = () => {
        return (
            <View style={styles.legendContainer}>
                {topCategories.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                            {item.name} ({Math.round(item.value)})
                        </Text>
                    </View>
                ))}
                {otherValue > 0 && (
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#bdc3c7' }]} />
                        <Text style={styles.legendText}>Other ({Math.round(otherValue)})</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* 1. Category Spending Pie Chart */}
            <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Spending Breakdown</Text>
            </View>

            <BlurView intensity={30} tint="dark" style={styles.card}>
                <View style={styles.chartRow}>
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={pieData}
                            donut
                            radius={70}
                            innerRadius={45}
                            innerCircleColor="#1E1E1E" // Match card bg somewhat
                            centerLabelComponent={() => (
                                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                        ${pieData.reduce((s, i) => s + i.value, 0).toLocaleString()}
                                    </Text>
                                    <Text style={{ color: '#aaa', fontSize: 10 }}>Total</Text>
                                </View>
                            )}
                        />
                    </View>
                    {renderLegend()}
                </View>
            </BlurView>

            {/* 2. Regret Insights */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#FF6B6B" />
                <Text style={styles.sectionTitle}>Predicted Regret Insights</Text>
            </View>

            <BlurView intensity={30} tint="dark" style={styles.card}>
                {/* Top 3 Regret Transactions (Specific) */}
                {topRegretTransactions.length > 0 ? (
                    topRegretTransactions.map((t) => (
                        <View key={t.transaction_id} style={styles.regretRow}>
                            <View style={styles.regretInfo}>
                                <Text style={styles.regretCategory}>{t.name || t.merchant_name || "Transaction"}</Text>
                                <Text style={styles.regretCount}>{new Date(t.date).toLocaleDateString()} • ${t.amount.toFixed(2)}</Text>
                                {t.regretReason && (
                                    <Text style={styles.regretReason} numberOfLines={1}>{t.regretReason}</Text>
                                )}
                            </View>
                            <View style={styles.scoreBadge}>
                                <Text style={styles.scoreText}>{t.regretScore}</Text>
                                <Text style={styles.scoreLabel}>Score</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No high regret transactions detected yet.</Text>
                )}

                {/* Behavioral Summary */}
                {behavioralSummary && (
                    <View style={styles.summaryBox}>
                        <LinearGradient
                            colors={['rgba(50,50,50,0.6)', 'rgba(30,30,30,0.6)']}
                            style={styles.summaryGradient}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="sparkles" size={16} color="#FFD700" />
                                <Text style={styles.summaryTitle}>AI Insight</Text>
                            </View>
                            <Text style={styles.summaryText}>{behavioralSummary}</Text>
                        </LinearGradient>
                    </View>
                )}
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 16,
        backgroundColor: 'rgba(30, 30, 30, 0.6)',
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendContainer: {
        flex: 1,
        marginLeft: 20,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    legendText: {
        color: '#eee',
        fontSize: 12,
        flex: 1,
    },

    // Regret Styles
    regretRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    regretInfo: {
        flex: 1,
    },
    regretCategory: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    regretCount: {
        color: '#aaa',
        fontSize: 12,
        marginTop: 2,
    },
    regretReason: {
        color: '#FF6B6B',
        fontSize: 11,
        fontStyle: 'italic',
        marginTop: 2,
        opacity: 0.9,
    },
    scoreBadge: {
        backgroundColor: 'rgba(255, 107, 107, 0.2)', // Red tint
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 50,
    },
    scoreText: {
        color: '#FF6B6B',
        fontWeight: 'bold',
        fontSize: 16,
    },
    scoreLabel: {
        color: '#FF6B6B',
        fontSize: 8,
        opacity: 0.8,
    },
    emptyText: {
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },

    // Summary Styles
    summaryBox: {
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    summaryGradient: {
        padding: 12,
    },
    summaryTitle: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    summaryText: {
        color: '#ddd',
        fontSize: 14,
        lineHeight: 20,
    },
});
