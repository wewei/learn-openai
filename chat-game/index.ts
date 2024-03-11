import { Form } from "./form";

// export type ChatRequest = {
//     type: "Chat";
//     user: string;
//     instructions: string;
//     audience: string[];
// };

// export type ChatResponse = {
//     request: ChatRequest;
//     content: string;
// };

// export type FormRequest = {
//     type: "Form";
//     user: string;
//     instructions: string;
//     form: Form;
// };

// export type FormResponse = {
//     request: FormRequest;
//     value: any;
// };

// export type Request = ChatRequest | FormRequest;
// export type Response = ChatResponse | FormResponse;

export type Message = {
    user: string | null;
    content: string;
};

export type ExtMessage = Message & {
    audiences: string[];
};

export type Agent = {
    init: () => Promise<void>;
    send: (messages: Message[]) => Promise<void>;
    chat: (instructions: string, audiences: string[]) => Promise<string>;
    form: (instructions: string, form: Form) => Promise<any>;
};

export type GameRuleCallbacks = {
    chat: (
        user: string,
        instructions: string,
        audiences: string[]
    ) => Promise<string>;
    form: (user: string, instructions: string, form: Form) => Promise<any>;
    send: (message: ExtMessage[]) => Promise<void>;
};

export type GameRule<T> = {
    init: (users: string[], callbacks: GameRuleCallbacks) => Promise<T>;
    next: (state: T, callbacks: GameRuleCallbacks) => Promise<T | null>;
};

export async function play<T>(
    { init, next }: GameRule<T>,
    users: Record<string, Agent>
) {
    const callbacks: GameRuleCallbacks = {
        chat: (user, instructions, audiences) =>
            users[user].chat(
                instructions,
                audiences.filter((u) => u !== user)
            ),
        form: (user, instructions, form) =>
            users[user].form(instructions, form),
        send: (messages: ExtMessage[]) => {
            const cache: Record<string, Message[]> = {};
            messages.forEach(({ audiences, user, content }) => {
                audiences.forEach((audi) => {
                    cache[audi] ??= [];
                    cache[audi].push({ user, content });
                });
            });
            return Promise.all(
                Object.keys(cache).map((name) => users[name].send(cache[name]))
            ).then(() => {});
        },
    };

    const state = await init(Object.keys(users), callbacks);
    let stateCur: T | null = state;

    while (stateCur) {
        stateCur = await next(stateCur, callbacks);
    }
}
