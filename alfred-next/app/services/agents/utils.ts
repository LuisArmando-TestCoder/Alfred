export const getOllamaUrl = () => {
  const url = process.env.NEXT_PUBLIC_OLLAMA_URL;
  if (!url) {
    throw new Error("Ollama URL (NEXT_PUBLIC_OLLAMA_URL) is not configured.");
  }
  return url;
};

export const formatMetricPrefix = (num: number): string => {
  if (num < 1000) return num.toString();
  const suffixes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
  const suffixNum = Math.floor(("" + num).length / 3);
  let shortValue: string | number = parseFloat((suffixNum !== 0 ? (num / Math.pow(1000, suffixNum)) : num).toPrecision(2));
  if (shortValue % 1 !== 0) {
    shortValue = shortValue.toFixed(1);
  }
  return shortValue + suffixes[suffixNum];
};
