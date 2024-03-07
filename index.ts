import { client } from "./oai-client";
import { chatSession } from "./chat-session";
import * as readline from 'readline';


export function main() {
    // Create readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const chat = chatSession(client, "gpt-4");
    async function chatLoop(context: string) {
        console.log(`[] Current context: ${context}`);
        rl.question("Your message > ", async (content) => {
            if (content === "quit") {
                console.log("[] Existing ...");
                rl.close();
                return;
            }

            console.log("[] Response:");

            const { context: newContext } = await chat(
                context,
                content,
                (snippet) => process.stdout.write(snippet),
                () => {
                    process.stdout.write("\n")
                    console.log("[] Compressing context ...");
                }
            );

            chatLoop(await newContext);
        });
    }
    chatLoop("");
}

main();
