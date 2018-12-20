let commandLevel = alfred;

let alfredListening = new p5.SpeechRec('en-GB', listenTheCreator);
alfredListening.continous = true;
alfredListening.interimResults = true;

let seeIfClick = false;

document.addEventListener('click', ()=> {
    if(!seeIfClick){
        alfredListening.start(); 
        wi(()=>{
        alfredListening.start(); 
        }, 4000);
        seeIfClick = true;
    }
});