// src/lib/validators.ts

export function validateClinicPasscode(passcode: string) {
    const errors: string[] = [];
  
    if (passcode.length < 12) {
      errors.push("Passcode must be at least 12 characters long.");
    }
    if (!/[A-Z]/.test(passcode)) {
      errors.push("Passcode must contain at least one uppercase letter (A-Z).");
    }
    if (!/[a-z]/.test(passcode)) {
      errors.push("Passcode must contain at least one lowercase letter (a-z).");
    }
    if (!/[0-9]/.test(passcode)) {
      errors.push("Passcode must contain at least one digit (0-9).");
    }
    if (!/[@#$%&*!?]/.test(passcode)) {
      errors.push("Passcode must contain at least one special character (@ # $ % & * ! ?).");
    }
  
    return {
      ok: errors.length === 0,
      errors,
    };
  }
  