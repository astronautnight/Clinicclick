
import type { NavItem, DashboardCardItem, LucideIconName } from '@/types';

// Icon components are not directly used here anymore, only their names.
// Specific icon components will be imported in the client components that render them.

export const sidebarNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
    description: 'Overview of your clinic activities.',
    color: 'bg-primary',
    iconColorClass: 'text-primary-foreground',
  },
  {
    title: 'My Clinic',
    href: '/clinic',
    iconName: 'Hospital',
    description: 'Manage your clinic settings and members.',
    color: 'bg-indigo-500',
    iconColorClass: 'text-indigo-100',
  },
  {
    title: 'Patients',
    href: '/patients',
    iconName: 'Users',
    description: 'Manage patient records and history.',
    color: 'bg-special1',
    iconColorClass: 'text-special1-foreground',
  },
  {
    title: 'Appointments',
    href: '/appointments',
    iconName: 'CalendarDays',
    description: 'Schedule and track appointments.',
    color: 'bg-special2',
    iconColorClass: 'text-special2-foreground',
  },
  {
    title: 'Procedures',
    href: '/procedures',
    iconName: 'ClipboardList',
    description: 'Manage dental procedures.',
    color: 'bg-special3',
    iconColorClass: 'text-special3-foreground',
  },
  {
    title: 'Doctors',
    href: '/doctors',
    iconName: 'Stethoscope',
    description: 'Manage doctors and assign tasks.',
    color: 'bg-special4',
    iconColorClass: 'text-special4-foreground',
  },
  {
    title: 'Staff',
    href: '/staff',
    iconName: 'PersonStanding',
    description: 'Manage assistants and receptionists.',
    color: 'bg-info',
    iconColorClass: 'text-info-foreground',
  },
  {
    title: 'Pharmacy',
    href: '/pharmacy',
    iconName: 'Pill',
    description: 'Manage drugs and prescriptions.',
    color: 'bg-special5',
    iconColorClass: 'text-special5-foreground',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Archive',
    description: 'Manage clinic supplies and materials.',
    color: 'bg-success',
    iconColorClass: 'text-success-foreground',
  },
  {
    title: 'Financials',
    href: '/financials',
    iconName: 'DollarSign',
    description: 'Track earnings and expenses.',
    color: 'bg-warning',
    iconColorClass: 'text-warning-foreground',
  },
   {
    title: 'AI EHR',
    href: '/ai-ehr',
    iconName: 'BookOpen',
    description: 'AI-powered Electronic Health Records hub.',
    color: 'bg-neutral', 
    iconColorClass: 'text-neutral-foreground',
  },
  {
    title: 'AI Diagnosis',
    href: '/ai-diagnosis',
    iconName: 'Sparkles',
    description: 'AI-powered diagnostic assistant.',
    color: 'bg-special1', 
    iconColorClass: 'text-special1-foreground',
  },
  {
    title: 'Consults / Academics',
    href: '/consults',
    iconName: 'UsersRound',
    description: 'Manage external consults and student academics.',
    color: 'bg-accent',
    iconColorClass: 'text-accent-foreground',
  },
  {
    title: 'Communication',
    href: '/communication',
    iconName: 'MessageSquare',
    description: 'Patient communication tools.',
    color: 'bg-info',
    iconColorClass: 'text-info-foreground',
  },
  {
    title: 'Case Sharing',
    href: '/case-sharing',
    iconName: 'Share2',
    description: 'Share cases with other doctors.',
    disabled: false, 
    color: 'bg-special2',
    iconColorClass: 'text-special2-foreground',
  },
  {
    title: 'Settings',
    href: '/settings',
    iconName: 'Settings',
    description: 'Configure application settings.',
    color: 'bg-neutral', 
    iconColorClass: 'text-neutral-foreground', 
  },
];

export const dashboardCards: DashboardCardItem[] = sidebarNavItems.filter(item => item.title !== 'Dashboard' && item.title !== 'Settings');


// You can add more specific items if needed, or derive from sidebarNavItems
export const profileNavItem: NavItem = {
    title: 'Profile',
    href: '/profile',
    iconName: 'UserCircle',
    description: 'Manage your clinic/doctor profile.',
    iconColorClass: 'text-foreground', // Default color
};
