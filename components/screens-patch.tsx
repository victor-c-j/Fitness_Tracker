/**
 * Patch for react-native-screens to prevent "Cannot get UIManager" errors 
 * 
 * This file should be imported early in your app's initialization
 */
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    // Safely access the ScreenStackHeaderConfig component
    const screenModule = require('react-native-screens');
    
    // Check if the component exists before patching
    if (screenModule && 
        screenModule.ScreenStackHeaderConfig && 
        screenModule.ScreenStackHeaderConfig.prototype) {
      
      const originalComponentWillUnmount = 
        screenModule.ScreenStackHeaderConfig.prototype.componentWillUnmount;
      
      if (originalComponentWillUnmount) {
        screenModule.ScreenStackHeaderConfig.prototype.componentWillUnmount = 
          function() {
            try {
              originalComponentWillUnmount.call(this);
            } catch (e: unknown) {
              // Safely ignore "Cannot get UIManager" errors during unmount
              if (e instanceof Error && e.message && 
                  (e.message.includes('Cannot get UIManager') || 
                  e.message.includes('active CatalystInstance'))) {
                console.log('Safely handled UIManager error during component unmount');
              } else {
                console.warn('Error in componentWillUnmount:', e);
                // Don't rethrow to prevent app crashes
              }
            }
          };
      } else {
        console.log('ScreenStackHeaderConfig.prototype.componentWillUnmount not found, skipping patch');
      }
    } else {
      console.log('ScreenStackHeaderConfig not found, skipping patch');
    }
  } catch (error) {
    console.warn('Error applying react-native-screens patch:', error);
  }
} 