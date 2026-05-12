
'use server';

import { diagnosePatientSymptoms } from '@/ai/flows/diagnose-patient-flow';
import type { AIDiagnosisInput, AIDiagnosisResult, AIDiagnosisOutput } from '@/types';

export async function handleAIDiagnosisAction(formData: FormData): Promise<AIDiagnosisResult> {
  const symptoms = formData.get('symptoms') as string;
  const patientContext = formData.get('patientContext') as string | undefined;

  if (!symptoms || symptoms.trim() === "") {
    return {
      success: false,
      title: 'Input Error',
      message: 'Symptoms are required and cannot be empty to get an AI diagnosis.',
      variant: 'destructive',
    };
  }

  const input: AIDiagnosisInput = { symptoms: symptoms.trim() };
  if (patientContext && patientContext.trim() !== "") {
    input.patientContext = patientContext.trim();
  }

  try {
    const result: AIDiagnosisOutput = await diagnosePatientSymptoms(input);
    if (!result || !result.suggestedDiagnosis) { // Basic check for valid-looking output
        console.error('AI Diagnosis Error: Model returned incomplete or invalid data.', result);
        return {
            success: false,
            title: 'AI Diagnosis Error',
            message: 'The AI model returned an unexpected or incomplete response. Please try again.',
            variant: 'destructive',
        };
    }
    return {
      success: true,
      data: result,
      title: 'AI Diagnosis Complete',
      message: 'The AI has provided diagnostic suggestions.',
    };
  } catch (error) {
    console.error('AI Diagnosis Action - Unhandled Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during AI diagnosis.';
    return {
      success: false,
      error: errorMessage,
      title: 'AI Diagnosis Failed',
      message: `An unexpected error occurred: ${errorMessage}. Please check the console for more details or try again later.`,
      variant: 'destructive',
    };
  }
}
