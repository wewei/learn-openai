import { ChatRequestMessage, OpenAIClient } from "@azure/openai";
import { Agent, GameRule, Message } from "../chat-game";

export function roundChat(): GameRule<{
    users: string[],
    index: number,
}> {
    return {
        init: (users) => {
            return {
                state: { users, index: 0 },
                messages: [{ audiences: users, content: 'Welcome to join the chat!', user: null }],
            };
        },
        next: async ({ users, index }, chat, form) => {
            const user = users[index];
            const { content } = await chat({
                type: "Chat",
                user,
                instructions: "Your turn to speak.",
                audience: users,
            });
            return {
                state: { users, index: (index + 1) % users.length },
                messages: [{ user, content, audiences: users }],
            };
        },
    };
}
