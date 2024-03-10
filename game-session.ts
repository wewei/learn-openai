export type ChatResponse = {
    type: 'Chat';
    user: string;
    content: string;
    audiences: string[];
};

export type InvokeResponse<TMethod> = {
    type: 'Invoke';
    user: string;
    method: TMethod;
};

export type Response<TMethod> = ChatResponse | InvokeResponse<TMethod>;

export type UserMessage = {
    type: 'User';
    name: string;
    content: string;
    audiences: string[];
};

export type SystemMessage = {
    type: 'System';
    content: string;
    audiences: string[];
};

export type Message = UserMessage | SystemMessage;

export type GameSession<TState> = {
    // Hidden state of the session
    state: TState;

    // Background information everyone knows
    background: string;

    // Characters and their private background information 
    characters: Record<string, string>;

    // All messages from the users
    message: Message[];
};

export type ChatRequest = {
    type: 'Chat';
    user: string;
    instruction: string;
    audiences: string[];
};

export type InvokeRequest<TMethod> = {
    type: 'Invoke';
    user: string;
    instruction: string;
    method: TMethod;
};

export type Request<TMethod> = ChatRequest | InvokeRequest<TMethod>;

export type Charactor<TMethod> = {
    chat: (messages: Message[], req: ChatRequest) => Promise<ChatResponse>;
    invoke: <T extends TMethod>(messages: Message[], req: InvokeRequest<T>) => Promise<InvokeResponse<T>>;
};

export type SessionDefinition<TState, TMethod> = {
    // Initial state
    initial: () => GameSession<TState>;

    // Get character by name
    character: (name: string) => Charactor<TMethod> | null;

    // Decide who is next to speak
    next: (session: GameSession<TState>) => Request<TMethod>;

    // Iterate the session on invocations
    iterate: (invoke: InvokeResponse<TMethod>) => (session: GameSession<TState>) => GameSession<TState> | null;
};

export async function play<TState, TMethod>({
    initial,
    character,
    next,
    iterate
}: SessionDefinition<TState, TMethod>) {
    let session: GameSession<TState> | null = initial();

    while (session) {
        const req = next(session);
        const cha = character(req.user);
        if (cha) {
            const { chat, invoke } = cha;
            const messages: Message[] = session.message.filter(({ audiences }) => audiences.indexOf(req.user) >= 0);
            const res = await (req.type === 'Chat' ? chat(messages, req) : invoke(messages, req));
            if (res.type === 'Chat') {
                session.message.push({
                    type: 'User',
                    name: res.user,
                    content: res.content,
                    audiences: res.audiences,
                });
            } else if (res.type === 'Invoke') {
                session = iterate(res)(session);
            }
        }
    }
}
