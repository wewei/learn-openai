import { client } from "./oai-client";
import { roundChat } from "./playground/round-chat-game";
import * as readline from "node:readline";
import { Agent, play } from "./chat-game";
import { consoleAgent } from "./chat-game/console-agent";
import { openaiAgent } from "./chat-game/openai-agent";
import { werewolfGame } from "./werewolf-game";

export async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const game = await werewolfGame();
    const names: string[] = [
        "Alice",
        "Bob",
        "Charlie",
        "Diana",
        "Emma",
        "Frank",
        "Grace",
        "Henry",
        "Ivy",
        "Jack",
        "Kate",
        // "Liam",
    ];

    const players = names.reduce((m, name) => {
        m[name] = openaiAgent(name, client, 'gpt-4');
        return m;
    }, { Scott: consoleAgent('Scott', rl )} as Record<string, Agent>);

    await play(game, players);

    rl.close();
}

main();
