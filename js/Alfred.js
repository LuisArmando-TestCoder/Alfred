let alfred = {
    Alfred: {
        want: {
            see: {
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
                    window.open('https://luisarmando-testcoder.github.io/QuickerJs/lib/quicker.js', '_blank');
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
                music: ()=> {
                    alfredVoice.speak('Here is music that you would like');
                    window.open(alfredRemembers.musicList[r(0, alfredRemembers.musicList.length - 1)], '_blank');
                }
            },
            make: {
                project: ()=> {
                    alfredVoice.speak('Sir, lets make a new project then');
                    window.open('https://github.com/new', '_blank');
                },
                experiment: ()=> {
                    alfredVoice.speak('Opening a new pen sir');
                    window.open('https://codepen.io/pen/', '_blank');
                },
                regular: ()=> {
                    alfredVoice.speak('Lets make regular expressions then');
                    window.open('https://regex101.com/', '_blank');
                },
                challenge: ()=> {
                    alfredVoice.speak('Some challenges for you sir');
                    window.open('https://courses.wesbos.com/account/access/5c18f4ef536bc562b0ef1ece', '_blank');
                }
            },
            study: ()=> {
                alfredVoice.speak('There is so much to study in frontend masters sir');
                window.open('https://frontendmasters.com/courses/', '_blank');
            }
        },
        know: {
            life: ()=> {
                alfredVoice.speak('42');
                
            },
            name: ()=> {
                wt(()=> {
                    localStorage.setItem('currentPerson', lastWord);
                    alfredVoice.speak('Gotcha');
                }, 2500);
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
        who: {
            I: () => {
                alfredVoice.speak(localStorage.getItem('currentPerson'));
            },
            creator: () => {
                alfredVoice.speak(`My lovely creator is ${alfredRemembers.creatorsName}`);
            }  
        }  
    }
}