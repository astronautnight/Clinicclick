
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect } from "react";
import { MessageSquare, Send, RadioTower, Users, Beaker, Truck, PlusCircle, Edit, Trash2 } from "lucide-react";
import { handleSendWhatsAppAction, type SendWhatsAppResult } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const whatsappTemplates = [
  { id: "reminder", text: "Dear {patientName}, this is a friendly reminder for your dental appointment on {date} at {time}. Clinic@Click." },
  { id: "followup", text: "Dear {patientName}, we hope you are recovering well after your recent procedure. Please contact us if you have any concerns. Clinic@Click." },
  { id: "birthday", text: "Happy Birthday, {patientName}! Wishing you a day filled with smiles. From all of us at Clinic@Click." },
  { id: "post_extraction", text: "Dear {patientName}, post-extraction care: 1. Bite firmly on the gauze for 30-45 mins. 2. Do not spit, rinse, or use a straw for 24 hours. 3. Stick to soft, cool foods. 4. Apply an ice pack to the cheek for 15 mins on/off to reduce swelling. 5. Take medication as prescribed. Contact us for persistent bleeding. Clinic@Click." },
  { id: "post_implant", text: "Dear {patientName}, post-implant surgery care: 1. Avoid disturbing the area. 2. Apply ice packs externally to manage swelling. 3. Eat soft foods only. 4. Start gentle saltwater rinses after 24 hours. 5. Take all prescribed medications, especially antibiotics, as directed. Report any unusual pain or swelling. Clinic@Click." },
  { id: "post_root_canal", text: "Dear {patientName}, after your root canal: 1. It's normal for the tooth to be sensitive for a few days. Avoid chewing on the treated side. 2. Take pain relievers as recommended. 3. Be sure to schedule your follow-up for the permanent restoration (crown/filling). A temporary filling is not permanent. Contact us if you have severe pain or swelling. Clinic@Click." },
  { id: "post_gingival_surgery", text: "Dear {patientName}, after your gum surgery: 1. Some bleeding and swelling is normal. 2. A surgical dressing (pack) may be present; try not to disturb it. 3. Eat only soft foods and avoid the surgical area. 4. Rinse gently with prescribed medicated mouthwash starting tomorrow. 5. Avoid strenuous activity for a few days. Clinic@Click." },
  { id: "post_sinus_lift", text: "Dear {patientName}, for your sinus lift recovery: 1. CRITICAL: Do not blow your nose. Sneeze with your mouth open to avoid sinus pressure. 2. Take all prescribed antibiotics and decongestants. 3. Some bleeding from the nose is possible; do not be alarmed. 4. Sleep with your head elevated. 5. Follow a soft diet. Contact us immediately for any concerns. Clinic@Click." },
  { id: "post_op_general", text: "Dear {patientName}, general post-operative instructions: 1. Rest for the remainder of the day. 2. Take prescribed medications as directed. 3. For mild discomfort, you can take an over-the-counter pain reliever. 4. Eat soft foods and stay hydrated. 5. Avoid smoking and alcohol as they can impair healing. Call us if you have any concerns. Clinic@Click." },
  { id: "custom", text: "" }, // For custom messages
];

const mockPatientsSimple = [
    { id: "p1", name: "Alice Smith", phone: "+919876543210" },
    { id: "p2", name: "Bob Johnson", phone: "+919123456789" },
];

interface Contact {
    id: string;
    name: string;
    email: string;
    phone?: string;
}

const initialContactFormData: Omit<Contact, 'id'> = { name: '', email: '', phone: '' };

export default function CommunicationPage() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [labs, setLabs] = useState<Contact[]>([]);
  const [dealers, setDealers] = useState<Contact[]>([]);
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactType, setContactType] = useState<'lab' | 'dealer' | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactFormData, setContactFormData] = useState(initialContactFormData);
  const [contactToDelete, setContactToDelete] = useState<Contact & { type: 'lab' | 'dealer' } | null>(null);

  useEffect(() => {
    // Mock initial data
    setLabs([
        { id: "lab1", name: "Precision Dental Lab", email: "orders@precisionlab.com", phone: "555-1111" },
        { id: "lab2", name: "Aesthetic Creations", email: "contact@aestheticcreations.com", phone: "555-2222" },
    ]);
    setDealers([
        { id: "d1", name: "Modern Dental Supplies", email: "sales@moderndental.com", phone: "555-3333" },
        { id: "d2", name: "Alpha Dental Equipment", email: "support@alphadental.com", phone: "555-4444" },
    ]);
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = whatsappTemplates.find(t => t.id === templateId);
    let personalizedMessage = template ? template.text : '';
    
    if (selectedPatientId && templateId !== 'custom') {
        const patient = mockPatientsSimple.find(p => p.id === selectedPatientId);
        if (patient) {
            setPhoneNumber(patient.phone);
            personalizedMessage = personalizedMessage
                .replace('{patientName}', patient.name)
                .replace('{date}', new Date().toLocaleDateString())
                .replace('{time}', '10:00 AM');
        }
    }
    setMessage(personalizedMessage);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = mockPatientsSimple.find(p => p.id === patientId);
    if (patient) {
        setPhoneNumber(patient.phone);
        if (selectedTemplateId && selectedTemplateId !== 'custom') {
            const currentTemplate = whatsappTemplates.find(t => t.id === selectedTemplateId);
            if (currentTemplate) {
                 let personalizedMessage = currentTemplate.text
                    .replace('{patientName}', patient.name)
                    .replace('{date}', new Date().toLocaleDateString()) 
                    .replace('{time}', '10:00 AM');
                setMessage(personalizedMessage);
            }
        }
    } else {
        setPhoneNumber('');
        const template = whatsappTemplates.find(t => t.id === selectedTemplateId);
        setMessage(template && template.id !== 'custom' ? template.text : '');
    }
  };

  const clientSideSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result: SendWhatsAppResult = await handleSendWhatsAppAction(formData);
    toast({
      title: result.title,
      description: result.message,
      variant: result.variant || (result.success ? 'default' : 'destructive'),
    });
    setIsSubmitting(false);
  };
  
  const handleGenericSubmit = (e: FormEvent<HTMLFormElement>, type: 'Lab' | 'Dealer') => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const contactEmail = formData.get('contactEmail');
    const subject = formData.get('subject');
    const message = formData.get('message');
    console.log(`Sending message to ${type}:`, { contactEmail, subject, message });
    toast({
        title: `Message to ${type} Sent (Mock)`,
        description: `Your message to ${contactEmail} has been processed.`
    });
    setTimeout(() => setIsSubmitting(false), 1000);
  }
  
  const openContactForm = (type: 'lab' | 'dealer', contact: Contact | null) => {
    setContactType(type);
    setEditingContact(contact);
    setContactFormData(contact ? { name: contact.name, email: contact.email, phone: contact.phone || '' } : initialContactFormData);
    setIsContactFormOpen(true);
  };

  const handleContactFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contactType) return;
    
    if (editingContact) { // Editing
      const updater = (prev: Contact[]) => prev.map(c => c.id === editingContact.id ? { ...c, ...contactFormData } : c);
      if (contactType === 'lab') setLabs(updater); else setDealers(updater);
      toast({ title: "Contact Updated", description: `${contactFormData.name} has been updated.`});
    } else { // Adding
      const newContact = { ...contactFormData, id: `${contactType}-${Date.now()}`};
      const updater = (prev: Contact[]) => [...prev, newContact];
      if (contactType === 'lab') setLabs(updater); else setDealers(updater);
      toast({ title: "Contact Added", description: `${contactFormData.name} has been added.`});
    }
    setIsContactFormOpen(false);
  }
  
  const handleContactDelete = () => {
    if (!contactToDelete) return;
    const updater = (prev: Contact[]) => prev.filter(c => c.id !== contactToDelete.id);
    if (contactToDelete.type === 'lab') setLabs(updater); else setDealers(updater);
    toast({ title: "Contact Deleted", description: `${contactToDelete.name} has been removed.`, variant: "destructive" });
    setContactToDelete(null);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <MessageSquare className="mr-3 h-8 w-8 text-info" />
        Communication Center
      </h1>
      
      <Tabs defaultValue="patients" className="w-full">
        <div className="flex justify-center">
            <TabsList>
              <TabsTrigger value="patients"><Users className="mr-2 h-4 w-4" /> Patients</TabsTrigger>
              <TabsTrigger value="labs"><Beaker className="mr-2 h-4 w-4" /> Dental Labs</TabsTrigger>
              <TabsTrigger value="dealers"><Truck className="mr-2 h-4 w-4" /> Dealers/Suppliers</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="patients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Send className="mr-2 h-5 w-5 text-primary"/> Send WhatsApp Message</CardTitle>
              <CardDescription>Compose and send standardized or custom messages to your patients via WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={clientSideSubmit} className="space-y-6">
                 <div>
                  <Label htmlFor="patientSelect">Select Patient (Optional)</Label>
                  <Select value={selectedPatientId} onValueChange={handlePatientChange} disabled={isSubmitting}>
                    <SelectTrigger id="patientSelect">
                      <SelectValue placeholder="Select a patient to auto-fill details" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPatientsSimple.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Patient Phone Number</Label>
                  <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="e.g., +919876543210" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required className="mt-1" disabled={isSubmitting} />
                </div>
                <div>
                  <Label htmlFor="templateSelect">Message Template</Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange} disabled={isSubmitting}>
                    <SelectTrigger id="templateSelect">
                      <SelectValue placeholder="Select a template or choose custom" />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.id === 'custom' ? 'Custom Message' : t.text.substring(0,50)+'...'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" placeholder="Type your message here or select a template..." value={message} onChange={e => setMessage(e.target.value)} required className="mt-1 min-h-[120px]" disabled={isSubmitting}/>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send WhatsApp Message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="labs" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Contact Dental Labs</CardTitle>
                    <CardDescription>Send new case instructions, queries, or follow-ups to your dental labs.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => handleGenericSubmit(e, 'Lab')} className="space-y-6">
                        <div>
                            <Label htmlFor="labSelect">Select Lab</Label>
                            <Select name="contactEmail" required disabled={isSubmitting}>
                                <SelectTrigger><SelectValue placeholder="Select a lab" /></SelectTrigger>
                                <SelectContent>{labs.map(l => <SelectItem key={l.id} value={l.email}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="labSubject">Subject</Label>
                            <Input id="labSubject" name="subject" placeholder="e.g., Case #1234 - PFM Crown" required disabled={isSubmitting} />
                        </div>
                        <div>
                            <Label htmlFor="labMessage">Message</Label>
                            <Textarea id="labMessage" name="message" placeholder="Include all necessary details, patient ID (anonymized), shade, and required delivery date..." className="min-h-[150px]" required disabled={isSubmitting} />
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Send Message to Lab'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="dealers" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Contact Dealers & Suppliers</CardTitle>
                    <CardDescription>Place new orders, inquire about products, or request service from your suppliers.</CardDescription>
                </CardHeader>
                <CardContent>
                     <form onSubmit={(e) => handleGenericSubmit(e, 'Dealer')} className="space-y-6">
                        <div>
                            <Label htmlFor="dealerSelect">Select Dealer/Supplier</Label>
                            <Select name="contactEmail" required disabled={isSubmitting}>
                                <SelectTrigger><SelectValue placeholder="Select a dealer" /></SelectTrigger>
                                <SelectContent>{dealers.map(d => <SelectItem key={d.id} value={d.email}>{d.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="dealerSubject">Subject</Label>
                            <Input id="dealerSubject" name="subject" placeholder="e.g., Inquiry about Bulk Order Discount" required disabled={isSubmitting} />
                        </div>
                        <div>
                            <Label htmlFor="dealerMessage">Message</Label>
                            <Textarea id="dealerMessage" name="message" placeholder="List the items, quantities, and any specific questions you have..." className="min-h-[150px]" required disabled={isSubmitting} />
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                           {isSubmitting ? 'Sending...' : 'Send Message to Dealer'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><RadioTower className="mr-2 h-5 w-5 text-accent" /> Contact Lists</CardTitle>
            </div>
            <CardDescription>Manage your list of labs and suppliers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Dental Labs</h3>
                    <Button variant="outline" size="sm" onClick={() => openContactForm('lab', null)}><PlusCircle className="mr-2 h-4 w-4"/>Add Lab</Button>
                </div>
                <Card>
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {labs.map(lab => (
                                <TableRow key={lab.id}>
                                    <TableCell className="font-medium">{lab.name}</TableCell>
                                    <TableCell>{lab.email}</TableCell>
                                    <TableCell>{lab.phone || 'N/A'}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => openContactForm('lab', lab)}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => setContactToDelete({ ...lab, type: 'lab' })}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
             <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Dealers & Suppliers</h3>
                    <Button variant="outline" size="sm" onClick={() => openContactForm('dealer', null)}><PlusCircle className="mr-2 h-4 w-4"/>Add Dealer</Button>
                </div>
                 <Card>
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dealers.map(dealer => (
                                <TableRow key={dealer.id}>
                                    <TableCell className="font-medium">{dealer.name}</TableCell>
                                    <TableCell>{dealer.email}</TableCell>
                                    <TableCell>{dealer.phone || 'N/A'}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => openContactForm('dealer', dealer)}><Edit className="h-4 w-4"/></Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => setContactToDelete({ ...dealer, type: 'dealer' })}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                         </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </CardContent>
      </Card>
      
      {/* Universal Dialog for Add/Edit Contact */}
      <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingContact ? 'Edit' : 'Add'} {contactType === 'lab' ? 'Lab' : 'Dealer/Supplier'}</DialogTitle>
                <DialogDescription>Fill in the contact details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContactFormSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="contactName">Name *</Label>
                    <Input id="contactName" value={contactFormData.name} onChange={e => setContactFormData({...contactFormData, name: e.target.value})} required/>
                </div>
                <div>
                    <Label htmlFor="contactEmail">Email *</Label>
                    <Input id="contactEmail" type="email" value={contactFormData.email} onChange={e => setContactFormData({...contactFormData, email: e.target.value})} required/>
                </div>
                <div>
                    <Label htmlFor="contactPhone">Phone (Optional)</Label>
                    <Input id="contactPhone" value={contactFormData.phone || ''} onChange={e => setContactFormData({...contactFormData, phone: e.target.value})} />
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">{editingContact ? 'Save Changes' : 'Add Contact'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      {/* Universal Alert Dialog for Delete */}
       <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the contact "{contactToDelete?.name}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleContactDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
