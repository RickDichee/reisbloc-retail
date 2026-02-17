// src/components/EnvironmentBanner.tsx

import { ENV } from '@/config/environment';

export function EnvironmentBanner() {
  if (ENV.isProduction) return null;

  const bgColor = ENV.isDevelopment ? 'bg-green-600' : 'bg-yellow-600';
  
  return (
    <div className={`${bgColor} text-white px-4 py-2 text-center text-sm font-bold`}>
      🚧 {ENV.name.toUpperCase()} ENVIRONMENT 🚧
    </div>
  );
}

// En App.tsx
function App() {
  return (
    <>
      <EnvironmentBanner />
      {/* resto de tu app */}
    </>
  );
}