/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc POS
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

// Servicio para gestionar dispositivos
import { Device, User } from '@types/index';
import logger from '@/utils/logger'

class DeviceService {
  /**
   * Obtiene información del dispositivo actual
   */
  async getDeviceInfo(): Promise<Partial<Device>> {
    return {
      macAddress: await this.getMacAddress(),
      deviceName: this.getDeviceName(),
      network: await this.getNetworkType(),
      os: this.getOS(),
      browser: this.getBrowser(),
    };
  }

  /**
   * Intenta obtener MAC address
   * Nota: En navegadores modernos, esto está limitado por seguridad
   * Alternativa: usar fingerprinting o IP del servidor
   */
  private async getMacAddress(): Promise<string> {
    try {
      // Intenta usar WebRTC para obtener IP local (fingerprinting)
      const ips = await this.getLocalIPs();
      return this.generateMacFromIP(ips[0] || 'unknown');
    } catch {
      return this.generateFingerprint();
    }
  }

  /**
   * Obtiene IPs locales usando WebRTC
   */
  private getLocalIPs(): Promise<string[]> {
    return new Promise((resolve) => {
      const ips: string[] = [];
      const rtcPeerConnection = window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!rtcPeerConnection) {
        resolve(ips);
        return;
      }

      const peerConnection = new rtcPeerConnection({ iceServers: [] });
      peerConnection.createDataChannel('');

      peerConnection.onicecandidate = (ice: any) => {
        if (!ice || !ice.candidate) return;
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const ipAddress = ipRegex.exec(ice.candidate.candidate);
        if (ipAddress) {
          const ip = ipAddress[1];
          if (!ips.includes(ip)) {
            ips.push(ip);
          }
        }
      };

      peerConnection.createOffer().then(offer =>
        peerConnection.setLocalDescription(offer)
      ).catch(() => {
        resolve(ips);
      });

      setTimeout(() => {
        peerConnection.close();
        resolve(ips);
      }, 1000); // Reducido a 1s para no bloquear el login si WebRTC falla
    });
  }

  /**
   * Genera un MAC simulado a partir de IP
   */
  private generateMacFromIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return parts.map(p =>
        parseInt(p).toString(16).padStart(2, '0').toUpperCase()
      ).join(':');
    }
    return this.generateFingerprint();
  }

  /**
   * Genera un fingerprint único del dispositivo
   */
  private generateFingerprint(): string {
    const fingerprints = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency || 'unknown',
    ];

    const str = fingerprints.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16).padStart(12, '0')
      .match(/.{1,2}/g)?.join(':')
      .toUpperCase() || 'FF:FF:FF:FF:FF:FF';
  }

  /**
   * Obtiene el nombre del dispositivo
   */
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux Device';
    return 'Unknown Device';
  }

  /**
   * Obtiene el tipo de red
   */
  private async getNetworkType(): Promise<'wifi' | 'mobile'> {
    try {
      const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        const type = connection.type || connection.effectiveType;
        if (type === 'wifi' || type === '4g' || type === '5g') {
          return type === 'wifi' ? 'wifi' : 'mobile';
        }
      }
    } catch (e) {
      logger.warn('device-service', 'Error detecting network', e as any);
    }

    return 'wifi';
  }

  /**
   * Obtiene el SO
   */
  private getOS(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Win')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Obtiene el navegador
   */
  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
    return 'Unknown';
  }

  /**
   * Compara dispositivos - valida si es el mismo
   */
  compareDevices(device1: Device, device2: Partial<Device>): boolean {
    // Comparar MAC address y nombre del dispositivo
    return device1.macAddress === device2.macAddress &&
      device1.deviceName === device2.deviceName;
  }

  /**
   * Almacena device info en localStorage
   */
  storeDeviceFingerprint(): string {
    let fingerprint = localStorage.getItem('device_fingerprint');
    if (!fingerprint) {
      fingerprint = this.generateFingerprint();
      localStorage.setItem('device_fingerprint', fingerprint);
    }
    return fingerprint;
  }
}

export default new DeviceService();
