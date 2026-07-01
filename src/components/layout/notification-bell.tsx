'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellOff, 
  CalendarDays, 
  UserPlus, 
  Check,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: any;
  read: boolean;
  type: 'appointment' | 'join_request';
}

export function NotificationBell() {
  const { user } = useUser();
  const db = useFirestore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Subscribe to notifications preference & list
  useEffect(() => {
    if (!db || !user) return;

    // A. Subscribe to user profile settings
    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setNotificationsEnabled(snap.data().notificationsEnabled !== false);
      }
    });

    // B. Subscribe to last 20 notifications
    const colRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(20));
    
    const unsubNotifs = onSnapshot(q, (snap) => {
      const list: AppNotification[] = [];
      let unread = 0;
      
      snap.docs.forEach((d) => {
        const data = d.data();
        const item: AppNotification = {
          id: d.id,
          title: data.title || '',
          body: data.body || '',
          createdAt: data.createdAt,
          read: !!data.read,
          type: data.type || 'appointment',
        };
        list.push(item);
        if (!item.read) {
          unread++;
        }
      });
      
      setNotifications(list);
      setUnreadCount(unread);
    }, (error) => {
      console.warn("Could not load notifications list:", error);
    });

    return () => {
      unsubProfile();
      unsubNotifs();
    };
  }, [db, user]);

  // 2. Toggle notifications status (mute/unmute)
  const handleToggleNotifications = async (checked: boolean) => {
    if (!db || !user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationsEnabled: checked,
      });
    } catch (error) {
      console.error("Failed to toggle notification mute state:", error);
    }
  };

  // 3. Mark single notification as read
  const handleMarkRead = async (id: string) => {
    if (!db || !user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'notifications', id);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // 4. Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!db || !user || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const docRef = doc(db, 'users', user.uid, 'notifications', n.id);
          batch.update(docRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join_request':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'appointment':
      default:
        return <CalendarDays className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          {notificationsEnabled ? (
            <>
              <Bell className="h-[1.2rem] w-[1.2rem] text-slate-700 dark:text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </>
          ) : (
            <BellOff className="h-[1.2rem] w-[1.2rem] text-red-500 hover:text-red-600" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0 dark:bg-[#2A2A2A] dark:border-[#3D3D3D]">
        {/* Popover Header */}
        <div className="flex items-center justify-between border-b p-4 dark:border-[#3D3D3D]">
          <h2 className="font-semibold text-sm">Notifications</h2>
          <div className="flex items-center space-x-2">
            <Label htmlFor="mute-switch" className="text-xs text-muted-foreground">Mute</Label>
            <Switch 
              id="mute-switch"
              checked={!notificationsEnabled}
              onCheckedChange={(checked) => handleToggleNotifications(!checked)}
            />
          </div>
        </div>

        {/* Scrollable list */}
        <ScrollArea className="h-72">
          {!notificationsEnabled ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-xs text-muted-foreground">
              <BellOff className="h-8 w-8 text-red-400 mb-2" />
              <p className="font-medium">Notifications are currently muted.</p>
              <p className="mt-1">Turn off "Mute" above to receive alerts.</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-xs text-muted-foreground">
              <Bell className="h-8 w-8 text-slate-300 mb-2" />
              <p>You have no notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-[#3D3D3D]">
              {notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`flex gap-3 p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#3A3A3A] cursor-pointer ${
                    !n.read ? 'bg-slate-50/50 dark:bg-[#323232]' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-1.5 rounded-full bg-slate-100 dark:bg-[#1A1A1A]">
                      {getNotificationIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-grow space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <p className={`font-semibold text-slate-800 dark:text-white ${!n.read ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                        {n.title}
                      </p>
                      {n.createdAt && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-[#A0A0A0] leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="flex-shrink-0 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notificationsEnabled && notifications.length > 0 && (
          <div className="border-t p-2 flex justify-center dark:border-[#3D3D3D]">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-[#60A5FA] dark:hover:text-[#93C5FD] dark:hover:bg-[#1E3A8A] w-full"
            >
              <CheckCheck className="mr-2 h-3.5 w-3.5" />
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
