import { links, alfredRemembers } from "../data/alfredData.ts";
import { r, corsHeaders } from "../utils.ts";

export const handleLink = (key: string) => {
    // @ts-ignore
    const linkData = links[key];
    
    if (linkData) {
         return Response.json({ action: "open", url: linkData.url, message: linkData.msg }, { headers: corsHeaders });
    }
    
    if (key === 'fun') {
         const url = alfredRemembers.entertainmentList[r(0, alfredRemembers.entertainmentList.length - 1)];
         return Response.json({ action: "open", url, message: "Opened Entertainment" }, { headers: corsHeaders });
    }
    
    if (key === 'experiment') {
         const urls = [
            alfredRemembers.powerfulMusicList[r(0, alfredRemembers.powerfulMusicList.length - 1)],
            'https://codepen.io/pen/',
            'https://luisarmando-testcoder.github.io/QuickerJS2/quicker.js'
         ];
         return Response.json({ action: "open_multiple", urls, message: "Started Experiment" }, { headers: corsHeaders });
    }

    return new Response("Link not found", { status: 404, headers: corsHeaders });
};
