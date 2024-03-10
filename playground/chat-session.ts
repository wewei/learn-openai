import * as readline from 'readline';
import { OpenAIClient } from "@azure/openai";

export type ChatOutput = {
    context: Promise<string>;
};

export function chatSession(client: OpenAIClient, deploymentId: string) {
    async function chat(context: string, content: string, onSnippet: (snippet: string) => void, onComplete: () => void): Promise<ChatOutput> {
        const events = await client.streamChatCompletions(
            deploymentId,
            [
                {
                    role: "system",
                    content: `Response user's message in context: ${context}`,
                },
                {
                    role: "user",
                    content,
                },
            ]
        );

        const newContext = new Promise<string>(async resolve => {
            const snippets: string[] = []
            for await (const event of events) {
                for (const choice of event.choices) {
                    const snippet = choice.delta?.content || "";
                    snippets.push(snippet);
                    onSnippet(snippet);
                }
            }
            onComplete();
            resolve(snippets.join(""));
        }).then(async assContent => {
            const response = await client.getChatCompletions(deploymentId, [
                {
                    role: "system",
                    content: "You are a content compresser, based on the context and user contents, summarize the new context in less than 200 words.",
                },
                {
                    role: "system",
                    content: `The current context: ${context}`,
                },
                {
                    role: "user",
                    name: "user",
                    content,
                },
                {
                    role: "user",
                    name: "assistant",
                    content: assContent,
                },
            ]);
            return response.choices[0]?.message?.content || context;
        });

        return { context: newContext };
    };

    return chat;
};

export async function runChatSession(client: OpenAIClient) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const chat = chatSession(client, "gpt-4");
    async function chatLoop(context: string) {
        console.log(`[] Current context: ${context}`);
        rl.question("Your message > ", async (content) => {
            if (content === "quit") {
                console.log("[] Existing ...");
                rl.close();
                return;
            }

            console.log("[] Response:");

            const { context: newContext } = await chat(
                context,
                content,
                (snippet) => process.stdout.write(snippet),
                () => {
                    process.stdout.write("\n");
                    console.log("[] Compressing context ...");
                }
            );

            chatLoop(await newContext);
        });
    }
    chatLoop("");
}