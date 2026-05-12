'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UsersRound, BookUser } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ConsultsAcademicsHub() {
  const features = [
    {
      title: "Consultation Management",
      description: "Manage patients, appointments, and financials for external consultations.",
      href: "/consultation-dashboard",
      icon: UsersRound,
      colorClasses: "hover:border-accent text-accent"
    },
    {
      title: "Academics & Students",
      description: "Manage student postings, case histories, and academic progress.",
      href: "/academics",
      icon: BookUser,
      colorClasses: "hover:border-special1 text-special1"
    }
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Consults & Academics Hub</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link href={feature.href} key={feature.title} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
              <Card className={cn("hover:shadow-lg transition-shadow duration-300 h-full flex flex-col", feature.colorClasses)}>
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                  <div className={cn("p-3 rounded-lg", feature.title === "Consultation Management" ? "bg-accent/10" : "bg-special1/10")}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-card-foreground">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
