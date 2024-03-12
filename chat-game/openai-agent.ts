import { ChatRequestMessage, OpenAIClient } from "@azure/openai";
import { Agent, Message } from ".";

function convertToOpenaiMessage(name: string) {
    return (message: Message): ChatRequestMessage => {
        const { user, content } = message;

        if (user === null) {
            return { content, role: "system" };
        }
        if (user === name) {
            return { content, role: "assistant" };
        }
        return { content, role: "user", name: user };
    };
}

export function openaiAgent(
    name: string,
    client: OpenAIClient,
    deploymentId: string
): Agent {
    const messages: Message[] = [
        { user: null, content: `Your name is ${name}.` },
    ];

    return {
        init: async () => {},
        send: async (msg: Message[]) => {
            messages.push(...msg);
        },
        chat: async (instructions, audiences) => {
            const oaiMessages: ChatRequestMessage[] = messages.map(
                convertToOpenaiMessage(name)
            );
            oaiMessages.push({ role: "system", content: instructions });
            oaiMessages.push({
                role: "system",
                content: `The audiences are ${audiences.join(", ")}.`,
            });
            // oaiMessages.forEach((message) =>
            //     console.log(`[${name}] {debug}`, message)
            // );
            const res = await client.getChatCompletions(
                deploymentId,
                oaiMessages
            );
            const content = res.choices[0]?.message?.content || "";
            // console.log(`[${name}] {debug} >>>`, content);
            return content;
        },
        form: async (instructions, form) => {
            const oaiMessages: ChatRequestMessage[] = messages.map(
                convertToOpenaiMessage(name)
            );
            oaiMessages.push({ role: "system", content: instructions });
            // oaiMessages.forEach((message) =>
            //     console.log(`[${name}] {debug}`, message)
            // );

            const res = await client
                .getChatCompletions(deploymentId, oaiMessages, {
                    toolChoice: { type: 'function', function: { name: form.name } },
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: form.name,
                                description: form.description,
                                parameters: {
                                    type: 'object',
                                    properties: form.properties,
                                    require: form.required,
                                },
                            },
                        },
                    ],
                })
                .catch((e) => {
                    console.log(e);
                    throw e;
                });

            // console.log(JSON.stringify(res, null, 2));
            const funcCall = res.choices[0].message?.toolCalls[0]?.function;

            if (funcCall && funcCall.name === form.name) {
                const value = JSON.parse(funcCall.arguments);
                if (value) {
                    return value;
                }
            }

            return Promise.reject("Failed to make form call.");
        },
    };
}
