/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc Lab
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reisbloclab.pos',
  appName: 'Reisbloc POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Permitir CORS para desarrollo local
    allowNavigation: [
      'localhost',
        // '*.googleapis.com'
    ]
  },
  android: {
    // Configuración específica de Android
    buildOptions: {
      keystorePath: undefined, // Se configurará para release
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK' // APK o AAB (Android App Bundle)
    }
  },
  plugins: {
    // Configuración de plugins nativos
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#4f46e5',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
