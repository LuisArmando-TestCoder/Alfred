
const ollamaUrl = 'http://DESKTOP-OLLAMA.local:11434/api/generate';
console.log(`Using curl to fetch ${ollamaUrl}...`);

const command = new Deno.Command("curl", {
  args: [
    "-v",
    ollamaUrl,
    "-X", "POST",
    "-H", "Content-Type: application/json",
    "-d", JSON.stringify({
        model: "llama3.1:8b",
        prompt: "Hola",
        stream: false
    })
  ],
});

const { code, stdout, stderr } = await command.output();
console.log("Exit code:", code);
console.log("Stdout:", new TextDecoder().decode(stdout).substring(0, 100));
console.log("Stderr:", new TextDecoder().decode(stderr));
