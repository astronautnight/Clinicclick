
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    
    // This is to make the error visible in Next.js error overlays during development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        setTimeout(() => {
            const event = new ErrorEvent('error', {
                error: this,
                message: this.message,
            });
            window.dispatchEvent(event);
        }, 0);
    }
  }
}
