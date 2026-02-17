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

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rb-canvas': '#F8F9FA',  // Blanco Humo (Fondo)
        'rb-nav': '#1E293B',     // Azul Pizarra (Navegación)
        'rb-action': '#10B981',  // Verde Esmeralda (Botones)
        'rb-border': '#E2E8F0',  // Gris Suave (Divisores)
        'rb-text': '#334155',    // Gris Oscuro (Lectura)
        primary: "#1F2937",
        secondary: "#3B82F6",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      animation: {
        'ring': 'ring 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
