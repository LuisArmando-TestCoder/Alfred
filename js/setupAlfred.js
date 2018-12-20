function detectClear(){
    if(okOnce) {
        alfredVoice.speak('Command deleted');
        okOnce = false;
    }
}

function listenTheCreator() {
    alfredVoice.setRate(0.85);
    alfredVoice.setVoice(6);
    lastWord = alfredListening.resultString.split(' ').pop();
    ih(lastWordElement, lastWord, false);
    for (let i in commandLevel) {
        if(lastWord === i){
            soundOfCoincidence.play();
            document.querySelector('title').innerHTML = lastWord;
            ih(word, lastWord, false);
            commandLevel = commandLevel[i];
            if(typeof(commandLevel) === 'function') {
                commandLevel();
                commandLevel = alfred;
                showTreeInDom();
            } else {
                ih(tree, '', false);
                for (let a in commandLevel) {
                    showTreeInDom();
                }
            }
        }
        if (lastWord === 'delete') {
            commandLevel = alfred;
            showTreeInDom();
            detectClear()
        }
    }
}

function showTreeInDom(){
    ih(tree, '', false);
    for (let a in commandLevel) {
        let li = ce('li');
        ih(li, a);
        tree.appendChild(li);
    }
}

let alfredVoice = new p5.Speech();
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
        'https://www.youtube.com/watch?v=9sjWU5dGcGI',
        'https://www.youtube.com/watch?v=zA52uNzx7Y4&start_radio=1&list=RDzA52uNzx7Y4&t=3',
        'https://www.youtube.com/watch?v=qeMFqkcPYcg&list=RDqeMFqkcPYcg&start_radio=1&t=2',
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

const word = gi('word');
const tree = gi('tree');
const lastWordElement = gi('lastWordElement');

let soundOfCoincidence = new Audio('mp3/coincidence.mp3');