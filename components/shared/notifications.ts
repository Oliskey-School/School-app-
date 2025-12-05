/**
 * Requests permission from the user to show web notifications.
 * @returns {Promise<boolean>} A promise that resolves to true if permission is granted, false otherwise.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.error("This browser does not support desktop notifications.");
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            return true;
        }
    }
    
    return false;
};

/**
 * Displays a system notification if permission has been granted.
 * @param {string} title - The title of the notification.
 * @param {NotificationOptions} options - The options for the notification (e.g., body, icon).
 */
export const showNotification = (title: string, options: NotificationOptions) => {
    if (Notification.permission === 'granted') {
        // In a real application with a service worker, you would use:
        // navigator.serviceWorker.getRegistration().then(registration => {
        //   registration?.showNotification(title, options);
        // });
        // For this simulation, we use the client-side Notification API directly.
        new Notification(title, options);
    }
};
