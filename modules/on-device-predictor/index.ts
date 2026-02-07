import { requireNativeModule } from 'expo-modules-core';

export interface PredictionResult {
  probability: number;
  shouldNudge: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'error';
  threshold: number;
  modelType: 'coreml';
  error?: string;
}

export interface PredictionInput {
  distanceToMerchant: number;
  hourOfDay: number;
  isWeekend: number;
  budgetUtilization: number;
  merchantRegretRate: number;
  dwellTime: number;
}

const OnDevicePredictor = requireNativeModule('OnDevicePredictor');

export async function predict(input: PredictionInput): Promise<PredictionResult> {
  return OnDevicePredictor.predict(
    input.distanceToMerchant,
    input.hourOfDay,
    input.isWeekend,
    input.budgetUtilization,
    input.merchantRegretRate,
    input.dwellTime
  );
}

export function isModelLoaded(): boolean {
  return OnDevicePredictor.isModelLoaded();
}

export default {
  predict,
  isModelLoaded,
};
