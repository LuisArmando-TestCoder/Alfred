This project has a deno server, a browser LLM voice CLI interface and an Ollama instance served on another PC on the same WLAN

To avoid OpenClaw AI Agents' security risks, instead of clawd bot shaping commands, writing code, CRON jobs, etc; the commands are already created and triggered based on user messages, these commands live on the server, on deno, the LLMs are triggereed from the browser for its firewall bypassing features, there are 3 simultaneous LLMs requests being executed at the same time: 

- the first is a conversational LLM, as it receives a context.md file content and the user message from the speech to text function, and triggers the text to speech to text with its response, it should be direct, butler like, compact, refering to the user as 'sir'
- the second LLM is the context manager, it takes the user message and the context.md content and returns a new context where it adds more context if the message had unmentioned information, deletes content from the response if the message proves some context is no longer truthful based on the user message, or edits some of the context if the user message proves some information needs to be updated, the context file is not frugal, saves information in verboseProperty:conciseValue pairs (no spaces, it uses cammel case only and colons : to separate information and break lines to separate properties)
- the third LLM takes the context.md file, with user message, decides which command to trigger with which arguments, if any given, often times it does not anything, until the user message explicitly asks the LLM to perform an action, by using a verb in the beginning, other times it just produces an output that's full of dots...

The three of them request the 192.168.x.x:abcd/api/generate simultaneously without waiting for each other, and execute simultaneously, when the user messaged is generated after the 2s wait after the non empty message has not changed, and the server serves the current context.md content, they all fetch at the same time with their own threads of execution

Listen triggers again when the conversational LLM is done streaming the message and the text to speech is done streaming the audio, both needing to be true simultaneously

Make the project adapt to this guidelines

Alfred works like this

Click to activate starts it

alfred-next/app/hooks/alfred/useAlfredCore.ts
alfred-next/app/hooks/useAlfredSpeech.ts
alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts

Speech says: Listening

While Speech streams true listening is deactivated

Speech lives in a global speech/listen router center

(We will live the iterative pondering agent out for now, but it will)

When the speech stream ends listening begins again if and only if:
- System is in listening mode
- Listening mode is only on after:
    - Processing is done
    - Processing is done only after:
        - When coordinatorAgent at alfred-next/app/services/agents/coordinatorAgent.ts says that conversational LLM at alfred-next/app/services/agents/conversationAgent.ts should be running: true; and then Conversational LLM is done streaming LLM response and speech streaming is done
        or
        - When coordinatorAgent says that conversational LLM should not be running: false
        and then is ready to listen again, the conversational agent prompt has to be aware of the process of this system
        - there should be no chance that if the coordinator is streaming the response and speech and both are not done, that the other agents execute before that 
        - so, first Coordinator Agent, then from there Conversation, Command, and Context. Conversation agent triggers and blocks listening while streaming the LLM response and speech synthesis, and while is talking Command and Context agents execute on the back
        - All the non streaming agents responses are show on dropdowns on the UI

Simultaneously

If coordinator agent sets as true command or context at alfred-next/app/services/agents/commandAgent.ts or alfred-next/app/services/agents/contextAgent.ts then you send the info to these agents, and they work simultaneusly without blocking the main thread with an await but an async function that runs these two on parallel and then responds done, when each is done speech says "command" (for command agent) and then the name of the command triggered (I'm thinking of giving the agent the ability to trigger various commands at the same time) 
- CRON JOBS ARE FABRICATED (ARGUMENTS PASSED BY COMMAND MANAGER) PULSING AN SPECIFIC COMMAND, THIS CRON JOBS ARE SAVED ON A FOLDER, EACH .MD FILE SAVES THE INFO IN THE SAME FORMAT, THE TITLE OF THE CRON JOB ON THE FIRST LINE, THE CRON JOB ON THE SECOND, THE COMMAND TO TRIGGER ON THE THIRD, THE SERVER ON EVERY CRON JOB EDIT, DELETION, ADDITION, OR RESTART WATCHES AT THIS FOLDER

and when the memory is done editing based on the server response (it says "Memory saved and cites the diff lines from the previous version of the context.md file")
        
Check

        deno/server.ts
        deno/memory/markdown.ts
        deno/data/memories/context.md
        deno/controllers/commandManager.ts
        deno/controllers/context.ts
        deno/controllers/cronManager.ts

Now the semaforo item can portrait more agents like the coordinator agent or command search agent inside command agent (to not pass all available commands programmatically or hardcodedly to the prompt but the ones found by the server from comma separated keywords) and activate the UI highlight dots and deactivate the higlight asynchronously (that way there are no hardcoded commands in the command agent prompt)

You have to segment the info that's to share globally for all agents synchronous thread block or asynchronous simultaneous non thread blocking, and speech/listen synthesis operations

anything (functionality wise) outside these guidelines is legacy waste

# [Alfred](https://luisarmando-testcoder.github.io/Alfred/.)