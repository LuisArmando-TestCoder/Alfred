This project has a deno server, a browser LLM voice CLI interface and an Ollama instance served on another PC on the same WLAN

To avoid OpenClaw AI Agents' security risks, instead of clawd bot shaping commands, writing code, CRON jobs, etc; the commands are already created and triggered based on user messages, these commands live on the server, on deno, the LLMs are triggereed from the browser for its firewall bypassing features, there are 3 simultaneous LLMs requests being executed at the same time: 

- the first is a conversational LLM, as it receives a context.md file content and the user message from the speech to text function, and triggers the text to speech to text with its response, it should be direct, butler like, compact, refering to the user as 'sir'
- the second LLM is the context manager, it takes the user message and the context.md content and returns a new context where it adds more context if the message had unmentioned information, deletes content from the response if the message proves some context is no longer truthful based on the user message, or edits some of the context if the user message proves some information needs to be updated, the context file is not frugal, saves information in verboseProperty:conciseValue pairs (no spaces, it uses cammel case only and colons : to separate information and break lines to separate properties)
- the third LLM takes the context.md file, with user message, decides which command to trigger with which arguments, if any given, often times it does not anything, until the user message explicitly asks the LLM to perform an action, by using a verb in the beginning, other times it just produces an output that's full of dots...

The three of them request the 192.168.x.x:abcd/api/generate simultaneously without waiting for each other, and execute simultaneously, when the user messaged is generated after the 2s wait after the non empty message has not changed, and the server serves the current context.md content, they all fetch at the same time with their own threads of execution

Listen triggers again when the conversational LLM is done streaming the message and the text to speech is done streaming the audio, both needing to be true simultaneously

Make the project adapt to this guidelines

anything (functionality wise) outside these guidelines is legacy waste

# [Alfred](https://luisarmando-testcoder.github.io/Alfred/.)
