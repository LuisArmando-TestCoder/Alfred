let alfredVoice = new p5.Speech();
console.log(alfredVoice);
let lastWord;
okOnce = true;
let alfredRemembers = {
    creatorsName: 'LuisArmando-TestCoder',
    currentPerson: 'Actually you have not said any name yet'
}
let alfred = {
    what: {
        creator: () => {
            alfredVoice.speak(`My lovely and super sexy creator is ${alfredRemembers.creatorsName}`);
        },
        name: () => {
            alfredVoice.speak(alfredRemembers.currentPerson);
        }
    },
    Alfred: {
        say: {
            us: () => {
                alfredVoice.speak('Hello world, The meaning of life is 42');
            }
        },
        name: ()=> {
            wt(()=> {
                alfredRemembers.currentPerson = lastWord;
                alfredVoice.speak('Gotcha');
            }, 2500);
            
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
let commandLevel = alfred;

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
    lastWord = alfredListening.resultString.split(' ').pop();
    for (let i in commandLevel) {
        if(lastWord === i){
            console.log('coincidencia');
            document.querySelector('body').innerHTML = lastWord;
            commandLevel = commandLevel[i];
            if(typeof(commandLevel) === 'function') {
                commandLevel();
                commandLevel = alfred;
            }
        }
        if (lastWord === 'clear') {
            commandLevel = alfred;
            detectClear()
        }
    }
}
