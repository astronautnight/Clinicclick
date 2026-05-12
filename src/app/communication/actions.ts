
'use server';

import type { WhatsappMessage } from "@/services/whatsapp";
import { sendWhatsappMessage } from "@/services/whatsapp";

export interface SendWhatsAppResult {
  success: boolean;
  message: string;
  title: string;
  variant?: 'default' | 'destructive';
}

export async function handleSendWhatsAppAction(formData: FormData): Promise<SendWhatsAppResult> {
  const phoneNumber = formData.get("phoneNumber") as string;
  const messageText = formData.get("message") as string;

  if (!phoneNumber || phoneNumber.trim() === "" ) {
    return { 
      success: false, 
      title: "Input Error", 
      message: "Phone number is required and cannot be empty.", 
      variant: "destructive" 
    };
  }
  if (!messageText || messageText.trim() === "") {
     return { 
      success: false, 
      title: "Input Error", 
      message: "Message text is required and cannot be empty.", 
      variant: "destructive" 
    };
  }

  const whatsappMessage: WhatsappMessage = { phoneNumber: phoneNumber.trim(), message: messageText.trim() };
  try {
    // In a real app, sendWhatsappMessage would interact with an actual WhatsApp API
    // For now, it's a mock that returns true.
    const success = await sendWhatsappMessage(whatsappMessage);
    if (success) {
      return { 
        success: true, 
        title: "Message Sent (Mock)", 
        message: "WhatsApp message has been processed (mocked)." 
      };
    } else {
      // This path might be taken if the mock sendWhatsappMessage was designed to sometimes fail
      console.error("Failed to send WhatsApp message via service.");
      return { 
        success: false, 
        title: "Sending Failed", 
        message: "The WhatsApp message could not be sent by the service.", 
        variant: "destructive" 
      };
    }
  } catch (error) {
    console.error("Error in handleSendWhatsAppAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { 
      success: false, 
      title: "Processing Error", 
      message: `An error occurred while trying to send the message: ${errorMessage}. Please try again.`, 
      variant: "destructive" 
    };
  }
}
