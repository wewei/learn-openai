import { ChatRequestMessage, OpenAIClient } from "@azure/openai";
import { Agent, Message } from ".";

export function openaiAgent(name: string, client: OpenAIClient, deploymentId: string): Agent {
    const messages: Message[] = []; 
    return {
        init: async () => {},
        send: async (msg: Message[]) => { messages.push(...msg); },
        chat: async (request) => {
            const oaiMessages: ChatRequestMessage[] = messages.map(({ user, content }) => {
                if (user === null) {
                    return { content, role: 'system' };
                }
                if (user === request.user) {
                    return { content, role: 'assistant' };
                }
                return { content, role: 'user', name: user };
            });
            oaiMessages.push({ role: 'system', content: `Your name is ${name}.` });
            oaiMessages.push({ role: 'system', content: request.instructions });
            oaiMessages.push({ role: 'system', content: `The audiences are ${request.audience.join(', ')}.`});
            // oaiMessages.forEach(message => console.log('{debug}', message));
            const res = await client.getChatCompletions(deploymentId, oaiMessages);
            const content = res.choices[0]?.message?.content || '';
            return { request, content };
        },
        form: async (req) => {
            return Promise.reject('not supported!');
        },
    };
}

