import { client } from "./oai-client";
import { roundChat } from "./playground/round-chat-game";
import * as readline from "node:readline";
import { play } from "./chat-game";
import { consoleAgent } from "./chat-game/console-agent";
import { openaiAgent } from "./chat-game/openai-agent";

export async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    await play(roundChat(), {
        Scott: consoleAgent("Scott", rl),
        Lily: openaiAgent("Lily", client, "gpt-4"),
        John: openaiAgent("John", client, "gpt-4"),
    });
    rl.close();
}

main();
