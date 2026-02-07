import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import Colors from "@/constants/colors";
import { useFinance } from "@/lib/finance-context";
import { apiRequest } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type QuestionType = "choice" | "slider" | "multi-choice";

interface Question {
    id: number;
    type: QuestionType;
    category: "Finances" | "Behavioral" | "Emotional" | "Goals";
    text: string;
    reason?: string;
    options?: string[];
    minLabel?: string;
    maxLabel?: string;
}

const QUESTIONS: Question[] = [
    // Finances
    {
        id: 1,
        type: "choice",
        category: "Finances",
        text: "Which range best reflects your monthly spending capacity?",
        options: ["Under $2,000", "$2,000 - $5,000", "$5,000 - $10,000", "Over $10,000"],
    },
    {
        id: 2,
        type: "slider",
        category: "Finances",
        text: "How much financial flexibility do you feel you have month to month?",
        minLabel: "Very Tight",
        maxLabel: "Examples: Rent, Utilities, Grocery vs Income",
    },
    // Behavioral
    {
        id: 3,
        type: "choice",
        category: "Behavioral",
        text: "Which category tends to drift higher than you expect?",
        options: ["Food", "Shopping", "Nightlife", "Subscriptions", "Travel", "Other"],
    },
    {
        id: 4,
        type: "choice",
        category: "Behavioral",
        text: "Spending tends to get harder to control during…",
        options: ["Late night", "Weekends", "Around Payday", "Social outings"],
    },
    {
        id: 5,
        type: "choice",
        category: "Behavioral",
        text: "How much thought do you usually put into non-essential purchases?",
        options: [
            "Very little — mostly spontaneous",
            "Some thought",
            "Balanced",
            "A lot of thought",
            "A great deal — I often overthink",
        ],
    },
    // Emotional
    {
        id: 6,
        type: "slider",
        category: "Emotional",
        text: "How busy or overwhelming do your days usually feel?",
        minLabel: "Very Manageable",
        maxLabel: "Very Overwhelming",
    },
    {
        id: 7,
        type: "choice",
        category: "Emotional",
        text: "Which situations do you most often wish you’d spent a little less?",
        options: [
            "After a stressful day",
            "When I’m bored",
            "During social situations",
            "During celebrations",
            "When I’m craving something",
        ],
    },
    // Goals
    {
        id: 8,
        type: "choice",
        category: "Goals",
        text: "What are you mainly trying to make progress on financially right now?",
        options: [
            "Covering near-term essentials",
            "Building an emergency fund",
            "Paying down debt",
            "Saving for a major purchase",
            "Investing for the future",
            "Long-term financial independence",
        ],
    },
    {
        id: 9,
        type: "multi-choice",
        category: "Goals",
        text: "Which of these currently needs to be protected first each month?",
        options: [
            "Rent or housing costs",
            "Utilities / phone / internet",
            "Groceries or daily needs",
            "Debt payments",
            "None of these",
        ],
    },
    {
        id: 10,
        type: "choice",
        category: "Goals",
        text: "Which of these most often makes it hard to move money toward your goals?",
        options: [
            "Fixed expenses",
            "Debt payments",
            "Day-to-day spending",
            "Unexpected costs",
            "Nothing in particular",
        ],
    },
    {
        id: 11,
        type: "choice",
        category: "Goals",
        text: "We can help you reach this goal faster by being stricter about spending. How strict should we be?",
        options: [
            "Very strict — reaching goal fast matters most",
            "Balanced — progress matters, but so does flexibility",
            "Relaxed — I don’t mind slower progress",
        ],
    },
];

export default function OnboardingSurveyScreen() {
    const insets = useSafeAreaInsets();
    const { completeSurvey, getFinancialContext, isSurveyCompleted } = useFinance();
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // If already completed, shouldn't really remain here, but for safety:
    React.useEffect(() => {
        if (isSurveyCompleted) {
            router.replace("/(tabs)");
        }
    }, [isSurveyCompleted]);

    const handleSelect = (questionId: number, option: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: option }));
    };

    const handleMultiSelect = (questionId: number, option: string) => {
        setAnswers((prev) => {
            const current = (prev[questionId] as string[]) || [];
            if (current.includes(option)) {
                return { ...prev, [questionId]: current.filter((c) => c !== option) };
            }
            return { ...prev, [questionId]: [...current, option] };
        });
    };

    const handleSlider = (questionId: number, value: number) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const nextStep = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            submitSurvey();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => {
        const q = QUESTIONS[currentStep];
        if (q.type === 'multi-choice') {
            return (answers[q.id] as string[] || []).length > 0;
        }
        return answers[q.id] !== undefined;
    }

    const submitSurvey = async () => {
        setIsSubmitting(true);
        try {
            const financialContext = getFinancialContext();

            const payload = {
                answers,
                financialContext
            };

            const res = await apiRequest("POST", "/api/advisor/survey-analysis", payload);
            const analysis = await res.json();

            await completeSurvey(analysis);
            router.replace("/(tabs)");
        } catch (error) {
            console.error("Survey submission failed:", error);
            Alert.alert("Error", "Failed to submit survey. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentQ = QUESTIONS[currentStep];
    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.progressBarBg}>
                    <LinearGradient
                        colors={[Colors.light.tint, Colors.light.gradient2]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${progress}%` }]}
                    />
                </View>
                <Text style={styles.progressText}>
                    Question {currentStep + 1} of {QUESTIONS.length}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.category}>{currentQ.category}</Text>
                <Text style={styles.questionText}>{currentQ.text}</Text>

                {currentQ.type === "choice" && currentQ.options?.map((option) => (
                    <Pressable
                        key={option}
                        style={[
                            styles.optionButton,
                            answers[currentQ.id] === option && styles.optionSelected,
                        ]}
                        onPress={() => handleSelect(currentQ.id, option)}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                answers[currentQ.id] === option && styles.optionTextSelected,
                            ]}
                        >
                            {option}
                        </Text>
                        {answers[currentQ.id] === option && (
                            <Ionicons name="checkmark-circle" size={24} color={Colors.light.background} />
                        )}
                    </Pressable>
                ))}

                {currentQ.type === "multi-choice" && currentQ.options?.map((option) => {
                    const isSelected = (answers[currentQ.id] as string[] || []).includes(option);
                    return (
                        <Pressable
                            key={option}
                            style={[
                                styles.optionButton,
                                isSelected && styles.optionSelected,
                            ]}
                            onPress={() => handleMultiSelect(currentQ.id, option)}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    isSelected && styles.optionTextSelected,
                                ]}
                            >
                                {option}
                            </Text>
                            {isSelected && (
                                <Ionicons name="checkbox" size={24} color={Colors.light.background} />
                            )}
                        </Pressable>
                    );
                })}

                {currentQ.type === "slider" && (
                    <View style={styles.sliderContainer}>
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabel}>{currentQ.minLabel || "Low"}</Text>
                            <Text style={styles.sliderLabel}>{currentQ.maxLabel || "High"}</Text>
                        </View>
                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={answers[currentQ.id] ?? 50}
                            onSlidingComplete={(val) => handleSlider(currentQ.id, val)}
                            minimumTrackTintColor={Colors.light.tint}
                            maximumTrackTintColor={Colors.light.border}
                            thumbTintColor={Colors.light.tint}
                        />
                        <Text style={styles.sliderValueText}>{Math.round(answers[currentQ.id] ?? 50)}%</Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.footerButtons}>
                    <Pressable
                        style={[styles.navButton, styles.backButton, currentStep === 0 && { opacity: 0.3 }]}
                        onPress={prevStep}
                        disabled={currentStep === 0}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.navButton, styles.nextButton, (!canProceed() || isSubmitting) && { opacity: 0.5 }]}
                        onPress={nextStep}
                        disabled={!canProceed() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={Colors.light.background} />
                        ) : (
                            <Text style={styles.nextButtonText}>
                                {currentStep === QUESTIONS.length - 1 ? "Finish" : "Next"}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Colors.light.border,
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 13,
        fontFamily: "DMSans_500Medium",
        color: Colors.light.textTertiary,
        textAlign: "right",
    },
    content: {
        padding: 24,
        paddingBottom: 120,
    },
    category: {
        fontSize: 14,
        fontFamily: "DMSans_700Bold",
        color: Colors.light.tint,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
    },
    questionText: {
        fontSize: 24,
        fontFamily: "DMSans_700Bold",
        color: Colors.light.text,
        marginBottom: 32,
        lineHeight: 32,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        backgroundColor: Colors.light.surface,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 16,
        marginBottom: 12,
    },
    optionSelected: {
        backgroundColor: Colors.light.tint,
        borderColor: Colors.light.tint,
    },
    optionText: {
        fontSize: 16,
        fontFamily: "DMSans_500Medium",
        color: Colors.light.text,
        flex: 1,
    },
    optionTextSelected: {
        color: Colors.light.background,
        fontWeight: "600",
    },
    sliderContainer: {
        gap: 20,
        marginTop: 20,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sliderLabel: {
        fontSize: 14,
        fontFamily: "DMSans_500Medium",
        color: Colors.light.textSecondary,
    },
    sliderValueText: {
        fontSize: 32,
        fontFamily: "DMSans_700Bold",
        color: Colors.light.tint,
        textAlign: 'center',
        marginTop: 10,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.light.background,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    footerButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    navButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        backgroundColor: Colors.light.surface,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    backButtonText: {
        fontSize: 16,
        fontFamily: "DMSans_600SemiBold",
        color: Colors.light.text,
    },
    nextButton: {
        backgroundColor: Colors.light.tint,
        flex: 2,
    },
    nextButtonText: {
        fontSize: 16,
        fontFamily: "DMSans_600SemiBold",
        color: Colors.light.background,
    },
});
