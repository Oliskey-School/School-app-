
import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, Token } from '@capacitor/push-notifications';
import { supabase } from '../supabase';
import { showNotification } from '../../components/shared/notifications';

/**
 * Mobile Push Notification Manager
 * 
 * Handles registration and event listeners for Native Push Notifications (FCM/APNS).
 * Bridges the gap between Capacitor Push and the User's notification logic.
 */

export class PushNotificationManager {

    static async initialize() {
        if (!Capacitor.isNativePlatform()) {
            console.log('🌐 Web Platform detected - skipping Native Push Init');
            return;
        }

        console.log('📱 Initializing Native Push Notifications');

        try {
            // 1. Request Permission
            const result = await PushNotifications.requestPermissions();

            if (result.receive === 'granted') {
                // 2. Register with Apple / Google
                await PushNotifications.register();
            } else {
                console.warn('📱 Push permission denied');
            }
        } catch (e) {
            console.error('Failed to initialize push notifications', e);
        }

        this.setupListeners();
    }

    private static setupListeners() {
        // On success, we get a token (FCM Token or APNS Token)
        PushNotifications.addListener('registration', (token: Token) => {
            console.log('📱 Push Registration Success. Token:', token.value);
            this.saveTokenToBackend(token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('📱 Push Registration Error: ' + JSON.stringify(error));
        });

        // Show notification when app is open (Foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('📱 Push Received (Foreground):', notification);

            // Show a local toast/banner so the user sees it even if in-app
            showNotification(notification.title || 'New Notification', {
                body: notification.body,
                data: notification.data
            });
        });

        // Handle Deep Linking when user taps notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('📱 Push Action Performed:', notification);

            const data = notification.notification.data;
            if (data && data.url) {
                // Deep Link Logic
                // Use window.location or React Router navigation
                // Note: Need access to Router or Window here
                window.location.href = data.url;
            }
        });
    }

    /**
     * Save the device token to Supabase for the current user
     */
    private static async saveTokenToBackend(token: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Upsert into a 'user_devices' table (assumed structure)
            const { error } = await supabase
                .from('user_devices')
                .upsert({
                    user_id: user.id,
                    token: token,
                    platform: Capacitor.getPlatform(), // 'ios' or 'android'
                    last_active: new Date().toISOString()
                }, { onConflict: 'token' });

            if (error) console.error('Failed to save push token to backend', error);

        } catch (err) {
            console.error('Error saving push token', err);
        }
    }
}
