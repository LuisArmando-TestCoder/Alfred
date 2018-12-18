let alfredVoice = new p5.Speech();
console.log(alfredVoice);
let lastCreatorWord;
let alfred = {
    Alfred: {
        say: {
            us: () => {
                alfredVoice.speak('Hello world, I am Alfred, glad to meet you folks');
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
                    alfredVoice.speak('Yes my lord, your wish is my command');
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

wi(()=>{
}, 0);

function listenTheCreator() {
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
                alfredVoice.speak('Ok');
                document.querySelector('body').innerHTML = 'Ok';
            }
        }
    }else {
        for (let i in alfred) {
            if(lastCreatorWord === i){
                document.querySelector('body').innerHTML = lastCreatorWord;
                console.log('coincidence');
                level = alfred[i];
            }
            if (lastCreatorWord === 'clear') {
                level = alfred;
                alfredVoice.speak('Ok');
                document.querySelector('body').innerHTML = 'Ok';
            }
        }
    }
    
}
