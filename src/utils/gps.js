/**
 * Get current GPS coordinates from device
 */
export function getCurrentCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        available: false,
        error: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          available: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
        });
      },
      (err) => {
        let msg = 'Location permission denied.';
        if (err.code === 2) msg = 'Location unavailable on device.';
        if (err.code === 3) msg = 'Location request timed out.';
        resolve({
          available: false,
          error: msg,
          code: err.code,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
