'use client';

import React, { useState, useMemo } from 'react';
import type { Procedure, AppointmentProcedureDetail, ProcedureSubStep, Appointment, Patient } from '@/types';
import { getPresetSubProcedures, reconcileSubProcedures } from '@/lib/procedure-presets';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  History, 
  Stethoscope, 
  Layers,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface PreviousProcedureRecord {
  procedureId: string;
  procedureName: string;
  subProcedures: ProcedureSubStep[];
  lastDate?: string;
  appointmentId?: string;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}

interface ProcedureSubprocedureSelectorProps {
  allProcedures: Procedure[];
  selectedPatientId?: string;
  currentProcedureDetails: AppointmentProcedureDetail[];
  currentProcedureIds: string[];
  appointments: Appointment[];
  currentAppointmentId?: string | null;
  patients?: Patient[];
  onProcedureDetailsChange: (details: AppointmentProcedureDetail[], procedureIds: string[]) => void;
}

export function ProcedureSubprocedureSelector({
  allProcedures,
  selectedPatientId,
  currentProcedureDetails,
  currentProcedureIds,
  appointments,
  currentAppointmentId,
  patients = [],
  onProcedureDetailsChange,
}: ProcedureSubprocedureSelectorProps) {
  // Track which procedure in the toggle list is expanded
  const [expandedProcedureIds, setExpandedProcedureIds] = useState<Record<string, boolean>>({});
  // Track custom step input per procedure
  const [customStepInputs, setCustomStepInputs] = useState<Record<string, string>>({});
  // Search filter
  const [filterText, setFilterText] = useState('');

  // 1. Compute previously linked procedures for this patient from earlier appointments & patient data
  const previousProcedures: PreviousProcedureRecord[] = useMemo(() => {
    if (!selectedPatientId) return [];

    const patientAppts = appointments
      .filter(a => a.patientId === selectedPatientId && a.id !== currentAppointmentId)
      .sort((a, b) => new Date(`${b.date}T${b.startTime}`).getTime() - new Date(`${a.date}T${a.startTime}`).getTime());

    const map = new Map<string, PreviousProcedureRecord>();

    for (const app of patientAppts) {
      if (app.procedureDetails && app.procedureDetails.length > 0) {
        for (const pd of app.procedureDetails) {
          if (!map.has(pd.procedureId)) {
            const steps = reconcileSubProcedures(pd.subProcedures, pd.procedureName);
            const total = steps.length;
            const completed = steps.filter(s => s.completed).length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            map.set(pd.procedureId, {
              procedureId: pd.procedureId,
              procedureName: pd.procedureName,
              subProcedures: steps,
              lastDate: app.date,
              appointmentId: app.id,
              completedCount: completed,
              totalCount: total,
              progressPercentage: pct,
            });
          }
        }
      } else if (app.procedureIds && app.procedureIds.length > 0) {
        for (const procId of app.procedureIds) {
          if (!map.has(procId)) {
            const pData = allProcedures.find(p => p.id === procId);
            const name = pData?.name || "Procedure";
            const defaultSteps = getPresetSubProcedures(name).map(s => ({ name: s, completed: false }));
            map.set(procId, {
              procedureId: procId,
              procedureName: name,
              subProcedures: defaultSteps,
              lastDate: app.date,
              appointmentId: app.id,
              completedCount: 0,
              totalCount: defaultSteps.length,
              progressPercentage: 0,
            });
          }
        }
      }
    }

    const patientObj = patients.find(p => p.id === selectedPatientId);
    if (patientObj?.linkedProcedures) {
      for (const lp of patientObj.linkedProcedures) {
        if (!map.has(lp.procedureId)) {
          const steps = reconcileSubProcedures(lp.subProcedures, lp.procedureName);
          const total = steps.length;
          const completed = steps.filter(s => s.completed).length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          map.set(lp.procedureId, {
            procedureId: lp.procedureId,
            procedureName: lp.procedureName,
            subProcedures: steps,
            lastDate: lp.date ? lp.date.split('T')[0] : undefined,
            completedCount: completed,
            totalCount: total,
            progressPercentage: pct,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [selectedPatientId, appointments, currentAppointmentId, allProcedures, patients]);

  const toggleExpand = (procedureId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedProcedureIds(prev => ({
      ...prev,
      [procedureId]: !prev[procedureId],
    }));
  };

  // Helper to get or build subprocedures for a procedure
  const getSubProceduresForProcedure = (procId: string, procName: string): ProcedureSubStep[] => {
    const existing = currentProcedureDetails.find(d => d.procedureId === procId);
    if (existing && existing.subProcedures) {
      return existing.subProcedures;
    }
    const prevRecord = previousProcedures.find(p => p.procedureId === procId);
    if (prevRecord && prevRecord.subProcedures.length > 0) {
      return prevRecord.subProcedures.map(s => ({ ...s }));
    }
    return getPresetSubProcedures(procName).map(name => ({ name, completed: false }));
  };

  // Toggle procedure link in current appointment
  const handleToggleProcedure = (proc: Procedure) => {
    const isCurrentlyLinked = currentProcedureIds.includes(proc.id);

    if (isCurrentlyLinked) {
      // Unlink
      const nextDetails = currentProcedureDetails.filter(d => d.procedureId !== proc.id);
      const nextIds = currentProcedureIds.filter(id => id !== proc.id);
      onProcedureDetailsChange(nextDetails, nextIds);
    } else {
      // Link & auto-expand toggle list
      const initialSteps = getSubProceduresForProcedure(proc.id, proc.name);
      const newDetail: AppointmentProcedureDetail = {
        procedureId: proc.id,
        procedureName: proc.name,
        subProcedures: initialSteps,
      };

      const nextDetails = [...currentProcedureDetails, newDetail];
      const nextIds = [...currentProcedureIds, proc.id];
      setExpandedProcedureIds(prev => ({ ...prev, [proc.id]: true }));
      onProcedureDetailsChange(nextDetails, nextIds);
    }
  };

  // Continue a previously linked procedure in this appointment
  const handleContinuePrevious = (prevProc: PreviousProcedureRecord) => {
    const isAlreadyLinked = currentProcedureIds.includes(prevProc.procedureId);
    if (isAlreadyLinked) {
      setExpandedProcedureIds(prev => ({ ...prev, [prevProc.procedureId]: true }));
      return;
    }

    const newDetail: AppointmentProcedureDetail = {
      procedureId: prevProc.procedureId,
      procedureName: prevProc.procedureName,
      subProcedures: prevProc.subProcedures.map(s => ({ ...s })),
    };

    const nextDetails = [...currentProcedureDetails, newDetail];
    const nextIds = [...currentProcedureIds, prevProc.procedureId];
    setExpandedProcedureIds(prev => ({ ...prev, [prevProc.procedureId]: true }));
    onProcedureDetailsChange(nextDetails, nextIds);
  };

  // Toggle single subprocedure completion
  const handleToggleSubStep = (proc: Procedure, stepIndex: number) => {
    const isCurrentlyLinked = currentProcedureIds.includes(proc.id);
    let nextDetails: AppointmentProcedureDetail[];
    let nextIds = currentProcedureIds;

    const nowIso = new Date().toISOString();

    if (!isCurrentlyLinked) {
      // Auto-link procedure if doctor ticks a sub-procedure
      const initialSteps = getSubProceduresForProcedure(proc.id, proc.name).map((step, idx) => {
        if (idx === stepIndex) return { ...step, completed: true, completedAt: nowIso };
        return step;
      });
      nextDetails = [...currentProcedureDetails, {
        procedureId: proc.id,
        procedureName: proc.name,
        subProcedures: initialSteps,
      }];
      nextIds = [...currentProcedureIds, proc.id];
      setExpandedProcedureIds(prev => ({ ...prev, [proc.id]: true }));
    } else {
      nextDetails = currentProcedureDetails.map(detail => {
        if (detail.procedureId !== proc.id) return detail;
        const updatedSteps = detail.subProcedures.map((step, idx) => {
          if (idx !== stepIndex) return step;
          const nextCompleted = !step.completed;
          return {
            ...step,
            completed: nextCompleted,
            completedAt: nextCompleted ? (step.completedAt || nowIso) : undefined,
          };
        });
        return { ...detail, subProcedures: updatedSteps };
      });
    }

    onProcedureDetailsChange(nextDetails, nextIds);
  };

  // Add custom subprocedure specifically for this patient
  const handleAddCustomStep = (proc: Procedure) => {
    const stepText = (customStepInputs[proc.id] || '').trim();
    if (!stepText) return;

    const isCurrentlyLinked = currentProcedureIds.includes(proc.id);
    const newCustomStep: ProcedureSubStep = {
      name: stepText,
      completed: false,
      isCustom: true,
    };

    let nextDetails: AppointmentProcedureDetail[];
    let nextIds = currentProcedureIds;

    if (!isCurrentlyLinked) {
      const initialSteps = [
        ...getSubProceduresForProcedure(proc.id, proc.name),
        newCustomStep
      ];
      nextDetails = [...currentProcedureDetails, {
        procedureId: proc.id,
        procedureName: proc.name,
        subProcedures: initialSteps,
      }];
      nextIds = [...currentProcedureIds, proc.id];
      setExpandedProcedureIds(prev => ({ ...prev, [proc.id]: true }));
    } else {
      nextDetails = currentProcedureDetails.map(detail => {
        if (detail.procedureId !== proc.id) return detail;
        return {
          ...detail,
          subProcedures: [...detail.subProcedures, newCustomStep],
        };
      });
    }

    setCustomStepInputs(prev => ({ ...prev, [proc.id]: '' }));
    onProcedureDetailsChange(nextDetails, nextIds);
  };

  // Remove a subprocedure
  const handleRemoveSubStep = (procId: string, stepIndex: number) => {
    const nextDetails = currentProcedureDetails.map(detail => {
      if (detail.procedureId !== procId) return detail;
      return {
        ...detail,
        subProcedures: detail.subProcedures.filter((_, idx) => idx !== stepIndex),
      };
    });
    onProcedureDetailsChange(nextDetails, currentProcedureIds);
  };

  // Filtered available procedures list
  const filteredProcedures = useMemo(() => {
    if (!filterText.trim()) return allProcedures;
    const q = filterText.toLowerCase();
    return allProcedures.filter(p => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.category && p.category.toLowerCase().includes(q)) return true;
      const steps = getPresetSubProcedures(p.name);
      return steps.some(s => s.toLowerCase().includes(q));
    });
  }, [allProcedures, filterText]);

  return (
    <div className="space-y-2">
      {/* ---------------- SECTION 1: PREVIOUSLY LINKED PROCEDURES ---------------- */}
      {selectedPatientId && previousProcedures.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <History className="h-3.5 w-3.5 text-blue-500" />
              Previously Linked Procedure
            </span>
            <span className="text-3xs text-muted-foreground">
              {previousProcedures.length} in progress
            </span>
          </div>

          <div className="space-y-1">
            {previousProcedures.map((prevProc) => {
              const isCurrentlyLinked = currentProcedureIds.includes(prevProc.procedureId);
              const progressPct = prevProc.progressPercentage;

              return (
                <div 
                  key={prevProc.procedureId} 
                  className={cn(
                    "rounded-md border p-1.5 px-2 text-xs transition-colors bg-muted/20",
                    isCurrentlyLinked 
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20" 
                      : "border-border/70 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-xs text-foreground truncate">
                        {prevProc.procedureName}
                      </span>
                      <span className="text-3xs text-muted-foreground">
                        ({prevProc.completedCount}/{prevProc.totalCount} steps · {progressPct}%)
                      </span>
                    </div>

                    <div className="shrink-0">
                      {isCurrentlyLinked ? (
                        <span className="inline-flex items-center gap-1 text-3xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-300/40">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Linked
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleContinuePrevious(prevProc)}
                          className="h-5 text-3xs px-2 font-medium gap-1"
                        >
                          <Plus className="h-2.5 w-2.5" /> Link
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Slim Progress bar */}
                  <div className="w-full bg-muted/80 rounded-full h-1 mt-1 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        progressPct === 100 
                          ? "bg-emerald-500" 
                          : progressPct >= 50 
                            ? "bg-blue-500" 
                            : "bg-amber-500"
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- SECTION 2: INTEGRATED PROCEDURES TOGGLE LIST ---------------- */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-special2" />
            <span>Linked Procedures &amp; Sub-procedures</span>
          </Label>
          <span className="text-3xs text-muted-foreground">
            {currentProcedureDetails.length} linked
          </span>
        </div>

        {/* Search */}
        <Input 
          placeholder="Search procedure or sub-procedure..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="h-7 text-xs"
        />

        {/* Hierarchical Toggle List */}
        <div className="border rounded-md p-1 max-h-56 overflow-y-auto bg-muted/20 divide-y divide-border/30 text-xs">
          {filteredProcedures.length === 0 ? (
            <p className="text-3xs text-muted-foreground py-2 text-center">No matching procedures found.</p>
          ) : (
            filteredProcedures.map(proc => {
              const isChecked = currentProcedureIds.includes(proc.id);
              const isExpanded = expandedProcedureIds[proc.id] ?? isChecked;
              const subSteps = getSubProceduresForProcedure(proc.id, proc.name);
              const totalSteps = subSteps.length;
              const completedSteps = subSteps.filter(s => s.completed).length;
              const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

              return (
                <div key={proc.id} className="py-1 px-1">
                  {/* Procedure Header Row with Toggle (▼ / ▶) */}
                  <div 
                    className={cn(
                      "flex items-center justify-between py-0.5 px-1 rounded transition-colors group cursor-pointer hover:bg-muted/50",
                      isChecked && "bg-muted/40"
                    )}
                    onClick={() => toggleExpand(proc.id)}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      {/* Toggle arrow: ▼ when expanded, ▶ when collapsed (like the screenshot) */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(proc.id, e)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded text-2xs leading-none shrink-0 w-3 text-center"
                        title={isExpanded ? "Collapse sub-procedures" : "Expand sub-procedures"}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>

                      {/* Parent Procedure Checkbox */}
                      <Checkbox 
                        checked={isChecked} 
                        onCheckedChange={() => handleToggleProcedure(proc)}
                        onClick={(e) => e.stopPropagation()} 
                        className="h-3.5 w-3.5 shrink-0"
                      />

                      {/* Procedure Name */}
                      <span className={cn(
                        "text-xs truncate",
                        isChecked ? "font-semibold text-primary" : "font-medium text-foreground"
                      )}>
                        {proc.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {isChecked ? (
                        <div className="flex items-center gap-1">
                          <span className="text-3xs text-muted-foreground font-medium">
                            {completedSteps}/{totalSteps} ({progressPct}%)
                          </span>
                          <div className="w-12 bg-muted rounded-full h-1 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                progressPct === 100 ? "bg-emerald-500" : progressPct >= 50 ? "bg-blue-500" : "bg-amber-500"
                              )}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        proc.category && (
                          <span className="text-3xs px-1 py-0.2 rounded bg-muted text-muted-foreground">
                            {proc.category}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Sub-procedures Nested Toggle List (Indented directly underneath) */}
                  {isExpanded && (
                    <div className="ml-4 pl-2.5 border-l-2 border-border/40 mt-1 mb-1.5 space-y-0.5">
                      {subSteps.map((step, stepIdx) => (
                        <div 
                          key={stepIdx} 
                          className={cn(
                            "flex items-center justify-between py-0.5 px-1 rounded transition-colors group text-xs",
                            step.completed ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100" : "hover:bg-muted/40"
                          )}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <Checkbox 
                              checked={step.completed} 
                              onCheckedChange={() => handleToggleSubStep(proc, stepIdx)} 
                              className="h-3 w-3 shrink-0"
                            />
                            <span className={cn(
                              "text-xs leading-tight truncate",
                              step.completed && "line-through opacity-75"
                            )}>
                              {step.name}
                            </span>
                            {step.isCustom && (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 font-medium leading-none">
                                Custom
                              </span>
                            )}
                            {step.completed && step.completedAt && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40 ml-auto shrink-0 font-normal">
                                {(() => {
                                  try {
                                    const d = new Date(step.completedAt);
                                    return isNaN(d.getTime()) ? step.completedAt : format(d, 'dd MMM');
                                  } catch {
                                    return step.completedAt;
                                  }
                                })()}
                              </span>
                            )}
                          </label>

                          {/* Delete step button for doctor manipulation */}
                          {isChecked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSubStep(proc.id, stepIdx);
                              }}
                              className="text-muted-foreground/50 hover:text-destructive p-0.5 rounded transition-colors"
                              title="Remove step"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Doctor Manipulation: Quick inline Add Step specifically for this patient */}
                      <div className="pt-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input 
                          placeholder="Add custom step for this patient..."
                          value={customStepInputs[proc.id] || ''}
                          onChange={(e) => setCustomStepInputs(prev => ({
                            ...prev,
                            [proc.id]: e.target.value
                          }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddCustomStep(proc);
                            }
                          }}
                          className="h-6 text-xs px-1.5"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCustomStep(proc);
                          }}
                          className="h-6 text-3xs px-2 shrink-0 gap-0.5 font-medium"
                        >
                          <Plus className="h-2.5 w-2.5" /> Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Card Badge & Progress Bar component for Appointments Cards and Lists
 */
export function AppointmentProcedureCardProgress({
  procedureDetails,
  procedureIds,
  allProcedures = [],
  className,
}: {
  procedureDetails?: AppointmentProcedureDetail[];
  procedureIds?: string[];
  allProcedures?: Procedure[];
  className?: string;
}) {
  if (procedureDetails && procedureDetails.length > 0) {
    return (
      <div className={cn("space-y-1 mt-1.5 pt-1.5 border-t border-border/40", className)}>
        {procedureDetails.map((pd, idx) => {
          const steps = reconcileSubProcedures(pd.subProcedures, pd.procedureName);
          const total = steps.length;
          const completed = steps.filter(s => s.completed).length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div key={idx} className="space-y-0.5">
              <div className="flex items-center justify-between text-2xs">
                <span className="font-medium text-foreground truncate max-w-[180px] flex items-center gap-1">
                  <Stethoscope className="h-3 w-3 text-special2 shrink-0" />
                  <span className="truncate">{pd.procedureName}</span>
                </span>
                <span className="text-3xs font-medium text-muted-foreground shrink-0 ml-1">
                  {completed}/{total} ({pct}%)
                </span>
              </div>
              <div className="w-full bg-muted/80 rounded-full h-1 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback for legacy procedureIds
  if (procedureIds && procedureIds.length > 0) {
    const names = procedureIds.map(id => allProcedures.find(p => p.id === id)?.name || "Procedure");
    return (
      <div className={cn("mt-1 text-2xs text-muted-foreground flex flex-wrap gap-1", className)}>
        {names.map((name, i) => (
          <Badge key={i} variant="outline" className="text-3xs py-0 px-1 font-normal">
            {name}
          </Badge>
        ))}
      </div>
    );
  }

  return null;
}
