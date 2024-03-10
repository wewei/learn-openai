import { client } from "./oai-client";
import { runChatSession } from "./chat-session";


export function main() {
    runChatSession(client);
}

main();
