'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { MarkedTooth } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Inline SVG component matching the provided tooth logo
const ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 256 256"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="
        M128 20
        C60 20 36 56 36 96
        C36 124 52 144 60 172
        C68 200 80 236 104 236
        C120 236 118 176 128 176
        C138 176 136 236 152 236
        C176 236 188 200 196 172
        C204 144 220 124 220 96
        C220 56 196 20 128 20
        Z
      "
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
    />
    <path
      d="
        M128 44
        C78 44 64 72 64 100
        C64 122 76 138 82 160
        C88 182 96 210 112 210
        C122 210 120 176 128 176
        C136 176 134 210 144 210
        C160 210 168 182 174 160
        C180 138 192 122 192 100
        C192 72 178 44 128 44
        Z
      "
      stroke="currentColor"
      strokeWidth="6"
      strokeLinejoin="round"
    />
  </svg>
);




const STATUSES = ["healthy", "caries", "filling", "rct", "crown", "missing", "implant"];
const STATUS_COLORS: Record<string, string> = {
  healthy: "text-gray-500 dark:text-gray-400",
  caries: "text-red-500",
  filling: "text-blue-500",
  rct: "text-yellow-500",
  crown: "text-gray-700 dark:text-gray-300",
  missing: "text-gray-400 dark:text-gray-600",
  implant: "text-purple-500",
};

const STATUS_BG_COLORS: Record<string, string> = {
  healthy: "bg-gray-400",
  caries: "bg-red-500",
  filling: "bg-blue-500",
  rct: "bg-yellow-500",
  crown: "bg-gray-700",
  missing: "bg-gray-400",
  implant: "bg-purple-500",
};


interface ToothProps {
  toothNumber: string;
  status: string;
  isMissing?: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  className?: string;
}

function Tooth({ toothNumber, status, isMissing, onClick, onDoubleClick, className }: ToothProps) {
  const statusClass = STATUS_COLORS[status] || "text-slate-200 dark:text-slate-700";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-0.5 sm:p-1 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
        className
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <ToothIcon className={cn("h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-colors", statusClass, isMissing && "opacity-50")} />
      <span className={cn("text-[9px] sm:text-[10px] md:text-xs mt-0.5 sm:mt-1 w-4 sm:w-5 md:w-6 text-center", isMissing ? 'line-through text-muted-foreground' : 'text-foreground')}>
        {toothNumber}
      </span>
    </div>
  );
}

interface DentalChartProps {
  markedTeeth: MarkedTooth[];
  onTeethChange: (teeth: MarkedTooth[]) => void;
  stagedObservations: string[];
  onObservationsChange: (observations: string[]) => void;
}

export function DentalChart({ markedTeeth, onTeethChange, stagedObservations, onObservationsChange }: DentalChartProps) {
  const { toast } = useToast();
  const [modalState, setModalState] = React.useState<{ open: boolean; toothNumber: string | null }>({ open: false, toothNumber: null });
  const [toothNotes, setToothNotes] = React.useState('');
  const [activeDentition, setActiveDentition] = React.useState('permanent');
  
  const [isObservationsModalOpen, setIsObservationsModalOpen] = React.useState(false);
  const [tempObservations, setTempObservations] = React.useState<string[]>([]);
  const [newObservation, setNewObservation] = React.useState('');

  const handleToothClick = (toothNumber: string) => {
    const currentMarking = markedTeeth.find(t => t.number === toothNumber);
    const currentStatus = currentMarking?.status || 'healthy';
    const currentIndex = STATUSES.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % STATUSES.length;
    const nextStatus = STATUSES[nextIndex];

    let newMarkedTeeth: MarkedTooth[];
    if (currentMarking) {
      if (nextStatus === 'healthy' && !currentMarking.notes) {
          newMarkedTeeth = markedTeeth.filter(t => t.number !== toothNumber);
      } else {
          newMarkedTeeth = markedTeeth.map(t =>
              t.number === toothNumber ? { ...t, status: nextStatus, notes: t.notes || '' } : t
          );
      }
    } else {
      if (nextStatus !== 'healthy') {
          const newMarking: MarkedTooth = {
              number: toothNumber,
              status: nextStatus,
              notes: '',
          };
          newMarkedTeeth = [...markedTeeth, newMarking];
      } else {
          return;
      }
    }
    
    onTeethChange(newMarkedTeeth);
    
    toast({
      title: `Tooth #${toothNumber}`,
      description: `Set to: ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`,
    });
  };
  
  const handleToothDoubleClick = (toothNumber: string) => {
      const currentMarking = markedTeeth.find(t => t.number === toothNumber);
      setToothNotes(currentMarking?.notes || '');
      setModalState({ open: true, toothNumber });
  };

  const handleSaveToothDetails = () => {
    if (!modalState.toothNumber) return;

    const toothNumber = modalState.toothNumber;
    const existingMarking = markedTeeth.find(t => t.number === toothNumber);
    
    let newMarkedTeeth: MarkedTooth[];

    if (!toothNotes.trim() && existingMarking?.status === 'healthy') {
        newMarkedTeeth = markedTeeth.filter(t => t.number !== toothNumber);
    } else if (existingMarking) {
        newMarkedTeeth = markedTeeth.map(t =>
            t.number === toothNumber ? { ...t, notes: toothNotes } : t
        );
    } else {
        newMarkedTeeth = [...markedTeeth, { number: toothNumber, status: 'healthy', notes: toothNotes }];
    }
    
    onTeethChange(newMarkedTeeth);
    
    toast({ title: `Notes for Tooth #${toothNumber} saved.`});
    setModalState({ open: false, toothNumber: null });
  };

  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // Adding deciduous teeth numbers
  const pediatricUpperRight = [55, 54, 53, 52, 51];
  const pediatricUpperLeft = [61, 62, 63, 64, 65];
  const pediatricLowerRight = [85, 84, 83, 82, 81];
  const pediatricLowerLeft = [71, 72, 73, 74, 75];

  const renderToothRow = (numbers: number[]) => {
    return numbers.map(num => {
      const toothNumber = String(num);
      const markedTooth = markedTeeth.find(t => t.number === toothNumber);
      return (
        <Tooth
          key={toothNumber}
          toothNumber={toothNumber}
          status={markedTooth?.status || 'healthy'}
          onClick={() => handleToothClick(toothNumber)}
          onDoubleClick={() => handleToothDoubleClick(toothNumber)}
        />
      );
    });
  };
  
  const handleOpenObservationsModal = () => {
    setTempObservations(stagedObservations);
    setIsObservationsModalOpen(true);
  };
  
  const handleSaveObservations = () => {
    onObservationsChange(tempObservations);
    setIsObservationsModalOpen(false);
    toast({ title: "Observations Saved" });
  };

  const addObservation = () => {
      if (newObservation.trim()) {
          setTempObservations([...tempObservations, newObservation.trim()]);
          setNewObservation('');
      }
  };

  const removeObservation = (indexToRemove: number) => {
      setTempObservations(tempObservations.filter((_, index) => index !== indexToRemove));
  };


  return (
    <Card className="w-full max-w-full overflow-hidden">
      <div className="w-0 min-w-full overflow-x-auto">
        <div style={{ minWidth: '480px' }}>
          <CardHeader className="items-center">
            <Tabs value={activeDentition} onValueChange={setActiveDentition} className="w-auto">
              <TabsList>
                <TabsTrigger value="permanent">Permanent Dentition</TabsTrigger>
                <TabsTrigger value="pediatric">Pediatric (Deciduous)</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {activeDentition === 'permanent' ? (
              <div className="w-full flex flex-col items-center pb-2">
                <table className="w-full max-w-3xl">
                  <tbody>
                    <tr className="border-b">
                      <td className="border-r pr-1 sm:pr-2 pb-2 w-1/2">
                        <div className="flex justify-end gap-0.5 sm:gap-1">
                          {renderToothRow(upperRight)}
                        </div>
                      </td>
                      <td className="pl-1 sm:pl-2 pb-2 w-1/2">
                        <div className="flex justify-start gap-0.5 sm:gap-1">
                          {renderToothRow(upperLeft)}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="border-r pr-1 sm:pr-2 pt-2 w-1/2">
                        <div className="flex justify-end gap-0.5 sm:gap-1">
                          {renderToothRow(lowerRight)}
                        </div>
                      </td>
                      <td className="pl-1 sm:pl-2 pt-2 w-1/2">
                        <div className="flex justify-start gap-0.5 sm:gap-1">
                          {renderToothRow(lowerLeft)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              // Pediatric Chart
              <div className="w-full flex flex-col items-center pb-2">
                <table className="w-full max-w-2xl">
                  <tbody>
                    <tr className="border-b">
                      <td className="border-r pr-1 sm:pr-2 pb-2 w-1/2">
                        <div className="flex justify-end gap-0.5 sm:gap-1">
                          {renderToothRow(pediatricUpperRight)}
                        </div>
                      </td>
                      <td className="pl-1 sm:pl-2 pb-2 w-1/2">
                        <div className="flex justify-start gap-0.5 sm:gap-1">
                          {renderToothRow(pediatricUpperLeft)}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="border-r pr-1 sm:pr-2 pt-2 w-1/2">
                        <div className="flex justify-end gap-0.5 sm:gap-1">
                          {renderToothRow(pediatricLowerRight)}
                        </div>
                      </td>
                      <td className="pl-1 sm:pl-2 pt-2 w-1/2">
                        <div className="flex justify-start gap-0.5 sm:gap-1">
                          {renderToothRow(pediatricLowerLeft)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </div>
      </div>
      <CardFooter className="flex-col items-start gap-4">
        <div className="w-full">
            <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Staged Observations</Label>
                <Button variant="ghost" size="sm" onClick={handleOpenObservationsModal}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                </Button>
            </div>
            {stagedObservations && stagedObservations.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 pl-4">
                    {stagedObservations.map((obs, index) => <li key={index}>{obs}</li>)}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground mt-1">None</p>
            )}
        </div>

        <div className="w-full pt-4 border-t">
            <Label className="text-sm font-semibold">Legend</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm items-center">
                {STATUSES.filter(s => s !== 'healthy').map(status => (
                    <div key={status} className="flex items-center gap-2">
                        <span className={cn("h-3 w-3 rounded-full", STATUS_BG_COLORS[status])} />
                        <span className="capitalize">{status}</span>
                    </div>
                ))}
            </div>
        </div>
    </CardFooter>

      {/* Notes Modal */}
      <Dialog open={modalState.open} onOpenChange={(open) => setModalState({ open, toothNumber: open ? modalState.toothNumber : null })}>
        <DialogContent className="no-print">
            <DialogHeader>
                <DialogTitle>Details for Tooth #{modalState.toothNumber}</DialogTitle>
                <DialogDescription>Add clinical notes for this tooth. This will be saved with the patient's record.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="toothNotes">Clinical Notes</Label>
                    <Textarea
                        id="toothNotes"
                        value={toothNotes}
                        onChange={(e) => setToothNotes(e.target.value)}
                        placeholder="e.g., Deep occlusal caries, patient reports sensitivity..."
                        className="min-h-[100px]"
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSaveToothDetails}>Save Details</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Observations Modal */}
      <Dialog open={isObservationsModalOpen} onOpenChange={setIsObservationsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Staged Observations</DialogTitle>
                <DialogDescription>Add or remove observation notes for this patient's chart.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex gap-2">
                    <Input 
                        value={newObservation} 
                        onChange={(e) => setNewObservation(e.target.value)} 
                        placeholder="Add new observation..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addObservation(); } }}
                    />
                    <Button type="button" onClick={addObservation}>Add</Button>
                </div>
                <div className="space-y-2">
                    {tempObservations.length > 0 ? (
                        tempObservations.map((obs, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <span>{obs}</span>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeObservation(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No observations added yet.</p>
                    )}
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSaveObservations}>Save Observations</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
