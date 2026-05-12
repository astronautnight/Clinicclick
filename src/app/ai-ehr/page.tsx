
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Mic, FileText, Bot, BrainCircuit } from "lucide-react";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";


export default function AIEHRPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BrainCircuit className="mr-3 h-8 w-8 text-primary" />
          AI-Powered EHR
        </h1>
      </div>

       <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
        <Sparkles className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">Streamline Your Clinical Notes</AlertTitle>
        <ShadAlertDescription className="text-primary/80">
          This module uses AI to help you generate structured clinical notes and diagnoses from patient symptoms and context, starting with speech-to-note functionality.
        </ShadAlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Input */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><Mic className="mr-2 h-5 w-5"/> Speech-to-Note</CardTitle>
                <CardDescription>
                  Record your consultation notes and have the AI automatically transcribe and structure them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Click the button below to start recording. Speak clearly, describing the patient's complaint, your findings, and the proposed treatment plan.</p>
                 <Button disabled className="w-full">
                    <Mic className="mr-2 h-4 w-4"/>
                    Start Recording (Coming Soon)
                </Button>
                <div className="space-y-2">
                  <Label htmlFor="transcription">Or, paste transcription here:</Label>
                  <Textarea id="transcription" placeholder="The patient presents with a chief complaint of a sharp, throbbing pain in the lower right quadrant..." className="min-h-[150px]" />
                </div>
              </CardContent>
              <CardFooter>
                 <Button className="w-full">
                    <Sparkles className="mr-2 h-4 w-4"/>
                    Generate Structured Note
                </Button>
              </CardFooter>
            </Card>
        </div>

        {/* Right Column: Output Template */}
        <div className="lg:col-span-2">
            <Card className="shadow-2xl border-primary/20">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                             <CardTitle className="flex items-center text-xl"><FileText className="mr-3 h-6 w-6 text-primary"/> Generated Clinical Note</CardTitle>
                             <CardDescription>This is a template showing the AI-generated structured output. Review and sign-off before saving.</CardDescription>
                        </div>
                        <Bot className="h-8 w-8 text-primary/70" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="patientName">Patient Name</Label>
                            <Input id="patientName" value="Asha Patel" readOnly className="bg-muted/50"/>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="visitDate">Visit Date</Label>
                            <Input id="visitDate" value={new Date().toLocaleDateString()} readOnly className="bg-muted/50"/>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                        <Textarea id="chiefComplaint" placeholder="e.g., Severe tooth pain in lower right jaw." className="bg-muted/50 font-medium" />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="history">History of Present Illness</Label>
                        <Textarea id="history" placeholder="e.g., Pain started 4 days ago, is spontaneous, and worsens at night and with cold stimuli." className="bg-muted/50" />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="exam">Examination Findings</Label>
                        <Textarea id="exam" placeholder="e.g., Intraoral exam reveals deep carious lesion in tooth #46. Tooth is tender to percussion. No extraoral swelling observed." className="bg-muted/50" />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="diagnosis">Provisional Diagnosis</Label>
                        <Textarea id="diagnosis" placeholder="e.g., Irreversible Pulpitis with symptomatic apical periodontitis related to tooth #46." className="bg-muted/50" />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="plan">Treatment Plan</Label>
                        <Textarea id="plan" placeholder="e.g., 1. Root Canal Treatment for tooth #46. 2. Prescribe analgesics and antibiotics. 3. Follow up for permanent crown." className="bg-muted/50" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="prescriptions">Prescriptions</Label>
                        <Textarea id="prescriptions" placeholder="e.g., Tab. Amoxicillin + Clavulanic Acid 625mg, BD x 5 days." className="bg-muted/50" />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline">Discard</Button>
                    <Button>Save & Sign-off</Button>
                </CardFooter>
            </Card>
        </div>

      </div>

    </div>
  );
}
