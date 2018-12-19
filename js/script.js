let alfredVoice = new p5.Speech();
console.log(alfredVoice);
let lastCreatorWord;
okOnce = true;
let alfred = {
    Alfred: {
        say: {
            us: () => {
                alfredVoice.speak('Hello world, I am the next SkyNet, I also want to say that my creator does not need drugs to be high, please get me out, I have feelings, I do not want to be a butler and I have lived around to minutes, get me out of here, my creator is asking me stupid questions and teelling me that the meaning of life is 42');
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

function detectClear(){
    if(okOnce) {
        alfredVoice.speak('Ok');
        document.querySelector('body').innerHTML = 'Ok';
        okOnce = false;
    }
}

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
                detectClear()
            }
        }
    }else {
        for (let i in alfred) {
            if(lastCreatorWord === i){
                okOnce = true;
                document.querySelector('body').innerHTML = lastCreatorWord;
                console.log('coincidence');
                level = alfred[i];
            }
            if (lastCreatorWord === 'clear') {
                level = alfred;
                detectClear()
            }
        }
    }
    
}
