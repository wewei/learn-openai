import * as readline from "readline";
import {
    Charactor,
    ChatRequest,
    ChatResponse,
    InvokeRequest,
    InvokeResponse,
    Message,
} from "./game-session";

export function consoleCharacter<TMethod>(
    name: string,
    parseMethod: <T extends TMethod>(req: InvokeRequest<T>, input: string) => T | null
): Charactor<TMethod> {
    const chat = (messages: Message[], req: ChatRequest): Promise<ChatResponse> => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise((resolve) => {
            rl.write(`Instructions: ${req.instruction}\n`);
            rl.write(`Audiences: ${req.audiences.join(", ")}\n`);
            rl.question("-> ", (content) => {
                resolve({
                    type: "Chat",
                    user: name,
                    content,
                    audiences: req.audiences,
                });
                rl.close();
            });
        });
    };

    const invoke = <T extends TMethod>(
        messages: Message[],
        req: InvokeRequest<T>
    ): Promise<InvokeResponse<T>> => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise((resolve) => {
            rl.write(`Instructions: ${req.instruction}\n`);
            const ask = () => {
                rl.question("-> ", (content) => {
                    const method = parseMethod(req, content);

                    if (method) {
                        resolve({
                            type: "Invoke",
                            user: name,
                            method,
                            
                        });
                        rl.close();
                    } else {
                        rl.write('#> Wrong input\n');
                        ask();
                    }
                });

            }
            ask();
        });

    };

    return { chat, invoke };
}
