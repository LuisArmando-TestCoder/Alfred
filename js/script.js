let alfredVoice = new p5.Speech();
console.log(alfredVoice);
let lastWord;
okOnce = true;
if(!localStorage.getItem('currentPerson')){
    localStorage.setItem('currentPerson', 'Actually you have not mentioned any name yet');
}
let alfredRemembers = {
    creatorsName: 'LuisArmando-TestCoder',
    musicList: [
        'https://www.youtube.com/watch?v=6tHrhzCIyHs&list=RD8mQJVlQ9j_8&index=15',
        'https://www.youtube.com/watch?v=dgCnYsDTiXU&list=RDdgCnYsDTiXU&start_radio=1',
        'https://www.youtube.com/watch?v=pbMwTqkKSps&start_radio=1&list=RDEMcce0hP5SVByOVCd8UWUHEA',
        'https://www.youtube.com/watch?v=1o84y-5-cO0&list=RDEM9zUDXjmy6kC3teLQBxY9Wg&start_radio=1',
        'https://www.youtube.com/watch?v=m9kwUbDgpw0&list=PLg3KVtKsolJq3LpWuArrPPVjIwo2eo-zg&index=2',
        'https://www.youtube.com/watch?v=kwLTw8F8yN8&start_radio=1&list=RDkwLTw8F8yN8',
        'https://www.youtube.com/watch?v=6QvMcQ2Eejo&start_radio=1&list=RD6QvMcQ2Eejo'
    ],
    entertainmentList: [
        'https://www.youtube.com/watch?v=nqiKWXUX-o8&list=PLRqwX-V7Uu6bPhi8sS1hHJ77n3zRO9FR_',
        'https://www.youtube.com/watch?v=Pn1g1wjxl_0&list=PLRqwX-V7Uu6aFcVjlDAkkGIixw70s7jpW',
        'https://www.youtube.com/watch?v=Qf4dIN99e2w&list=PLRqwX-V7Uu6bgPNQAdxQZpJuJCjeOr7VD',
        'https://www.youtube.com/watch?v=zm9bqSSiIdo&list=PL7wAPgl1JVvUEb0dIygHzO4698tmcwLk9'
    ]
}
let alfred = {
    Alfred: {
        new: ()=> {
            alfredVoice.speak('Sir, lets make a new project then');
            window.open('https://github.com/new', '_blank');
        },
        fun: ()=> {
            alfredVoice.speak('Have fun with your code sir');
            window.open(alfredRemembers.entertainmentList[r(0, alfredRemembers.entertainmentList.length - 1)], '_blank');
        },
        entertainment: ()=> {
            alfredVoice.speak('Opening Netflix for you sir');
            window.open('https://www.netflix.com/browse', '_blank');
        },
        music: ()=> {
            alfredVoice.speak('Here is music that you would like');
            window.open(alfredRemembers.musicList[r(0, alfredRemembers.musicList.length - 1)], '_blank');
        },
        space: ()=> {
            alfredVoice.speak('Going to the space sir');
            window.open('https://luisarmando-testcoder.github.io/Juego-de-Naves-Comando-en-Venus/', '_blank');
        },
        work: ()=> {
            alfredVoice.speak('I am opening Github sir');
            window.open('https://github.com/LuisArmando-TestCoder?tab=repositories', '_blank');
        },
        storage: ()=> {
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
        regular: ()=> {
            alfredVoice.speak('Lets make regular expressions then');
            window.open('https://regex101.com/', '_blank');
        },
        editor: ()=> {
            alfredVoice.speak('Well, the p5 editor is available sir');
            window.open('https://editor.p5js.org/', '_blank');
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
        anime: ()=> {
            alfredVoice.speak('Your anime sir');
            window.open('https://animeflv.net/', '_blank');
        },
        say: ()=> {
            alfredVoice.speak('Yes sir, the meaning of life is 42');
            
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
            alfredVoice.speak(localStorage.getItem('currentPerson'));
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

alfredListening.start(); 
wi(()=>{
   alfredListening.start(); 
}, 4000);

function detectClear(){
    if(okOnce) {
        alfredVoice.speak('Ok');
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
