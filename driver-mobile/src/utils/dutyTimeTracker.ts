import AsyncStorage from '@react-native-async-storage/async-storage';

const getTodayKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `online_duty_seconds_${today}`;
};

const START_TIME_KEY = 'online_duty_start_timestamp';

export const dutyTimeTracker = {
  // Start duty online
  startDuty: async () => {
    try {
      const now = Date.now().toString();
      await AsyncStorage.setItem(START_TIME_KEY, now);
    } catch {
      // Ignore
    }
  },

  // Stop duty offline
  stopDuty: async () => {
    try {
      const startStr = await AsyncStorage.getItem(START_TIME_KEY);
      if (startStr) {
        const start = parseInt(startStr, 10);
        const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
        await AsyncStorage.removeItem(START_TIME_KEY);

        const todayKey = getTodayKey();
        const existingStr = await AsyncStorage.getItem(todayKey);
        const existing = existingStr ? parseInt(existingStr, 10) : 0;
        await AsyncStorage.setItem(todayKey, (existing + elapsed).toString());
      }
    } catch {
      // Ignore
    }
  },

  // Get total online seconds for today (accumulated + active session if currently online)
  getTodayOnlineSeconds: async (isCurrentlyOnline: boolean): Promise<number> => {
    try {
      const todayKey = getTodayKey();
      const existingStr = await AsyncStorage.getItem(todayKey);
      let total = existingStr ? parseInt(existingStr, 10) : 0;

      if (isCurrentlyOnline) {
        const startStr = await AsyncStorage.getItem(START_TIME_KEY);
        if (startStr) {
          const start = parseInt(startStr, 10);
          const currentSession = Math.max(0, Math.floor((Date.now() - start) / 1000));
          total += currentSession;
        } else {
          // If online but no start time saved, mark current time as start
          await AsyncStorage.setItem(START_TIME_KEY, Date.now().toString());
        }
      }
      return total;
    } catch {
      return 0;
    }
  },

  // Format seconds into human readable e.g. "0h 18m" or "2h 45m"
  formatDutyHours: (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
};
