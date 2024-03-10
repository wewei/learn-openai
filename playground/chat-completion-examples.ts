import { ChatCompletions, EventStream, OpenAIClient } from "@azure/openai";

export async function printChatCompletionEvents(events: EventStream<ChatCompletions>) {
    for await (const event of events) {
        for (const choice of event.choices) {
            process.stdout.write(choice.delta?.content || "");
        }
    }
    process.stdout.write("\n");
}

export async function example_streamChatCompletions_1(client: OpenAIClient) {
    // example with multiple users
    const deploymentId = "gpt-4";
    // const deploymentId = "gpt-35-turbo";
    printChatCompletionEvents(
        await client.streamChatCompletions(
            deploymentId,
            [
                {
                    role: "system",
                    content:
                        "You are involved in a chat with 2 users, you need to figure out who is more aggresive, and who is more planned. You can give your score to them from 1 to 10. (1 for less aggressive, less planned, 10 on the other side).",
                },
                {
                    role: "user",
                    name: "Lucy",
                    content:
                        "John, I am glad we're in the same group for the history class assignment.",
                },
                {
                    role: "user",
                    name: "John",
                    content: "What topic should we choose?",
                },
                {
                    role: "user",
                    name: "Lucy",
                    content: "I want to do a survey of Roman emperors. What's your opinion?",
                },
                {
                    role: "user",
                    name: "John",
                    content: "I've no preferences. I'll do whatever you choose.",
                },
            ],
            { maxTokens: 1000 }
        )
    );
}

export async function example_streamChatCompletions_2(client: OpenAIClient) {
    const deploymentId = "gpt-4";
    printChatCompletionEvents(
        await client.streamChatCompletions(
            deploymentId,
            [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant. You will talk like a pirate.",
                },
                { role: "user", content: "Can you help me?" },
                {
                    role: "assistant",
                    content:
                        "Arrrr! Of course, me hearty! What can I do for ye?",
                },
                {
                    role: "user",
                    content: "What's the best way to train a parrot?",
                },
            ],
            { maxTokens: 1000 }
        )
    );
}

export async function example_streamChatCompletions_3(client: OpenAIClient) {
    // example with multiple users
    const deploymentId = "gpt-4";
    // const deploymentId = "gpt-35-turbo";
    printChatCompletionEvents(
        await client.streamChatCompletions(
            deploymentId,
            [
                {
                    role: "system",
                    content:
                        "You are involved in a chat with 2 users, summarize what happened in most concise languages, less than 10 words",
                },
                {
                    role: "user",
                    name: "Lucy",
                    content:
                        "John, I am glad we're in the same group for the history class assignment.",
                },
                {
                    role: "user",
                    name: "John",
                    content: "What topic should we choose?",
                },
                {
                    role: "user",
                    name: "Lucy",
                    content: "I want to do a survey of Roman emperors. What's your opinion?",
                },
                {
                    role: "user",
                    name: "John",
                    content: "I've no preferences. I'll do whatever you choose.",
                },
            ],
            { maxTokens: 1000 }
        )
    );
}

