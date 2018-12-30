let alfred = {
    Alfred: {
        want: {    
            study: ()=> {
                alfredVoice.speak('There is so much to study in frontend masters sir');
                window.open('https://frontendmasters.com/courses/', '_blank');
            },
            listen: {
                nice: ()=> {
                    alfredVoice.speak('Then you say rice, then I say price, then I rap more, then you sing twice');
                    window.open(alfredRemembers.niceMusicList[r(0, alfredRemembers.niceMusicList.length - 1)], '_blank');
                },
                powerful: ()=> {
                    alfredVoice.speak('Let´s begin sir');
                    window.open(alfredRemembers.powerfulMusicList[r(0, alfredRemembers.powerfulMusicList.length - 1)], '_blank');
                },
                funny: ()=> {
                    alfredVoice.speak('Of course sir, enjoy');
                    window.open(alfredRemembers.funMusicList[r(0, alfredRemembers.funMusicList.length - 1)], '_blank');
                },
                sad: ()=> {
                    alfredVoice.speak('Your wish is my command');
                    window.open(alfredRemembers.sadMusicList[r(0, alfredRemembers.sadMusicList.length - 1)], '_blank');
                }
            },
            message: ()=> {
                alfredVoice.speak('What´s app is open sir');
                window.open('https://web.whatsapp.com/', '_blank');
            },
            look: {
                board: ()=> {
                    alfredVoice.speak('Here you are sir, the trello boards');
                    window.open('https://trello.com/luisarmando34/boards', '_blank');
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
                    window.open('https://luisarmando-testcoder.github.io/QuickerJS2/quicker.js', '_blank');
                },
                space: ()=> { 
                    alfredVoice.speak('Going to the space sir');
                    window.open('https://luisarmando-testcoder.github.io/Juego-de-Naves-Comando-en-Venus/', '_blank');
                },
                editor: ()=> {
                    alfredVoice.speak('Well, the p5 editor is available sir');
                    window.open('https://editor.p5js.org/', '_blank');
                },
                dashboard: ()=> {
                    alfredVoice.speak('Here is your dashboard');
                    window.open('https://codepen.io/LuisArmando-TC/', '_blank');
                },
                body: ()=> {
                    alfredVoice.speak('Here you can see inside my body sir');
                    window.open('https://github.com/LuisArmando-TestCoder/Alfred', '_blank');
                },
                anime: ()=> {
                    alfredVoice.speak('Your anime sir');
                    window.open('https://animeflv.net/', '_blank');
                }
            },
            have: {
                fun: ()=> {
                    alfredVoice.speak('Have fun with your code sir');
                    window.open(alfredRemembers.entertainmentList[r(0, alfredRemembers.entertainmentList.length - 1)], '_blank');
                },
                entertainment: ()=> {
                    alfredVoice.speak('Opening Netflix for you sir');
                    window.open('https://www.netflix.com/browse', '_blank');
                },
            },
            make: {
                project: ()=> {
                    alfredVoice.speak('Sir, lets make a new project then');
                    window.open('https://github.com/new', '_blank');
                },
                experiment: ()=> {
                    alfredVoice.speak('Opening a new pen sir');
                    window.open(alfredRemembers.powerfulMusicList[r(0, alfredRemembers.powerfulMusicList.length - 1)], '_blank');
                    window.open('https://codepen.io/pen/', '_blank');
                    window.open('https://luisarmando-testcoder.github.io/QuickerJS2/quicker.js', '_blank');
                },
                regular: ()=> {
                    alfredVoice.speak('Lets make regular expressions then');
                    window.open('https://regex101.com/', '_blank');
                },
                challenge: ()=> {
                    alfredVoice.speak('Some challenges for you sir');
                    window.open('https://courses.wesbos.com/account/access/5c18f4ef536bc562b0ef1ece', '_blank');
                }
            }
        },
        life: ()=> {
            alfredVoice.speak('42');
            
        },
        remember: {
            name: ()=> {
                wt(()=> {
                    localStorage.setItem('currentPerson', lastWord);
                    alfredVoice.speak(`Hi ${localStorage.getItem('currentPerson')}, I am Alfred`);
                }, 2000);
            }
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
            },
            black: () => {
                alfredVoice.speak('Black like obsidiana');
                document.querySelector('body').style.setProperty('background', '#000');
            } 
        },
        what: {
            definition: ()=> {
                wt(()=> {
                    window.open(`https://www.wordreference.com/definition/${lastWord}`, '_blank');
                    alfredVoice.speak(`Here is the definition of ${lastWord}`);
                }, 2000);
            },
            name: () => {
                alfredVoice.speak(`${localStorage.getItem('currentPerson')}`);
            },
        },
        who: {
            creator: () => {
                alfredVoice.speak(`My lovely creator is ${alfredRemembers.creatorsName}`);
            },
            you: () => {
                alfredVoice.speak(`I am Alfred, a voice command line butler, happy to serve you`);
            }  
        }  
    }
}