/**
 * Interface representing a WhatsApp message.
 */
export interface WhatsappMessage {
  /**
   * The recipient's phone number.
   */
  phoneNumber: string;
  /**
   * The message content.
   */
  message: string;
}

/**
 * Sends a WhatsApp message.
 *
 * @param message The WhatsApp message to send.
 * @returns A promise that resolves to true if the message was sent successfully, false otherwise.
 */
export async function sendWhatsappMessage(message: WhatsappMessage): Promise<boolean> {
  // TODO: Implement this by calling an API.
  console.log(`Sending WhatsApp message to ${message.phoneNumber}: ${message.message}`);
  return true;
}
