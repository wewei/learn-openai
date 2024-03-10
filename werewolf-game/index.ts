import { resolve } from "path";
import { readFile } from "fs/promises";
import { ExtMessage, GameRule } from "../chat-game";
import { Type, tyString, tyUnit } from "../chat-game/types";

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

function makeEnum(values: string[]): Type {
    return {
        ctor: "Union",
        fragments: values.reduce((m, name) => {
            m[name] = {
                description: `User ${name}`,
                type: tyUnit,
            };
            return m;
        }, {} as Record<string, { description: string; type: Type }>),
    };
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

    // console.log(strGameRules);
    // console.log(strInstructionsWerewolf);
    // console.log(strInstructionsSeer);
    // console.log(strInstructionsWitch);
    // console.log(strInstructionsHunter);
    // console.log(strInstructionsGuardian);
    // console.log(strInstructionsVillager);

    return {
        init: async (users, send) => {
            const state: GameState = { killed: {}, roles: {} };
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
        next: async (state, chat, form, send) => {
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
            // 1. Werewolf round
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
                const name = shuffleWerewolfs[i];
                const res = await chat({
                    type: "Chat",
                    user: name,
                    audience: shuffleWerewolfs,
                    instructions: `Please suggest which player you want to eliminate for this round.`,
                });
                await send([{
                    user: name,
                    content: res.content,
                    audiences: livingWerewolfs,
                }]);
            }

            const { value: killingPlayer } = await form({
                type: "Form",
                user: votingWerewolf,
                valueType: makeEnum(livingPlayers),
                instructions:
                    "Please select the player you want to eliminate to maximum your werewolf camp's chance to win.",
            });

            await send([{
                audiences: livingWerewolfs,
                user: null,
                content: `${votingWerewolf} selected to eliminate ${killingPlayer}.`,
            }]);
        
            return null;
        },
    };
}
