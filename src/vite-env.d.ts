/// <reference types="vite/client" />

interface DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface DeviceOrientationEventConstructor {
  requestPermission?: () => Promise<'granted' | 'denied' | 'prompt'>;
}
