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
  'play nice music': { action: () => fetchCommand('music/nice') },
  'play powerful music': { action: () => fetchCommand('music/powerful') },
  'play funny music': { action: () => fetchCommand('music/funny') },
  'play sad music': { action: () => fetchCommand('music/sad') },
  'play awesome music': { action: () => fetchCommand('music/awesome') },
  'open frontend masters': { action: () => fetchCommand('link/study') },
  'open trello': { action: () => fetchCommand('link/board') },
  'open github': { action: () => fetchCommand('link/work') },
  'open storage': { action: () => fetchCommand('link/storage') },
  'open quickerjs': { action: () => fetchCommand('link/library') },
  'open space game': { action: () => fetchCommand('link/space') },
  'open p5 editor': { action: () => fetchCommand('link/editor') },
  'open dashboard': { action: () => fetchCommand('link/dashboard') },
  'open source code': { action: () => fetchCommand('link/body') },
  'open anime': { action: () => fetchCommand('link/anime') },
  'open netflix': { action: () => fetchCommand('link/entertainment') },
  'start new project': { action: () => fetchCommand('link/project') },
  'open regex101': { action: () => fetchCommand('link/regular') },
  'open challenges': { action: () => fetchCommand('link/challenge') },
  'paint blue': { action: () => fetchCommand('paint/blue') },
  'paint yellow': { action: () => fetchCommand('paint/yellow') },
  'paint pink': { action: () => fetchCommand('paint/pink') },
  'paint black': { action: () => fetchCommand('paint/black') },
};
