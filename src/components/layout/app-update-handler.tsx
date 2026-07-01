'use client';

import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { isAndroid as checkIsAndroid, getAppUpdate } from '@/lib/capacitor-plugins';

export function AppUpdateHandler() {
  const { toast } = useToast();

  useEffect(() => {
    if (!checkIsAndroid()) {
      return;
    }

    const AppUpdate = getAppUpdate();
    if (!AppUpdate) {
      console.error('AppUpdate: Plugin is not available on Android.');
      return;
    }

    const checkAndPerformUpdates = async () => {
      try {
        console.log('AppUpdate: Checking for updates...');
        const info = await AppUpdate.getAppUpdateInfo();
        console.log('AppUpdate: Update info received:', info);

        // AppUpdateAvailability.UPDATE_AVAILABLE is 2
        if (info.updateAvailability === 2) {
          console.log('AppUpdate: An update is available.');

          // Check update priority (typically ranges from 0 to 5)
          const priority = info.updatePriority ?? 0;

          // If immediate update is allowed and update priority is high (4 or 5)
          // or if flexible update is not allowed, trigger immediate (force) flow.
          if (info.immediateUpdateAllowed && (priority >= 4 || !info.flexibleUpdateAllowed)) {
            console.log('AppUpdate: Starting immediate (force) update flow...');
            await AppUpdate.performImmediateUpdate();
          } else if (info.flexibleUpdateAllowed) {
            console.log('AppUpdate: Starting flexible update flow...');

            // Listen for flexible update state change
            await AppUpdate.addListener(
              'onFlexibleUpdateStateChange',
              (state: any) => {
                console.log('AppUpdate: Flexible update state changed:', state);
                // FlexibleUpdateInstallStatus.DOWNLOADED is 11
                if (state.installStatus === 11) {
                  console.log('AppUpdate: Update downloaded successfully.');

                  // Notify the user via a Toast with an action button to restart and complete update
                  toast({
                    title: 'Update Ready',
                    description: 'The update has been downloaded. Restart the app to apply it.',
                    action: (
                      <ToastAction
                        altText="Restart"
                        onClick={async () => {
                          try {
                            await AppUpdate.completeFlexibleUpdate();
                          } catch (err) {
                            console.error('AppUpdate: Failed to complete flexible update', err);
                          }
                        }}
                      >
                        Restart
                      </ToastAction>
                    ),
                  });
                }
              }
            );

            await AppUpdate.startFlexibleUpdate();
          }
        } else if (info.updateAvailability === 3) {
          // AppUpdateAvailability.UPDATE_IN_PROGRESS is 3
          console.log('AppUpdate: Update in progress. Resuming immediate update if allowed...');
          if (info.immediateUpdateAllowed) {
            await AppUpdate.performImmediateUpdate();
          }
        } else {
          console.log('AppUpdate: App is up to date.');
        }
      } catch (error) {
        console.error('AppUpdate: Error during update check/flow:', error);
      }
    };

    checkAndPerformUpdates();
  }, [toast]);

  return null;
}
