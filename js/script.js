let commandLevel = alfred;

let alfredListening = new p5.SpeechRec('en-GB', listenTheCreator);
alfredListening.continous = true;
alfredListening.interimResults = true;

alfredListening.start(); 
wi(()=>{
   alfredListening.start(); 
}, 4000);
