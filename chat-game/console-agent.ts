import * as readline from "readline";
import { Agent } from ".";
import { JSONSchema7, validate } from "json-schema";

export function consoleAgent(name: string, rl: readline.Interface): Agent {
    function question(prompt: string): Promise<string> {
        return new Promise((resolve) => rl.question(prompt, resolve));
    }

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
            return question(`[${name}]: `);
        },
        form: async (instructions, form) => {
            rl.write(`[${name}] Instructions: ${instructions}\n`);
            const { properties = {} } = form.type;
            const result: Record<string, any> = {};
            for (const key in properties) {
                do {
                    result[key] = await question(`[${name}] <${key}>: `);
                } while (!validate(result[key], properties[key] as JSONSchema7).valid);
            }
            return result;
        },
    };
}

