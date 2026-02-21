import { CommandsRecord } from "../types/alfred";

export const fetchCommand = async (endpoint: string) => {
  try {
    const res = await fetch(`http://localhost:8000/${endpoint}`);
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    
    if (typeof window !== 'undefined') {
      if (data.action === 'open') {
        window.open(data.url, '_blank');
      } else if (data.action === 'open_multiple') {
        data.urls.forEach((url: string) => window.open(url, '_blank'));
      } else if (data.action === 'paint') {
        document.body.style.setProperty('background', data.color);
      }
    }
    return data.message;
  } catch (err) {
    console.error("Fetch command failed", err);
    return "I could not reach the knowledge base.";
  }
};

export const commands: CommandsRecord = {
  'play_music': { 
    action: async (mood: string) => {
      const validMoods = ['nice', 'powerful', 'funny', 'sad', 'awesome'];
      const targetMood = validMoods.includes(mood) ? mood : 'nice';
      return await fetchCommand(`music/${targetMood}`);
    }
  },
  'open_link': { 
    action: async (site: string) => {
      return await fetchCommand(`link/${site}`);
    }
  },
  'paint': { 
    action: async (color: string) => {
      return await fetchCommand(`paint/${color}`);
    }
  }
};
