'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Hospital,
  CalendarDays,
  Users,
  MessageSquare,
  Activity,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar as CalendarIcon,
  Phone,
  MapPin,
  Tag,
  Copy,
  ExternalLink,
  Filter,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  HelpCircle,
  ChevronRight,
  Flame,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Eye
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, subDays, isAfter, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { AdminClinic, AdminSurveyResponse, UserProfile } from '@/types';

export default function AdminDashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Data states
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<AdminSurveyResponse[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [clinicSearch, setClinicSearch] = useState('');
  const [clinicActivityFilter, setClinicActivityFilter] = useState<'all' | 'today' | 'recent' | 'inactive'>('all');
  const [surveySearch, setSurveySearch] = useState('');
  const [surveySourceFilter, setSurveySourceFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Selected Clinic for Active Dates Detail Modal
  const [selectedClinic, setSelectedClinic] = useState<AdminClinic | null>(null);
  const [isDatesModalOpen, setIsDatesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Today's date ISO format
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);

  /* ============================================================
     REALTIME FIRESTORE LISTENERS
  ============================================================ */
  useEffect(() => {
    if (!db) return;

    // 1. Listen to Clinics
    const clinicsCol = collection(db, 'clinics');
    const unsubClinics = onSnapshot(clinicsCol, (snapshot) => {
      const list: AdminClinic[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || 'Unnamed Clinic',
          address: data.address,
          phone: data.phone,
          clinicType: data.clinicType || 'General',
          inviteCode: data.inviteCode,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          logoUrl: data.logoUrl,
          isFounder: data.isFounder,
          activeDates: Array.isArray(data.activeDates) ? data.activeDates : [],
        });
      });
      // Sort by activeDates count descending by default
      list.sort((a, b) => (b.activeDates?.length || 0) - (a.activeDates?.length || 0));
      setClinics(list);
      setLoading(false);
    }, (error) => {
      console.warn("Could not fetch clinics:", error);
      setLoading(false);
    });

    // 2. Listen to Survey Responses
    const surveyCol = collection(db, 'survey_responses');
    const unsubSurvey = onSnapshot(surveyCol, (snapshot) => {
      const list: AdminSurveyResponse[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          uid: data.uid || '',
          email: data.email || 'No email',
          source: data.source || 'Unknown',
          createdAt: data.createdAt,
        });
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setSurveyResponses(list);
    }, (error) => {
      console.warn("Could not fetch survey responses:", error);
    });

    // 3. Listen to Users
    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          uid: d.id,
          displayName: data.displayName || 'Unnamed User',
          email: data.email || null,
          photoURL: data.photoURL || null,
          clinicId: data.clinicId || null,
          role: data.role || null,
          heardAboutAppFrom: data.heardAboutAppFrom || undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as UserProfile);
      });
      setUsersList(list);
    }, (error) => {
      console.warn("Could not fetch users:", error);
    });

    return () => {
      unsubClinics();
      unsubSurvey();
      unsubUsers();
    };
  }, [db]);

  /* ============================================================
     CLINIC MAP FOR EASY USER LOOKUP
  ============================================================ */
  const clinicMap = useMemo(() => {
    const map = new Map<string, AdminClinic>();
    clinics.forEach((c) => map.set(c.id, c));
    return map;
  }, [clinics]);

  /* ============================================================
     COMPUTED STATS
  ============================================================ */
  const stats = useMemo(() => {
    const totalClinics = clinics.length;
    let totalActiveDatesLogged = 0;
    let activeClinicsToday = 0;
    let activeClinicsPast7Days = 0;
    let activeClinicsPast30Days = 0;

    // Date frequency map for heatmaps
    const dateFrequency: Record<string, number> = {};

    clinics.forEach((c) => {
      const dates = c.activeDates || [];
      totalActiveDatesLogged += dates.length;

      let hasToday = false;
      let hasPast7 = false;
      let hasPast30 = false;

      dates.forEach((dStr) => {
        dateFrequency[dStr] = (dateFrequency[dStr] || 0) + 1;

        if (dStr === todayStr) hasToday = true;
        try {
          const parsed = parseISO(dStr);
          if (isValid(parsed)) {
            if (isAfter(parsed, sevenDaysAgo)) hasPast7 = true;
            if (isAfter(parsed, thirtyDaysAgo)) hasPast30 = true;
          }
        } catch {}
      });

      if (hasToday) activeClinicsToday++;
      if (hasPast7) activeClinicsPast7Days++;
      if (hasPast30) activeClinicsPast30Days++;
    });

    const totalUsers = usersList.length;
    const usersInClinics = usersList.filter((u) => !!u.clinicId).length;
    const soloUsers = totalUsers - usersInClinics;

    const totalSurveys = surveyResponses.length;
    const sourceBreakdown: Record<string, number> = {};
    surveyResponses.forEach((s) => {
      const src = s.source || 'Other';
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    });

    return {
      totalClinics,
      totalActiveDatesLogged,
      activeClinicsToday,
      activeClinicsPast7Days,
      activeClinicsPast30Days,
      totalUsers,
      usersInClinics,
      soloUsers,
      totalSurveys,
      sourceBreakdown,
      dateFrequency,
    };
  }, [clinics, usersList, surveyResponses, todayStr, sevenDaysAgo, thirtyDaysAgo]);

  /* ============================================================
     FILTERED CLINICS
  ============================================================ */
  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
      // Search
      const search = clinicSearch.toLowerCase().trim();
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search) ||
        (c.address && c.address.toLowerCase().includes(search)) ||
        (c.phone && c.phone.includes(search)) ||
        (c.inviteCode && c.inviteCode.toLowerCase().includes(search)) ||
        c.id.toLowerCase().includes(search);

      if (!matchSearch) return false;

      // Activity Filter
      if (clinicActivityFilter === 'today') {
        return c.activeDates?.includes(todayStr);
      } else if (clinicActivityFilter === 'recent') {
        return c.activeDates?.some((dStr) => {
          try {
            const parsed = parseISO(dStr);
            return isValid(parsed) && isAfter(parsed, sevenDaysAgo);
          } catch {
            return false;
          }
        });
      } else if (clinicActivityFilter === 'inactive') {
        return !c.activeDates || c.activeDates.length === 0;
      }

      return true;
    });
  }, [clinics, clinicSearch, clinicActivityFilter, todayStr, sevenDaysAgo]);

  /* ============================================================
     FILTERED SURVEY RESPONSES
  ============================================================ */
  const filteredSurveys = useMemo(() => {
    return surveyResponses.filter((s) => {
      const search = surveySearch.toLowerCase().trim();
      const matchSearch =
        !search ||
        (s.email && s.email.toLowerCase().includes(search)) ||
        (s.source && s.source.toLowerCase().includes(search)) ||
        s.uid.toLowerCase().includes(search);

      if (!matchSearch) return false;

      if (surveySourceFilter !== 'all' && s.source !== surveySourceFilter) {
        return false;
      }

      return true;
    });
  }, [surveyResponses, surveySearch, surveySourceFilter]);

  /* ============================================================
     FILTERED USERS
  ============================================================ */
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const search = userSearch.toLowerCase().trim();
      const clinicName = u.clinicId ? clinicMap.get(u.clinicId)?.name || '' : '';
      const matchSearch =
        !search ||
        (u.displayName && u.displayName.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.role && u.role.toLowerCase().includes(search)) ||
        clinicName.toLowerCase().includes(search) ||
        (u.heardAboutAppFrom && u.heardAboutAppFrom.toLowerCase().includes(search));

      if (!matchSearch) return false;

      if (userRoleFilter === 'admin') return u.role === 'admin' || u.role === 'owner';
      if (userRoleFilter === 'member') return u.role === 'member';
      if (userRoleFilter === 'none') return !u.clinicId;

      return true;
    });
  }, [usersList, userSearch, userRoleFilter, clinicMap]);

  /* ============================================================
     HELPERS & FORMATTERS
  ============================================================ */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard: ${text}`,
    });
  };

  const getClinicStatusBadge = (clinic: AdminClinic) => {
    const dates = clinic.activeDates || [];
    if (dates.includes(todayStr)) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Today
        </Badge>
      );
    }
    const hasRecent = dates.some((dStr) => {
      try {
        const parsed = parseISO(dStr);
        return isValid(parsed) && isAfter(parsed, sevenDaysAgo);
      } catch {
        return false;
      }
    });

    if (hasRecent) {
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Active this week
        </Badge>
      );
    }

    if (dates.length > 0) {
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <Clock className="h-3 w-3" />
          {dates.length} days active
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-muted-foreground bg-slate-100 dark:bg-slate-800">
        No active dates
      </Badge>
    );
  };

  const getLastActiveLabel = (dates?: string[]) => {
    if (!dates || dates.length === 0) return 'Never';
    // Sorted list of dates descending
    const sorted = [...dates].sort().reverse();
    const latest = sorted[0];
    if (latest === todayStr) return 'Today';
    try {
      const parsed = parseISO(latest);
      if (isValid(parsed)) {
        if (isYesterday(parsed)) return 'Yesterday';
        return format(parsed, 'MMM dd, yyyy');
      }
    } catch {}
    return latest;
  };

  // CSV Exporters
  const exportClinicsCSV = () => {
    const headers = ['Clinic ID', 'Name', 'Type', 'Phone', 'Address', 'Invite Code', 'Total Active Days', 'Last Active Date', 'Active Dates'];
    const rows = clinics.map((c) => [
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.clinicType || 'General'}"`,
      `"${c.phone || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.inviteCode || ''}"`,
      c.activeDates?.length || 0,
      `"${getLastActiveLabel(c.activeDates)}"`,
      `"${(c.activeDates || []).join(', ')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinicclick_clinics_active_dates_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSurveysCSV = () => {
    const headers = ['Response ID', 'User ID', 'Email', 'Source Channel', 'Submitted Date'];
    const rows = surveyResponses.map((s) => [
      `"${s.id}"`,
      `"${s.uid}"`,
      `"${s.email || ''}"`,
      `"${s.source}"`,
      `"${s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinicclick_survey_responses_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUsersCSV = () => {
    const headers = ['User ID', 'Display Name', 'Email', 'Clinic ID', 'Clinic Name', 'Role', 'Acquisition Source'];
    const rows = usersList.map((u) => [
      `"${u.uid}"`,
      `"${u.displayName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.clinicId || ''}"`,
      `"${u.clinicId ? (clinicMap.get(u.clinicId)?.name || 'Unknown') : 'None'}"`,
      `"${u.role || 'Member'}"`,
      `"${u.heardAboutAppFrom || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinicclick_users_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recent 30 days array for activity heatmap preview
  const recent30Days = useMemo(() => {
    const arr: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold backdrop-blur-md border border-indigo-400/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Master Admin Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Clinics & Active Dates Center
            </h1>
            <p className="text-sm md:text-base text-indigo-200/80 max-w-2xl">
              Live metrics for registered clinics, logged active dates (<code className="text-emerald-300 font-mono text-xs">activeDates</code>), user acquisition channels, and user directory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={exportClinicsCSV}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export Clinics & Active Dates
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                toast({
                  title: "Data Synced",
                  description: "Realtime listeners are actively tracking Firestore changes.",
                });
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Live Connected
            </Button>
          </div>
        </div>

        {/* Decorative ambient background */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* TOP SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Clinics */}
        <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Clinics
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Hospital className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClinics}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.activeClinicsPast30Days}</span> active this month
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Active Today */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Today
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <Flame className="h-4 w-4 animate-bounce" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.activeClinicsToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clinics logging activity today
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Active Days Logged */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Dates Logged
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveDatesLogged}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cumulative clinic active days
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Total Users */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Registered Users
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-purple-600 dark:text-purple-400">{stats.usersInClinics}</span> in clinic, {stats.soloUsers} solo
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Survey Responses */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Survey Responses
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSurveys}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Top: {Object.entries(stats.sourceBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="clinics-dates" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1.5 bg-slate-100 dark:bg-slate-900 border rounded-xl gap-1">
          <TabsTrigger value="clinics-dates" className="py-2.5 text-xs md:text-sm font-semibold rounded-lg gap-2">
            <Hospital className="h-4 w-4 text-indigo-500" />
            <span>Clinics & Active Dates ({clinics.length})</span>
          </TabsTrigger>
          <TabsTrigger value="activity-heatmap" className="py-2.5 text-xs md:text-sm font-semibold rounded-lg gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>Activity Analytics & Heatmap</span>
          </TabsTrigger>
          <TabsTrigger value="surveys" className="py-2.5 text-xs md:text-sm font-semibold rounded-lg gap-2">
            <MessageSquare className="h-4 w-4 text-amber-500" />
            <span>Survey Responses ({surveyResponses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="py-2.5 text-xs md:text-sm font-semibold rounded-lg gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Users Directory ({usersList.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB 1: CLINICS & ACTIVE DATES
        ============================================================ */}
        <TabsContent value="clinics-dates" className="space-y-4">
          {/* Action and Filter Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clinics by name, ID, code..."
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <Select
                value={clinicActivityFilter}
                onValueChange={(val: any) => setClinicActivityFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-48 text-xs">
                  <SelectValue placeholder="Activity Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clinics ({clinics.length})</SelectItem>
                  <SelectItem value="today">Active Today ({stats.activeClinicsToday})</SelectItem>
                  <SelectItem value="recent">Active Past 7 Days ({stats.activeClinicsPast7Days})</SelectItem>
                  <SelectItem value="inactive">No Active Dates ({clinics.filter(c => !c.activeDates?.length).length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center border rounded-lg p-0.5 bg-muted">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="text-xs h-7 px-2.5"
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="text-xs h-7 px-2.5"
                >
                  Table
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={exportClinicsCSV}
                className="text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Clinics Display: Cards View */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClinics.map((clinic) => {
                const dates = clinic.activeDates || [];
                const sortedDates = [...dates].sort().reverse();
                const latestDates = sortedDates.slice(0, 5);

                return (
                  <Card 
                    key={clinic.id} 
                    className="flex flex-col justify-between shadow-sm hover:shadow-md transition-all border-t-2 border-t-indigo-500/80"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base font-bold truncate text-slate-900 dark:text-slate-100">
                              {clinic.name}
                            </CardTitle>
                            {clinic.isFounder && (
                              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] py-0">
                                Founder
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            <span>{clinic.clinicType || 'General'}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px]">ID: {clinic.id.slice(0, 8)}...</span>
                          </div>
                        </div>

                        {getClinicStatusBadge(clinic)}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pb-3 text-xs">
                      {/* Active Dates Highlight Box */}
                      <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            Active Dates Record:
                          </span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            {dates.length} {dates.length === 1 ? 'day' : 'days'}
                          </span>
                        </div>

                        {/* Recent Dates Chips */}
                        {dates.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="text-[11px] text-muted-foreground flex justify-between">
                              <span>Last active:</span>
                              <span className="font-medium text-foreground">{getLastActiveLabel(dates)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {latestDates.map((dStr, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="secondary" 
                                  className={cn(
                                    "text-[10px] font-mono py-0 px-1.5",
                                    dStr === todayStr ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 font-bold" : ""
                                  )}
                                >
                                  {dStr === todayStr ? '★ ' + dStr : dStr}
                                </Badge>
                              ))}
                              {dates.length > 5 && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground">
                                  +{dates.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            No active dates recorded yet for this clinic.
                          </p>
                        )}
                      </div>

                      {/* Contact & Meta details */}
                      <div className="space-y-1 text-muted-foreground pt-1">
                        {clinic.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            <span>{clinic.phone}</span>
                          </div>
                        )}
                        {clinic.address && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{clinic.address}</span>
                          </div>
                        )}
                        {clinic.inviteCode && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px]">Invite Code:</span>
                            <button
                              onClick={() => copyToClipboard(clinic.inviteCode || '', 'Invite Code')}
                              className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                            >
                              {clinic.inviteCode}
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 border-t flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40 rounded-b-xl">
                      <span className="text-[10px] text-muted-foreground">
                        {clinic.createdAt?.toDate ? format(clinic.createdAt.toDate(), 'MMM d, yyyy') : 'Date N/A'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClinic(clinic);
                          setIsDatesModalOpen(true);
                        }}
                        className="text-xs h-7 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View All Dates ({dates.length})
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Clinics Display: Detailed Table View */
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Clinic Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Total Active Dates</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Active Dates List</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClinics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No clinics match the current filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClinics.map((clinic) => {
                      const dates = clinic.activeDates || [];
                      const sortedDates = [...dates].sort().reverse();
                      return (
                        <TableRow key={clinic.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                          <TableCell className="font-semibold">
                            <div className="flex flex-col">
                              <span className="text-slate-900 dark:text-slate-100">{clinic.name}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">{clinic.id}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getClinicStatusBadge(clinic)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono font-bold">
                              {dates.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{getLastActiveLabel(dates)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {sortedDates.slice(0, 3).map((d, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] font-mono py-0 px-1">
                                  {d}
                                </Badge>
                              ))}
                              {dates.length > 3 && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  +{dates.length - 3} more
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {clinic.inviteCode || 'N/A'}
                            </code>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClinic(clinic);
                                setIsDatesModalOpen(true);
                              }}
                              className="text-xs h-7 gap-1"
                            >
                              <CalendarDays className="h-3 w-3" />
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ============================================================
            TAB 2: ACTIVITY ANALYTICS & HEATMAP
        ============================================================ */}
        <TabsContent value="activity-heatmap" className="space-y-6">
          {/* 30-Day Activity Heatmap */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                30-Day Clinic Activity Heatmap
              </CardTitle>
              <CardDescription>
                Visual distribution of active clinic days logged over the past 30 days across all registered clinics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {recent30Days.map((dStr) => {
                  const count = stats.dateFrequency[dStr] || 0;
                  const isCurrentDay = dStr === todayStr;

                  let intensityClass = "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-transparent";
                  if (count > 0 && count <= 2) {
                    intensityClass = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
                  } else if (count > 2 && count <= 5) {
                    intensityClass = "bg-emerald-300 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 border-emerald-400 font-semibold";
                  } else if (count > 5) {
                    intensityClass = "bg-emerald-600 text-white border-emerald-700 font-bold shadow-sm";
                  }

                  let formattedDate = dStr;
                  try {
                    const parsed = parseISO(dStr);
                    if (isValid(parsed)) {
                      formattedDate = format(parsed, 'MMM dd');
                    }
                  } catch {}

                  return (
                    <div
                      key={dStr}
                      className={cn(
                        "p-3 rounded-lg border flex flex-col justify-between gap-1 transition-all hover:scale-102",
                        intensityClass,
                        isCurrentDay ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono">{formattedDate}</span>
                        {isCurrentDay && (
                          <span className="text-[9px] px-1 bg-indigo-600 text-white rounded font-bold">TODAY</span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-bold">{count}</span>
                        <span className="text-[10px] opacity-80">{count === 1 ? 'clinic' : 'clinics'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground pt-2">
                <span>Less Active</span>
                <div className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 rounded bg-slate-100 dark:bg-slate-800 border" />
                  <div className="h-3.5 w-3.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300" />
                  <div className="h-3.5 w-3.5 rounded bg-emerald-300 dark:bg-emerald-800" />
                  <div className="h-3.5 w-3.5 rounded bg-emerald-600 text-white" />
                </div>
                <span>More Active</span>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard: Most Active Clinics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500" />
                  Top Active Clinics Leaderboard
                </CardTitle>
                <CardDescription>
                  Clinics with the highest number of recorded active dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {clinics.slice(0, 6).map((c, idx) => {
                  const datesCount = c.activeDates?.length || 0;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          idx === 0 ? "bg-amber-400 text-amber-950" :
                          idx === 1 ? "bg-slate-300 text-slate-900" :
                          idx === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Last: {getLastActiveLabel(c.activeDates)}</p>
                        </div>
                      </div>
                      <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-mono font-bold">
                        {datesCount} {datesCount === 1 ? 'day' : 'days'}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Insights Card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  Activity Breakdown Insights
                </CardTitle>
                <CardDescription>
                  Summary of clinic engagement levels across time horizons.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Active Today ({stats.activeClinicsToday} of {stats.totalClinics})</span>
                    <span>{stats.totalClinics > 0 ? Math.round((stats.activeClinicsToday / stats.totalClinics) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all" 
                      style={{ width: `${stats.totalClinics > 0 ? (stats.activeClinicsToday / stats.totalClinics) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Active Past 7 Days ({stats.activeClinicsPast7Days} of {stats.totalClinics})</span>
                    <span>{stats.totalClinics > 0 ? Math.round((stats.activeClinicsPast7Days / stats.totalClinics) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all" 
                      style={{ width: `${stats.totalClinics > 0 ? (stats.activeClinicsPast7Days / stats.totalClinics) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Active Past 30 Days ({stats.activeClinicsPast30Days} of {stats.totalClinics})</span>
                    <span>{stats.totalClinics > 0 ? Math.round((stats.activeClinicsPast30Days / stats.totalClinics) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all" 
                      style={{ width: `${stats.totalClinics > 0 ? (stats.activeClinicsPast30Days / stats.totalClinics) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground leading-relaxed">
                  <p>
                    💡 <strong>Tip:</strong> Clinics automatically record an active date whenever appointments, patient check-ins, or invoices are modified.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================
            TAB 3: SURVEY RESPONSES
        ============================================================ */}
        <TabsContent value="surveys" className="space-y-6">
          {/* Survey Source Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stats.sourceBreakdown).map(([source, count]) => {
              const pct = stats.totalSurveys > 0 ? Math.round((count / stats.totalSurveys) * 100) : 0;
              return (
                <Card key={source} className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground truncate">{source}</span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
                    </div>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search and Table */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or source..."
                  value={surveySearch}
                  onChange={(e) => setSurveySearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <Select
                value={surveySourceFilter}
                onValueChange={(val) => setSurveySourceFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-48 text-xs">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.keys(stats.sourceBreakdown).map((src) => (
                    <SelectItem key={src} value={src}>{src}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportSurveysCSV}
              className="text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export Surveys CSV
            </Button>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Acquisition Source</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-right">Submission Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No survey responses match the filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSurveys.map((survey) => (
                    <TableRow key={survey.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                      <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {survey.email || 'Anonymous / No Email'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold">
                          {survey.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {survey.uid}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {survey.createdAt?.toDate ? format(survey.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ============================================================
            TAB 4: USERS DIRECTORY
        ============================================================ */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, clinic..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <Select
                value={userRoleFilter}
                onValueChange={(val) => setUserRoleFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-48 text-xs">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles ({usersList.length})</SelectItem>
                  <SelectItem value="admin">Clinic Admins</SelectItem>
                  <SelectItem value="member">Clinic Members</SelectItem>
                  <SelectItem value="none">No Clinic Attached</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportUsersCSV}
              className="text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export Users CSV
            </Button>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Attached Clinic</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Survey Source</TableHead>
                  <TableHead className="text-right">Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users match the search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const clinic = u.clinicId ? clinicMap.get(u.clinicId) : null;
                    return (
                      <TableRow key={u.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                        <TableCell className="font-semibold text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span>{u.displayName || 'No Name'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{u.email || 'No email'}</TableCell>
                        <TableCell className="text-xs">
                          {clinic ? (
                            <div className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                              <Hospital className="h-3.5 w-3.5" />
                              <span>{clinic.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.role === 'admin' || u.role === 'owner' ? (
                            <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px]">
                              Admin
                            </Badge>
                          ) : u.role === 'member' ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Member
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Standalone
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.heardAboutAppFrom ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]">
                              {u.heardAboutAppFrom}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {(u.createdAt as any)?.toDate ? format((u.createdAt as any).toDate(), 'MMM dd, yyyy') : (u.createdAt instanceof Date ? format(u.createdAt, 'MMM dd, yyyy') : 'N/A')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================
          ACTIVE DATES INSPECTOR MODAL
      ============================================================ */}
      <Dialog open={isDatesModalOpen} onOpenChange={setIsDatesModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedClinic && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Hospital className="h-5 w-5 text-indigo-500" />
                      {selectedClinic.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-1">
                      Active dates log and engagement history for this clinic
                    </DialogDescription>
                  </div>
                  {getClinicStatusBadge(selectedClinic)}
                </div>
              </DialogHeader>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total Active Days</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedClinic.activeDates?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Last Active</p>
                  <p className="text-xs font-bold text-foreground mt-1">
                    {getLastActiveLabel(selectedClinic.activeDates)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Invite Code</p>
                  <p className="text-xs font-mono font-bold text-foreground mt-1">
                    {selectedClinic.inviteCode || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Active Dates Chronological List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-emerald-500" />
                    All Recorded Active Dates ({selectedClinic.activeDates?.length || 0})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const csvContent = 'data:text/csv;charset=utf-8,' + ['Active Date', ...(selectedClinic.activeDates || [])].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `${selectedClinic.name}_active_dates.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs h-7 text-indigo-600 dark:text-indigo-400 gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Export Dates
                  </Button>
                </div>

                {(!selectedClinic.activeDates || selectedClinic.activeDates.length === 0) ? (
                  <div className="p-8 text-center rounded-xl border border-dashed text-muted-foreground text-xs">
                    No active dates logged for this clinic yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                    {[...selectedClinic.activeDates].sort().reverse().map((dStr, idx) => {
                      const isCurrent = dStr === todayStr;
                      let dayName = '';
                      let formattedDate = dStr;

                      try {
                        const parsed = parseISO(dStr);
                        if (isValid(parsed)) {
                          dayName = format(parsed, 'EEEE');
                          formattedDate = format(parsed, 'MMM dd, yyyy');
                        }
                      } catch {}

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1 transition-colors",
                            isCurrent
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700"
                              : "bg-card hover:bg-slate-50 dark:hover:bg-slate-900"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs">{dStr}</span>
                            {isCurrent && (
                              <Badge className="bg-emerald-500 text-white text-[9px] py-0 px-1">
                                Today
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex justify-between items-center">
                            <span>{dayName}</span>
                            <span className="text-[10px] opacity-70">#{selectedClinic.activeDates!.length - idx}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button variant="outline" onClick={() => setIsDatesModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
