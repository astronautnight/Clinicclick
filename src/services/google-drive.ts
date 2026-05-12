/**
 * Interface for Google Drive file metadata.
 */
export interface GoogleDriveFile {
  /**
   * The ID of the file in Google Drive.
   */
  id: string;
  /**
   * The name of the file.
   */
  name: string;
  /**
   * The MIME type of the file.
   */
  mimeType: string;
}

/**
 * Backs up data to Google Drive.
 *
 * @param data The data to backup.
 * @param filename The name of the file to create in Google Drive.
 * @returns A promise that resolves to the GoogleDriveFile metadata.
 */
export async function backupToGoogleDrive(data: string, filename: string): Promise<GoogleDriveFile> {
  // TODO: Implement this by calling an API.
  console.log(`Backing up data to Google Drive as ${filename}`);

  return {
    id: '1234567890',
    name: filename,
    mimeType: 'text/plain',
  };
}
