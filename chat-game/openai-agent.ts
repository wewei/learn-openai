import { ChatRequestMessage, OpenAIClient } from "@azure/openai";
import { Agent, Message } from ".";
import { Type, tyNumber, tyString } from "./types";

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

function getParameterType(type: Type): Record<string, any> {
    if (type === tyString) {
        return { type: "string" };
    }
    if (type === tyNumber) {
        return { type: "number" };
    }
    if (typeof type === "object" && type.ctor === "Union") {
        return { type: "string", enum: Object.keys(type.fragments) };
    }
    console.log("error value type");
    throw Error("Unsupported value type");
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
        chat: async (request) => {
            const oaiMessages: ChatRequestMessage[] = messages.map(
                convertToOpenaiMessage(name)
            );
            oaiMessages.push({ role: "system", content: request.instructions });
            oaiMessages.push({
                role: "system",
                content: `The audiences are ${request.audience.join(", ")}.`,
            });
            oaiMessages.forEach((message) =>
                console.log(`[${name}] {debug}`, message)
            );
            const res = await client.getChatCompletions(
                deploymentId,
                oaiMessages
            );
            const content = res.choices[0]?.message?.content || "";
            console.log(`[${name}] {debug} >>>`, content);
            return { request, content };
        },
        form: async (request) => {
            const oaiMessages: ChatRequestMessage[] = messages.map(
                convertToOpenaiMessage(name)
            );
            oaiMessages.push({ role: "system", content: request.instructions });
            oaiMessages.forEach((message) =>
                console.log(`[${name}] {debug}`, message)
            );

            const res = await client
                .getChatCompletions(deploymentId, oaiMessages, {
                    toolChoice: "auto",
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "answer",
                                description:
                                    "Give the answer based on the instruction",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        value: getParameterType(
                                            request.valueType
                                        ),
                                    },
                                    required: ["value"],
                                },
                            },
                        },
                    ],
                })
                .catch((e) => {
                    console.log(e);
                    throw e;
                });

            console.log(JSON.stringify(res, null, 2));
            const funcCall = res.choices[0].message?.toolCalls[0]?.function;

            if (funcCall && funcCall.name === "answer") {
                const result = JSON.parse(funcCall.arguments);
                if (result) {
                    return { request, value: result.value };
                }
            }

            return Promise.reject("Failed to make form call.");
        },
    };
}
