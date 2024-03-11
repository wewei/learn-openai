import { GameRule } from "../chat-game";

export function roundChat(): GameRule<{
    users: string[],
    index: number,
}> {
    return {
        init: async (users, send) => {
            await send([{ audiences: users, content: 'Welcome to join the chat!', user: null }]);
            return { users, index: 0 };
        },
        next: async ({ users, index }, chat, form, send) => {
            const user = users[index];
            const content = await chat(user, "Your turn to speak.", users);
            await send([{ user, content, audiences: users }]);
            return { users, index: (index + 1) % users.length };
        },
    };
}
