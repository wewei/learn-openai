import { resolve } from "path";
import { readFile } from "fs/promises";
import { ExtMessage, GameRule, GameRuleCallbacks } from "../chat-game";
import { Form } from "../chat-game/form";

export type Role =
    | "Villager"
    | "Seer"
    | "Witch"
    | "Hunter"
    | "Guardian"
    | "Werewolf";
export type GameState = {
    killed: Record<string, boolean>;
    roles: Record<string, Role>;
    lastGuard: string | null;
    potionUsed: boolean;
    poisonUsed: boolean;
};

function loadText(fileName: string): Promise<string> {
    return readFile(resolve(__dirname, fileName), "utf-8");
}

const textGameRules = loadText("game-rules.txt");
const textInstructionsWerewolf = loadText("instructions-werewolf.txt");
const textInstructionsSeer = loadText("instructions-seer.txt");
const textInstructionsWitch = loadText("instructions-witch.txt");
const textInstructionsHunter = loadText("instructions-hunter.txt");
const textInstructionsGuardian = loadText("instructions-guardian.txt");
const textInstructionsVillager = loadText("instructions-villager.txt");

function shuffleArray<T>(array: T[]): T[] {
    const shuffledArray = [...array]; // Create a copy of the original array

    // Fisher-Yates shuffle algorithm
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // Generate a random index between 0 and i
        [shuffledArray[i], shuffledArray[j]] = [
            shuffledArray[j],
            shuffledArray[i],
        ]; // Swap elements at indices i and j
    }

    return shuffledArray;
}

function livingPlayersWithRole(
    role: Role,
    { roles, killed }: GameState
): string[] {
    return Object.keys(roles).filter(
        (name) => roles[name] === role && !killed[name]
    );
}

async function guardianRound(
    {
        livingGuardian,
        livingPlayers,
        lastGuard,
    }: {
        livingGuardian: string[];
        livingPlayers: string[];
        lastGuard: string | null;
    },
    { form, send }: GameRuleCallbacks
): Promise<string | null> {
    if (livingGuardian[0]) {
        const { player: guardPlayer } = await form(
            livingGuardian[0],
            `The current living players are ${livingPlayers},${
                lastGuard
                    ? ` except for ${lastGuard} who you protected last night,`
                    : ""
            } please select the player you want to guard this round.`,
            {
                name: "guard",
                description: "To guard a player.",
                type: {
                    type: "object",
                    properties: {
                        player: {
                            description: "The player to be guard.",
                            type: "string",
                            enum: livingPlayers.filter((p) => p !== lastGuard),
                        },
                    },
                },
            }
        );
        await send([
            {
                audiences: livingGuardian,
                content: `You choose to guard ${guardPlayer} in this round`,
                user: null,
            },
        ]);

        console.log(guardPlayer);
        return guardPlayer;
    }
    return null;
}

async function werewolfRound(
    {
        livingWerewolfs,
        livingPlayers,
    }: {
        livingWerewolfs: string[];
        livingPlayers: string[];
    },
    { chat, form, send }: GameRuleCallbacks
): Promise<string> {
    const shuffleWerewolfs = shuffleArray(livingWerewolfs);
    const votingWerewolf = shuffleWerewolfs[0];
    await send([
        {
            user: null,
            content: `The current living werewolfs are ${livingWerewolfs}, the current living players are ${livingPlayers}. Werewolf camp, please discuss and decide which player to elimiate this round. Please make comments one by one, and ${votingWerewolf} will make the final call.`,
            audiences: shuffleWerewolfs,
        },
    ]);
    for (let i = 1; i < shuffleWerewolfs.length; i += 1) {
        const user = shuffleWerewolfs[i];
        const content = await chat(
            user,
            `Please suggest which player you want to eliminate for this round.`,
            shuffleWerewolfs
        );
        await send([
            {
                user,
                content,
                audiences: livingWerewolfs,
            },
        ]);
    }

    const { player: killingPlayer } = await form(
        votingWerewolf,
        "Please select the player you want to eliminate to maximum your werewolf camp's chance to win based on the conversation.",
        {
            name: "eliminate",
            description: "To eliminate a player",
            type: {
                type: "object",
                properties: {
                    player: {
                        description: "The player to be eliminated",
                        type: "string",
                        enum: livingPlayers,
                    },
                },
                required: ["player"],
            },
        }
    );

    await send([
        {
            audiences: livingWerewolfs,
            user: null,
            content: `${votingWerewolf} selected to eliminate ${killingPlayer}.`,
        },
    ]);

    console.log(`${votingWerewolf} selected to eliminate ${killingPlayer}.`);

    return killingPlayer;
}

export async function werewolfGame(): Promise<GameRule<GameState>> {
    const [
        strGameRules,
        strInstructionsWerewolf,
        strInstructionsSeer,
        strInstructionsWitch,
        strInstructionsHunter,
        strInstructionsGuardian,
        strInstructionsVillager,
    ] = await Promise.all([
        textGameRules,
        textInstructionsWerewolf,
        textInstructionsSeer,
        textInstructionsWitch,
        textInstructionsHunter,
        textInstructionsGuardian,
        textInstructionsVillager,
    ]);

    return {
        init: async (users, { send }) => {
            const state: GameState = {
                killed: {},
                roles: {},
                lastGuard: null,
                potionUsed: false,
                poisonUsed: false,
            };
            if (users.length !== 12) {
                console.log(users);
                throw Error("The must be 12 players in the game.");
            }

            const shuffled = shuffleArray(users);
            for (let i = 0; i < 12; i += 1) {
                if (i < 4) {
                    state.roles[shuffled[i]] = "Werewolf";
                } else if (i < 5) {
                    state.roles[shuffled[i]] = "Seer";
                } else if (i < 6) {
                    state.roles[shuffled[i]] = "Witch";
                } else if (i < 7) {
                    state.roles[shuffled[i]] = "Hunter";
                } else if (i < 8) {
                    state.roles[shuffled[i]] = "Guardian";
                } else {
                    state.roles[shuffled[i]] = "Villager";
                }
            }
            await send([
                { user: null, audiences: users, content: strGameRules },
                {
                    user: null,
                    audiences: users.filter(
                        (user) => state.roles[user] === "Werewolf"
                    ),
                    content: strInstructionsWerewolf,
                },
                {
                    user: null,
                    audiences: users.filter(
                        (user) => state.roles[user] === "Seer"
                    ),
                    content: strInstructionsSeer,
                },
                {
                    user: null,
                    audiences: users.filter(
                        (user) => state.roles[user] === "Witch"
                    ),
                    content: strInstructionsWitch,
                },
                {
                    user: null,
                    audiences: users.filter(
                        (user) => state.roles[user] === "Hunter"
                    ),
                    content: strInstructionsHunter,
                },
                {
                    user: null,
                    audiences: users.filter(
                        (user) => state.roles[user] === "Guardian"
                    ),
                    content: strInstructionsGuardian,
                },
                {
                    user: null,
                    audiences: users.filter(
                        (user) => state.roles[user] === "Villager"
                    ),
                    content: strInstructionsVillager,
                },
            ]);

            return state;
        },
        next: async (state, { chat, form, send }) => {
            const allPlayers = Object.keys(state.roles);
            const livingWerewolfs = livingPlayersWithRole("Werewolf", state);
            const livingVillagers = livingPlayersWithRole("Villager", state);
            const livingSeer = livingPlayersWithRole("Seer", state);
            const livingWitch = livingPlayersWithRole("Witch", state);
            const livingHunter = livingPlayersWithRole("Hunter", state);
            const livingGuardian = livingPlayersWithRole("Guardian", state);
            const livingSpecChar = [
                ...livingSeer,
                ...livingWitch,
                ...livingHunter,
                ...livingGuardian,
            ];
            const livingPlayers = [
                ...livingWerewolfs,
                ...livingVillagers,
                ...livingSpecChar,
            ];

            // Game Ends
            if (livingWerewolfs.length === 0) {
                await send([
                    {
                        user: null,
                        audiences: allPlayers,
                        content:
                            "The villagers and the special characters win, Congratulations!!!",
                    },
                ]);
                return null;
            }
            if (
                livingVillagers.length === 0 ||
                livingSpecChar.length === 0 ||
                livingVillagers.length + livingSpecChar.length <=
                    livingWerewolfs.length
            ) {
                await send([
                    {
                        user: null,
                        audiences: allPlayers,
                        content: "The werewolfs win, Congratulations!!!",
                    },
                ]);
                return null;
            }

            // Night
            // 1. Guardian round
            const guardPlayer: string | null = await guardianRound(
                { livingGuardian, livingPlayers, lastGuard: state.lastGuard },
                { form, chat, send }
            );

            // 2. Werewolf round
            const killingPlayer: string = await werewolfRound(
                { livingPlayers, livingWerewolfs },
                { form, chat, send }
            );
            return null;
        },
    };
}
