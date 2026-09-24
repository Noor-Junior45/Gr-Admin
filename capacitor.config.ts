import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartrun.hub',
  appName: 'SmartRun HUB',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#F59E0B',
      sound: 'smartrun_order_alert.wav'
    }
  }
};

export default config;
