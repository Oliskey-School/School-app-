/**
 * Push Notification Service
 * Handles FCM token registration, notification permissions, and message listening
 */

// import { getToken, onMessage } from 'firebase/messaging'; // REMOVED: Firebase not installed
import { messaging } from './firebase';
import { supabase } from './supabase';

// Mock Firebase functions
const getToken = async (messaging: any, options: any) => null;
const onMessage = (messaging: any, callback: any) => { return () => {}; };


const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    tag?: string;
    requireInteraction?: boolean;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return null;
        }

        // Check if messaging is available
        if (!messaging) {
            console.warn('Firebase messaging not initialized');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY
        });

        if (token) {
            // Save token to user profile
            await saveFCMToken(token);
            return token;
        }

        return null;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
}

/**
 * Save FCM token to user profile
 */
async function saveFCMToken(token: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        await supabase
            .from('profiles')
            .update({ fcm_token: token })
            .eq('id', user.id);

        console.log('FCM token saved successfully');
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

/**
 * Listen for foreground messages
 */
export function listenForMessages(callback: (payload: NotificationPayload) => void): (() => void) | null {
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload: any) => {
        console.log('Foreground message received:', payload);

        const notification: NotificationPayload = {
            title: payload.notification?.title || 'New Notification',
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            data: payload.data,
            tag: payload.data?.tag,
            requireInteraction: payload.data?.urgency === 'emergency'
        };

        callback(notification);

        // Show notification if browser supports it
        if ('Notification' in window && Notification.permission === 'granted') {
            showNotification(notification);
        }
    });

    return unsubscribe;
}

/**
 * Show browser notification
 */
export function showNotification(notification: NotificationPayload): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    const notif = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction,
        data: notification.data,
        vibrate: [200, 100, 200]
    } as any); // Cast to any to avoid TS error about vibrate

    // Handle notification click
    notif.onclick = (event) => {
        event.preventDefault();

        // Focus window
        window.focus();

        // Navigate to URL if provided
        if (notification.data?.url) {
            window.location.href = notification.data.url;
        }

        notif.close();
    };
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
    return (
        'Notification' in window &&
        Notification.permission === 'granted'
    );
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
    if (!('Notification' in window)) return null;
    return Notification.permission;
}

/**
 * Unsubscribe from notifications (remove token)
 */
export async function unsubscribeFromNotifications(): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        await supabase
            .from('profiles')
            .update({ fcm_token: null })
            .eq('id', user.id);

        console.log('Unsubscribed from notifications');
    } catch (error) {
        console.error('Error unsubscribing:', error);
    }
}

/**
 * Test notification (for debugging)
 */
export function testNotification(): void {
    showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from SchoolApp',
        icon: '/icons/icon-192.png',
        data: { test: true }
    });
}
