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
            ih(word, lastWord, false);
            commandLevel = commandLevel[i];
            if(typeof(commandLevel) === 'function') {
                commandLevel();
                commandLevel = alfred;
            } else {
                ih(tree, '', false);
                for (let a in commandLevel) {
                    let li = ce('li');
                    ih(li, a);
                    tree.appendChild(li);
                }
            }
        }
        if (lastWord === 'clear') {
            commandLevel = alfred;
            detectClear()
        }
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

const word = gi('word');
const tree = gi('tree');