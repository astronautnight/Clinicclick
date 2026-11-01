
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile } from "@/types";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Trash2, PlusCircle, UserCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useUser } from "@/firebase";
import { getProfile, updateProfile, deleteProfile } from "@/services/profile-service";
import { getClinic } from "@/services/clinic-service";


const profileFormSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  clinicName: z.string().optional(),
  email: z.string().email("Invalid email address."),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  specialization: z.string().optional(),
  registrationNumber: z.string().optional(),
  yearsOfExperience: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().nullable().optional()
  ),
  certifications: z.array(z.object({ value: z.string() })).optional(),
  awards: z.array(z.object({ value: z.string() })).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function formatProfileToFormValues(
  p: UserProfile,
  clinicNameVal: string,
  userFallback?: { email?: string | null; displayName?: string | null } | null
): ProfileFormValues {
  return {
    displayName: p.displayName || userFallback?.displayName || "",
    clinicName: clinicNameVal || "",
    email: p.email || userFallback?.email || "",
    phoneNumber: p.phoneNumber || "",
    address: p.address || "",
    specialization: p.specialization || "",
    registrationNumber: p.registrationNumber || "",
    yearsOfExperience: p.yearsOfExperience ?? null,
    certifications: p.certifications?.map((c) => ({ value: c })) || [],
    awards: p.awards?.map((a) => ({ value: a })) || [],
  };
}

export default function ProfilePage() {
  const db = useFirestore();
  const { user, clinicId } = useUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [clinicName, setClinicName] = useState("");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      clinicName: "",
      email: "",
      phoneNumber: "",
      address: "",
      specialization: "",
      registrationNumber: "",
      yearsOfExperience: null,
      certifications: [],
      awards: [],
    },
  });

  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  const { fields: awardFields, append: appendAward, remove: removeAward } = useFieldArray({
    control: form.control,
    name: "awards",
  });

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      if (!db || !user) return;

      setIsLoading(true);
      const fetched = await getProfile(db, user);
      
      let resolvedClinicName = "";
      if (clinicId) {
        const clinicData = await getClinic(clinicId);
        if (clinicData) {
            resolvedClinicName = clinicData.name;
            setClinicName(clinicData.name);
            form.setValue('clinicName', clinicData.name);
        }
      }

      if (fetched) {
        setProfile(fetched);
        form.reset(formatProfileToFormValues(fetched, resolvedClinicName || clinicName, user));
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [db, user, clinicId, form, clinicName]);

  // Save profile
  async function onSubmit(data: ProfileFormValues) {
    try {
      setIsLoading(true);

      const payload: Partial<UserProfile> = {
        displayName: data.displayName,
        phoneNumber: data.phoneNumber || "",
        address: data.address || "",
        specialization: data.specialization || "",
        registrationNumber: data.registrationNumber || "",
        yearsOfExperience: data.yearsOfExperience ?? null,
        certifications: data.certifications?.map((c) => c.value) || [],
        awards: data.awards?.map((a) => a.value) || [],
      };

      const updated = await updateProfile(db, user, payload);

      setProfile(updated);

      form.reset(formatProfileToFormValues(updated, clinicName, user));

      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteProfile() {
    if (!profile) return;
    if (!confirm("Delete profile permanently?")) return;

    try {
      setIsLoading(true);
      await deleteProfile(db, user);
      setProfile(null);
      form.reset();
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading && !profile) return <p>Loading profile...</p>;

  const currentCerts = form.watch("certifications");
  const currentAwards = form.watch("awards");

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <UserCircle className="mr-3 h-8 w-8 text-foreground" />
          Profile
        </h1>
      {/* PROFILE CARD */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Clinic / Doctor Profile</CardTitle>
          <CardDescription>{isEditing ? "Edit your profile." : "View your profile."}</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              
              {/* Avatar */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 ring-2 ring-primary ring-offset-2">
                  <AvatarImage src={profile?.photoURL || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile?.displayName?.substring(0, 2).toUpperCase() || "CC"}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* BASIC INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Name</FormLabel>
                      <FormControl><Input {...field} disabled /></FormControl>
                      <FormDescription>Clinic name is managed from the 'My Clinic' page.</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor Name</FormLabel>
                      <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                       <FormDescription>This is your public display name.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              {/* EMAIL & PHONE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} disabled /></FormControl>
                      <FormDescription>Your login email cannot be changed.</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* ADDRESS */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Textarea {...field} disabled={!isEditing} /></FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              {/* SPECIALIZATION + EXP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          disabled={!isEditing}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* CERTIFICATIONS */}
              <div>
                <FormLabel>Certifications</FormLabel>

                {isEditing ? (
                  <div className="space-y-2">
                    {certFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormControl><Input {...field} placeholder={`Certification #${index + 1}`} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeCert(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => appendCert({ value: "" })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Certification
                    </Button>
                  </div>
                ) : (
                  <ul className="list-disc list-inside mt-1">
                    {currentCerts?.length
                      ? currentCerts.map((c, i) => <li key={i}>{c.value}</li>)
                      : <li>No certifications</li>}
                  </ul>
                )}
              </div>

              {/* AWARDS */}
              <div>
                <FormLabel>Awards</FormLabel>

                {isEditing ? (
                  <div className="space-y-2">
                    {awardFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`awards.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormControl><Input {...field} placeholder={`Award #${index + 1}`} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeAward(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => appendAward({ value: "" })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Award
                    </Button>
                  </div>
                ) : (
                  <ul className="list-disc list-inside mt-1">
                    {currentAwards?.length
                      ? currentAwards.map((a, i) => <li key={i}>{a.value}</li>)
                      : <li>No awards</li>}
                  </ul>
                )}
              </div>

            </CardContent>

            <CardFooter className="flex justify-between">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        form.reset(formatProfileToFormValues(profile, clinicName, user));
                      }
                    }}
                  >
                    Cancel
                  </Button>

                  <Button type="submit">{isLoading ? "Saving..." : "Save Changes"}</Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}

              {profile && !isEditing && (
                <Button type="button" variant="destructive" onClick={handleDeleteProfile}>
                  {isLoading ? "Deleting..." : "Delete Profile"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
