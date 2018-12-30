let commandLevel = alfred;

let alfredListening = new p5.SpeechRec('en-GB', listenTheCreator);
alfredListening.continous = true;
alfredListening.interimResults = true;

let seeIfClick = false;

document.addEventListener('click', ()=> {
    if(!seeIfClick){
        ih(word, 'Call Alfred', false);
        alfredListening.start(); 
        wi(()=>{ // Restart the speech
            alfredListening.start(); 
            //console.clear();
        }, 2000);
        seeIfClick = true;
    }
});