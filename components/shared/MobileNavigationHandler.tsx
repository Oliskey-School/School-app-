
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Mobile Navigation Handler
 * 
 * This component acts as a bridge between the Android Hardware Back Button
 * and the React Router DOM history stack.
 * 
 * It ensures that pressing the physical back button:
 * 1. Navigates back in history if possible (Stack Preservation).
 * 2. Exits the app if at the root/dashboard home (Contextual Logic).
 */

const MobileNavigationHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Only run on Native Platforms (Android/iOS)
        if (!Capacitor.isNativePlatform()) return;

        console.log('📱 Registering Hardware Back Button Listener');

        const subscription = App.addListener('backButton', ({ canGoBack }) => {
            const currentPath = location.pathname;

            // 1. Definition of "Root" paths where back button should Exit/Background the app
            const rootPaths = ['/', '/login', '/dashboard'];
            const isRoot = rootPaths.includes(currentPath);

            // 2. Contextual Logic
            // If there is history to go back to AND we are not at a root path
            if (!isRoot) {
                console.log('📱 Navigate Back (-1)');
                navigate(-1);
            } else {
                // 3. Exit App (or Minimize)
                console.log('📱 Exiting App (Root Reached)');
                App.exitApp();
            }
        });

        // Cleanup subscription
        return () => {
            subscription.then(handle => handle.remove());
        };
    }, [navigate, location]);

    return null; // This component handles logic only, renders nothing
};

export default MobileNavigationHandler;
