import { Type } from "./types";

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
            (req) =>
                users[req.user].chat({
                    ...req,
                    audience: req.audience.filter((user) => user !== req.user),
                }),
            (req) => users[req.user].form(req)
        );
        stateCur = stateNxt;
        deliverMessages(messages);
    }
}