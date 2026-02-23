export const getOllamaUrl = () => {
  const url = process.env.NEXT_PUBLIC_OLLAMA_URL;
  if (!url) {
    throw new Error("Ollama URL (NEXT_PUBLIC_OLLAMA_URL) is not configured.");
  }
  return url;
};

export const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
};

export const showNotification = (title: string, body: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  }
};

export const formatMetricPrefix = (num: number): string => {
  if (num < 1000) return num.toString();
  const suffixes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
  const suffixNum = Math.floor(Math.log10(num) / 3);
  let shortValue: string | number = parseFloat((num / Math.pow(1000, suffixNum)).toPrecision(3));
  if (shortValue >= 10 && shortValue < 1000) {
    shortValue = Math.round(shortValue);
  } else if (shortValue < 10) {
    shortValue = shortValue.toFixed(1);
  }
  return shortValue + suffixes[suffixNum];
};
