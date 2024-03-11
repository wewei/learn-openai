import * as readline from "readline";
import { Agent } from ".";

export function consoleAgent(name: string, rl: readline.Interface): Agent {
    return {
        init: async () => {},
        send: async (messages) => {
            messages.forEach(({ user, content }) => {
                if (user !== name) {
                    rl.write(`[${name}] From ${user || "<system>"}: ${content}\n`);
                }
            });
        },
        chat: async (instructions, audiences) => {
            rl.write(`[${name}] Instructions: ${instructions}\n`);
            rl.write(`[${name}] Audience: ${audiences.join(", ")}\n`);
            return new Promise((resolve) => {
                rl.question(`[${name}]: `, (content) => {
                    resolve(content);
                });
            });
        },
        form: async (instructions, form) => {
            rl.write(`[${name}] Instructions: ${instructions}\n`);
            return new Promise((resolve) => {
                rl.question(`[${name}]: `, (content) => {
                    resolve(content);
                });
            });
        },
    };
}

