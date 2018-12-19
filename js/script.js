let alfredVoice = new p5.Speech();
console.log(alfredVoice);
let lastWord;
okOnce = true;
if(!localStorage.getItem('currentPerson')){
    localStorage.setItem('currentPerson', 'Actually you have not mentioned any name yet');
}
let alfredRemembers = {
    creatorsName: 'LuisArmando-TestCoder',
    currentPerson: localStorage.getItem('currentPerson'),
    musicList: [
        'https://www.youtube.com/watch?v=6tHrhzCIyHs&list=RD8mQJVlQ9j_8&index=15',
        'https://www.youtube.com/watch?v=dgCnYsDTiXU&list=RDdgCnYsDTiXU&start_radio=1',
        'https://www.youtube.com/watch?v=pbMwTqkKSps&start_radio=1&list=RDEMcce0hP5SVByOVCd8UWUHEA',
        'https://www.youtube.com/watch?v=1o84y-5-cO0&list=RDEM9zUDXjmy6kC3teLQBxY9Wg&start_radio=1',
        'https://www.youtube.com/watch?v=m9kwUbDgpw0&list=PLg3KVtKsolJq3LpWuArrPPVjIwo2eo-zg&index=2',
        'https://www.youtube.com/watch?v=kwLTw8F8yN8&start_radio=1&list=RDkwLTw8F8yN8',
        'https://www.youtube.com/watch?v=6QvMcQ2Eejo&start_radio=1&list=RD6QvMcQ2Eejo'
    ]
}
let alfred = {
    Alfred: {
        space: ()=> {
            alfredVoice.speak('Going to the space sir');
            window.open('https://luisarmando-testcoder.github.io/Juego-de-Naves-Comando-en-Venus/', '_blank');
        },
        work: ()=> {
            alfredVoice.speak('I am opening Github sir');
            window.open('https://github.com/LuisArmando-TestCoder?tab=repositories', '_blank');
        },
        keep: ()=> {
            alfredVoice.speak('Here is your storage sir');
            window.open('https://github.com/LuisArmando-TestCoder/keeper', '_blank');
        },
        library: ()=> {
            alfredVoice.speak('Of course, you are now in quicker JS');
            window.open('https://luisarmando-testcoder.github.io/QuickerJs/lib/quicker.js', '_blank');
        },
        experiment: ()=> {
            alfredVoice.speak('Opening a new pen sir');
            window.open('https://codepen.io/pen/', '_blank');
        },
        dashboard: ()=> {
            alfredVoice.speak('Here is your dashboard');
            window.open('https://codepen.io/LuisArmando-TC/', '_blank');
        },
        inside: ()=> {
            alfredVoice.speak('Here you can see inside my body sir');
            window.open('https://github.com/LuisArmando-TestCoder/Alfred', '_blank');
        },
        challenge: ()=> {
            alfredVoice.speak('Some challenges for you sir');
            window.open('https://courses.wesbos.com/account/access/5c18f4ef536bc562b0ef1ece', '_blank');
        },
        music: ()=> {
            alfredVoice.speak('Here is music that you would like');
            window.open(alfredRemembers.musicList[r(0, alfredRemembers.musicList.length - 1)], '_blank');
        },
        anime: ()=> {
            alfredVoice.speak('Your anime sir');
            window.open('https://animeflv.net/', '_blank');
        },
        say: {
            us: () => {
                alfredVoice.speak('Ok, the meaning of life is 42');
            },
            glad: {
                go: () => {
                    alfredVoice.speak('Well, we have to go');
                }
            }
        },
        name: ()=> {
            wt(()=> {
                localStorage.setItem('currentPerson', lastWord);
                alfredVoice.speak('Gotcha');
            }, 2500);
        },
        paint: {
            blue: () => {
                alfredVoice.speak('Blue like a smurf');
                document.querySelector('body').style.setProperty('background', '#1f6096');
            },
            yellow: () => {
                alfredVoice.speak('Yellow like a baby chicken');
                document.querySelector('body').style.setProperty('background', '#eece59');
            },
            pink: () => {
                alfredVoice.speak('Pink like Pepa Pink');
                document.querySelector('body').style.setProperty('background', '#e33584');
            } 
        }
    },
    what: {
        name: () => {
            alfredVoice.speak(alfredRemembers.currentPerson);
        }
    },
    who: {
        creator: () => {
            alfredVoice.speak(`My lovely creator is ${alfredRemembers.creatorsName}`);
        }
    },
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
            document.querySelector('title').innerHTML = lastWord;
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
