
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, AlertTriangle, Brain, Lightbulb } from 'lucide-react';
import { handleAIDiagnosisAction } from './actions';
import type { AIDiagnosisOutput, AIDiagnosisResult } from '@/types';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AIDiagnosisPage() {
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState('');
  const [patientContext, setPatientContext] = useState('');
  const [aiResponse, setAiResponse] = useState<AIDiagnosisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setAiResponse(null);

    const formData = new FormData(event.currentTarget);
    const result: AIDiagnosisResult = await handleAIDiagnosisAction(formData);

    toast({
      title: result.title,
      description: result.message,
      variant: result.variant || (result.success ? 'default' : 'destructive'),
    });

    if (result.success && result.data) {
      setAiResponse(result.data);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Sparkles className="mr-3 h-8 w-8 text-special1" />
          AI Diagnostic Assistant
        </h1>
      </div>

      <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <AlertTitle className="font-semibold">For Informational Purposes Only</AlertTitle>
        <ShadAlertDescription className="text-destructive/80">
          This tool provides AI-generated suggestions based on input symptoms. It is <strong>NOT</strong> a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for any medical concerns.
        </ShadAlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Get AI-Powered Suggestions</CardTitle>
          <CardDescription>
            Enter patient signs and symptoms below. You can also provide optional patient context (e.g., age, gender, brief medical history) for more tailored suggestions.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="symptoms">Signs & Symptoms *</Label>
              <Textarea
                id="symptoms"
                name="symptoms"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g., Toothache in upper right molar, sensitive to cold, swelling observed in gums..."
                required
                className="min-h-[120px]"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="patientContext">Optional Patient Context</Label>
              <Textarea
                id="patientContext"
                name="patientContext"
                value={patientContext}
                onChange={(e) => setPatientContext(e.target.value)}
                placeholder="e.g., Male, 35 years old, history of bruxism. No known allergies."
                className="min-h-[80px]"
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get AI Diagnosis
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {aiResponse && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-6 w-6 text-primary" />
              AI Analysis Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {aiResponse.suggestedDiagnosis && (
              <div>
                <h3 className="font-semibold text-lg flex items-center mb-2">
                  <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
                  Suggested Diagnosis
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{aiResponse.suggestedDiagnosis}</p>
              </div>
            )}
            {aiResponse.suggestedTreatmentPlan && (
              <div>
                <h3 className="font-semibold text-lg flex items-center mb-2">
                  <Lightbulb className="mr-2 h-5 w-5 text-green-500" />
                  Suggested Treatment Plan / Next Steps
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{aiResponse.suggestedTreatmentPlan}</p>
              </div>
            )}
            {aiResponse.confidence && (
               <div>
                <h3 className="font-semibold text-lg flex items-center mb-2">
                  Confidence Level
                </h3>
                <p className="text-muted-foreground">{aiResponse.confidence}</p>
              </div>
            )}
            {aiResponse.importantDisclaimer && (
              <Alert variant="default" className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                <AlertTitle className="font-bold">Crucial Disclaimer</AlertTitle>
                <ShadAlertDescription className="text-amber-700/90 dark:text-amber-400/90">
                  {aiResponse.importantDisclaimer}
                </ShadAlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
