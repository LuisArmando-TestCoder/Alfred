export const getOllamaUrl = () => {
  const url = process.env.NEXT_PUBLIC_OLLAMA_URL;
  if (!url) {
    throw new Error("Ollama URL (NEXT_PUBLIC_OLLAMA_URL) is not configured.");
  }
  return url;
};
