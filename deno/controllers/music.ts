import { alfredRemembers } from "../data/alfredData.ts";
import { r, corsHeaders } from "../utils.ts";

export const handleMusic = (type: string) => {
    let url = "";
    let msg = "";

    switch (type) {
        case "nice":
            url = alfredRemembers.niceMusicList[r(0, alfredRemembers.niceMusicList.length - 1)];
            msg = "Played nice music";
            break;
        case "powerful":
            url = alfredRemembers.powerfulMusicList[r(0, alfredRemembers.powerfulMusicList.length - 1)];
            msg = "Played powerful music";
            break;
        case "funny":
            url = alfredRemembers.funMusicList[r(0, alfredRemembers.funMusicList.length - 1)];
            msg = "Played funny music";
            break;
        case "sad":
            url = alfredRemembers.sadMusicList[r(0, alfredRemembers.sadMusicList.length - 1)];
            msg = "Played sad music";
            break;
        case "awesome":
            url = 'https://www.youtube.com/watch?v=0t2tjNqGyJI&start_radio=1&list=RD0t2tjNqGyJI';
            msg = "Played awesome music";
            break;
        default:
            return new Response("Music type not found", { status: 404, headers: corsHeaders });
    }
    return Response.json({ action: "open", url, message: msg }, { headers: corsHeaders });
};
