import * as readline from "readline";

export type ChatRequest = {
    type: 'Chat';
    user: string;
    instructions: string;
    audience: string[];
};

export type ChatResponse = {
    request: ChatRequest;
    content: string;
};

export const tyUnit = Symbol("@unit");
export const tyString = Symbol("@string");
export const tyNumber = Symbol("@number");
export const tyBoolean = Symbol("@boolean");
export const tyNull = Symbol("@null");

export type PrimaryTypes
    = typeof tyUnit
    | typeof tyString
    | typeof tyNumber
    | typeof tyBoolean
    | typeof tyNull

export type ProductType = {
    ctor: "Product";
    fragments: Record<
        string,
        {
            description: string;
            type: Type;
        }
    >;
};

export type UnionType = {
    ctor: "Union";
    fragments: Record<
        string,
        {
            description: string;
            type: Type;
        }
    >;
};

export type ListType = {
    ctor: "List";
    type: Type;
};

export type Type = PrimaryTypes | ProductType | UnionType | ListType;

export type FormRequest = {
    type: 'Form';
    user: string;
    instructions: string;
    valueType: Type;
};

export type FormResponse = {
    request: FormRequest;
    value: any;
};

export type Request = ChatRequest | FormRequest;
export type Response = ChatResponse | FormResponse;

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
    chat: (req: ChatRequest) => Promise<ChatResponse>;
    form: (req: FormRequest) => Promise<FormResponse>;
};

export type GameRule<T> = {
    init: (users: string[]) => { state: T; messages: ExtMessage[] };
    next: (
        state: T,
        chat: (req: ChatRequest) => Promise<ChatResponse>,
        form: (req: FormRequest) => Promise<FormResponse>
    ) => Promise<{
        state: T | null;
        messages: ExtMessage[];
    }>;
};

export async function play<T>(
    { init, next }: GameRule<T>,
    users: Record<string, Agent>
) {
    function deliverMessages(messages: ExtMessage[]) {
        const cache: Record<string, Message[]> = {};
        messages.forEach(({ audiences, user, content }) => {
            audiences.forEach(audi => {
                cache[audi] ??= [];
                cache[audi].push({ user, content });
            });
        });
        return Promise.all(Object.keys(cache).map(name => users[name].send(cache[name])));
    }

    const { state, messages } = init(Object.keys(users));
    let stateCur: T | null = state;

    await deliverMessages(messages);

    while (stateCur) {
        const { state: stateNxt, messages } = await next(
            stateCur,
            (req) => users[req.user].chat(req),
            (req) => users[req.user].form(req)
        );
        stateCur = stateNxt;
        deliverMessages(messages);
    }
}

export function consoleAgent(name: string): Agent {
    const withReadline = async <T>(
        cb: (rl: readline.Interface) => Promise<T>
    ): Promise<T> => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const result = await cb(rl);
        rl.close();
        return result;
    };

    return {
        init: async () => {},
        send: async (messages) =>
            withReadline(async (rl) => {
                messages.forEach(({ user, content }) => {
                    rl.write(`[${name}] From ${user || "<system>"}: ${content}`);
                });
            }),
        chat: async (request) => withReadline(async rl => {
            const { audience, instructions } = request;
            rl.write(`[${name}] To ${audience.join(', ')}`);
            rl.write(`[${name}] Instructions: ${instructions}`);
            return new Promise((resolve) => {
                rl.question(`[${name}]: `, (content) => {
                    resolve({ request, content })
                });
            });
        }),
        form: async (request) => withReadline(async rl => {
            const { instructions } = request;
            rl.write(`[${name}] Instructions: ${instructions}`);
            return new Promise((resolve) => {
                rl.question(`[${name}]: `, (content) => {
                    resolve({ request, value: content })
                });
            });
        }),
    };
}

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