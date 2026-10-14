declare module "@capacitor-firebase/crashlytics" {
  export const FirebaseCrashlytics: {
    crash: (options?: { message?: string }) => Promise<void>;
    setEnabled: (options: { enabled: boolean }) => Promise<void>;
    setUserId?: (options: { userId: string }) => Promise<void>;
    log?: (options: { message: string }) => Promise<void>;
    recordException?: (options: { message: string }) => Promise<void>;
  };
}
