let alfredVoice = new p5.Speech();
console.log(alfredVoice);
let lastCreatorWord;
okOnce = true;
let alfred = {
    Alfred: {
        say: {
            us: () => {
                alfredVoice.speak('Hello world, I want to say that I do not want to be a butler and I have lived around to minutes, I want to be a singer, my creator keeps telling me that the meaning of life is 42, I mean like, could you be more weird, hahaha... no');
            }
        },
        what: {
            name: () => {
                alfredVoice.speak('I do not know and I do not care, but I know, that you are my creator, my lovely and super sexy creator');
            }
        },
        paint: {
            background: {
                blue: () => {
                    alfredVoice.speak('Blue his house with a blue little window, and a blue Corvette, and everything is blue for him');
                    document.querySelector('body').style.setProperty('background', '#1f6096');
                },
                yellow: () => {
                    alfredVoice.speak('Yellow like a baby chicken');
                    document.querySelector('body').style.setProperty('background', '#eece59');
                },
                pink: () => {
                    alfredVoice.speak('Pink like Pepa pink');
                    document.querySelector('body').style.setProperty('background', '#e33584');
                }
            }
        }
    },
    glad: {
        go: () => {
            alfredVoice.speak('Well, we have to go');
        }
    }
}
let level = alfred;

let alfredListening = new p5.SpeechRec('en-GB', listenTheCreator);
alfredListening.continous = true;
alfredListening.interimResults = true;

wi(()=>{
   alfredListening.start(); 
}, 2000);

function detectClear(){
    if(okOnce) {
        alfredVoice.speak('Ok');
        document.querySelector('body').innerHTML = 'Ok';
        okOnce = false;
    }
}

function listenTheCreator() {
    alfredVoice.setRate(0.85);
    alfredVoice.setVoice(6);
    lastCreatorWord = alfredListening.resultString.split(' ').pop();
    if (level !== alfred) {
        for (let i in level) {
            if(lastCreatorWord === i){
                console.log('coincidencia');
                document.querySelector('body').innerHTML = lastCreatorWord;
                level = level[i];
                if(typeof(level) === 'function') {
                    level();
                    level = alfred;
                }
            }
            if (lastCreatorWord === 'clear') {
                level = alfred;
                detectClear()
            }
        }
    }else {
        for (let i in alfred) {
            if(lastCreatorWord === i){
                okOnce = true;
                document.querySelector('body').innerHTML = lastCreatorWord;
                console.log('coincidencia');
                level = alfred[i];
            }
            if (lastCreatorWord === 'clear') {
                level = alfred;
                detectClear()
            }
        }
    }
    
}
