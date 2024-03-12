import { resolve } from "path";
import { readFile } from "fs/promises";
import { GameRule, GameRuleCallbacks, play } from "../chat-game";

export type Role =
    | "Villager"
    | "Seer"
    | "Witch"
    | "Hunter"
    | "Guardian"
    | "Werewolf";
export type GameState = {
    livingPlayers: string[];
    roles: Record<string, Role>;
    lastGuard: string | null;
    potionUsed: boolean;
    poisonUsed: boolean;
    round: number;
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
    { roles, livingPlayers }: GameState
): string[] {
    return livingPlayers.filter((name) => roles[name] === role);
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
                properties: {
                    player: {
                        description: "The player to be guard.",
                        type: "string",
                        enum: livingPlayers.filter((p) => p !== lastGuard),
                    },
                },
                required: ["player"],
            }
        );
        await send([
            {
                audiences: livingGuardian,
                content: `You choose to guard ${guardPlayer} in this round`,
                user: null,
            },
        ]);

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
            properties: {
                player: {
                    description: "The player to be eliminated",
                    type: "string",
                    enum: livingPlayers,
                },
            },
            required: ["player"],
        }
    );

    await send([
        {
            audiences: livingWerewolfs,
            user: null,
            content: `${votingWerewolf} selected to eliminate ${killingPlayer}.`,
        },
    ]);

    return killingPlayer;
}

async function witchRound(
    {
        livingWitch,
        killingPlayer,
        livingPlayers,
        potionUsed,
        poisonUsed,
    }: {
        livingWitch: string[];
        killingPlayer: string;
        livingPlayers: string[];
        potionUsed: boolean;
        poisonUsed: boolean;
    },
    { form, send }: GameRuleCallbacks
): Promise<{ healed: boolean; poisonedPlayer: string | null }> {
    const witch = livingWitch[0];

    if (!witch) {
        return { healed: false, poisonedPlayer: null };
    }

    if (!potionUsed && !poisonUsed) {
        const { healed, player: poisonedPlayer = null } = await form(
            witch,
            `The player ${killingPlayer} is being killed, do you want to save him/her with your only potion? The living players are ${livingPlayers.join(
                ", "
            )}, do you want to eliminate any of them with your only poison? You need make your decisions to maximize the villagers and the special characters chances to win.`,
            {
                name: "potionAndPoison",
                description: "Heal a player and optionally poison a player",
                properties: {
                    healed: {
                        type: "boolean",
                        description: "Whether to heal the player with potion",
                    },
                    player: {
                        type: "string",
                        description: "The player to eliminate with poison",
                        enum: livingPlayers,
                    },
                },
                required: ["heal"],
            }
        );

        send([
            {
                audiences: livingWitch,
                user: null,
                content: `${
                    healed
                        ? `You saved player ${killingPlayer}`
                        : `You didn't save player ${killingPlayer}`
                }, ${
                    poisonedPlayer
                        ? `and you poisoned ${poisonedPlayer}`
                        : "and you didn't use the poison."
                }.`,
            },
        ]);
        return { healed, poisonedPlayer };
    }

    if (!potionUsed) {
        const { healed } = await form(
            witch,
            `The player ${killingPlayer} is being killed, do you want to save him/her with your only potion? You need make your decisions to maximize the villagers and the special characters chances to win.`,
            {
                name: "potion",
                description: "Heal a player.",
                properties: {
                    healed: {
                        type: "boolean",
                        description: "Whether to heal the player with potion",
                    },
                },
                required: ["heal"],
            }
        );

        send([
            {
                audiences: livingWitch,
                user: null,
                content: healed
                    ? `You saved player ${killingPlayer}.`
                    : `You didn't save player ${killingPlayer}.`,
            },
        ]);
        return { healed, poisonedPlayer: null };
    }

    if (!poisonUsed) {
        const { player: poisonedPlayer = null } = await form(
            witch,
            `The living players are ${livingPlayers.join(
                ", "
            )}, do you want to eliminate any of them with your only poison? You need make your decisions to maximize the villagers and the special characters chances to win.`,
            {
                name: "poison",
                description: "Optionally poison a player",
                properties: {
                    player: {
                        type: "string",
                        description: "The player to eliminate with poison",
                        enum: livingPlayers,
                    },
                },
                required: [],
            }
        );

        send([
            {
                audiences: livingWitch,
                user: null,
                content: poisonedPlayer
                    ? `and you poisoned ${poisonedPlayer}`
                    : "and you didn't use the poison.",
            },
        ]);
        return { healed: false, poisonedPlayer };
    }

    return { healed: false, poisonedPlayer: null };
}

function numberTh(n: number): string {
    if (n === 1) return "first";
    if (n === 2) return "second";
    if (n === 3) return "third";
    return `${n}th`;
}

async function seerRound(
    {
        livingSeer,
        livingPlayers,
        livingWerewolfs,
    }: {
        livingSeer: string[];
        livingPlayers: string[];
        livingWerewolfs: string[];
    },
    { form, send }: GameRuleCallbacks
): Promise<void> {
    const seer = livingSeer[0];

    if (!seer) {
        return;
    }

    const verifiablePlayers = livingPlayers.filter((p) => p !== seer);

    const { player: testedPlayer = null } = await form(
        seer,
        `The living players besides you are ${verifiablePlayers.join(
            ", "
        )}, please select one to test if he/she is a werewolf.`,
        {
            name: "test",
            description: "Test if a player is werewolf",
            properties: {
                player: {
                    type: "string",
                    description: "The player to test",
                    enum: verifiablePlayers,
                },
            },
            required: [],
        }
    );

    const isWerewolf = livingWerewolfs.includes(testedPlayer);
    send([
        {
            audiences: livingSeer,
            user: null,
            content: `You choose to test ${testedPlayer}, and he/she ${
                isWerewolf ? "is" : "is not"
            } a wereworf.`,
        },
    ]);

    console.log(
        `${seer} tested ${testedPlayer}, and he/she ${
            isWerewolf ? "is" : "is not"
        } a werewolf.`
    );
}

async function announceRound({
    livingPlayers,
    shuffledEliminatedPlayers,
    roles,
}: {
    livingPlayers: string[],
    shuffledEliminatedPlayers: string[],
    roles: Record<string, Role>,
}, callbacks: GameRuleCallbacks): Promise<string[]> {
    const { send } = callbacks;

    send([
        {
            user: null,
            audiences: livingPlayers,
            content:
                shuffledEliminatedPlayers.length > 1
                    ? `Players ${shuffledEliminatedPlayers.join(
                          ", "
                      )} are eliminated.`
                    : shuffledEliminatedPlayers.length > 0
                    ? `Player ${shuffledEliminatedPlayers[0]} is eliminated.`
                    : "No one was eliminated.",
        },
    ]);

    let newLivingPlayers = livingPlayers.filter(p => !shuffledEliminatedPlayers.includes(p));

    for (const player of shuffledEliminatedPlayers) {
        newLivingPlayers = await eliminationRound({ player, livingPlayers: newLivingPlayers, roles }, callbacks);
    }

    return newLivingPlayers;
}

async function discussRound({
    shuffledEliminatedPlayers,
    livingPlayers,
}: {
    shuffledEliminatedPlayers: string[],
    livingPlayers: string[],
}, { chat, send }: GameRuleCallbacks): Promise<void> {
    for (const player of livingPlayers) {
        if (shuffledEliminatedPlayers.includes(player)) {
            continue;
        }

        const content = await chat(
            player,
            "Please share out your point of view on who we should suspect or who we should trust. You comments may impact the vote of elimination during the day, please comment carefully to maximum your camp's chance to win.",
            livingPlayers
        );

        await send([{
            user: player,
            content,
            audiences: livingPlayers,
        }]);
    }
}

async function voteRound(
    {
        livingPlayers,
        roles,
    }: { livingPlayers: string[]; roles: Record<string, Role> },
    callback: GameRuleCallbacks
): Promise<string[]> {
    let targetPlayers = livingPlayers;
    const { form, send, chat } = callback;

    while (targetPlayers.length > 1) {
        const votes = await Promise.all(
            livingPlayers.map((player) =>
                form(player, "", {
                    name: "vote",
                    description: `Vote the player you want to eliminate in this round. In order to maximize your camp's chance to win. The vote targets are ${targetPlayers.join(
                        ", "
                    )}`,
                    properties: {
                        player: {
                            type: "string",
                            description: "The player you vote to eliminate",
                            enum: targetPlayers,
                        },
                    },
                    required: ["player"],
                }).then((value) => ({ player, target: value.player as string }))
            )
        );

        const { max, scores } = votes.reduce(
            ({ max, scores }, { target }) => {
                scores[target] ??= 0;
                scores[target] += 1;
                return {
                    max: max < scores[target] ? scores[target] : max,
                    scores,
                };
            },
            { max: 0, scores: {} as Record<string, number> }
        );

        targetPlayers = targetPlayers.filter((p) => scores[p] === max);

        await send([
            {
                user: null,
                audiences: livingPlayers,
                content: `The vote results are\n${votes
                    .map(
                        ({ player, target }) =>
                            `* ${player} vote to eliminate ${target}`
                    )
                    .join("\n")}`,
            },
            {
                user: null,
                audiences: livingPlayers,
                content:
                    targetPlayers.length === 1
                        ? `Player ${targetPlayers[0]} is eliminated`
                        : `Players ${targetPlayers.join(
                              ", "
                          )} get the maximum ${max} votes, let's vote again, only in them.`,
            },
        ]);
    }

    return await eliminationRound({ player: targetPlayers[0], roles, livingPlayers }, callback);
}

export async function eliminationRound({
    player,
    livingPlayers,
    roles,
}: {
    player: string,
    livingPlayers: string[],
    roles: Record<string, Role>,
}, callbacks: GameRuleCallbacks): Promise<string[]> {
    const { chat, form, send } = callbacks;
    const content = await chat(
        player,
        "You were eliminated, please leave your last comment",
        livingPlayers
    );
    await send([{
        user: player,
        content,
        audiences: livingPlayers,
    }]);

    if (roles[player] === "Hunter") {
        const result = await form(
            player,
            `As the Hunter, you can optionally choose a player to eliminate with your gun, available targets are ${livingPlayers.join(
                ", "
            )}.`,
            {
                name: "shoot",
                description: "Shoot a player to elimination.",
                properties: {
                    player: {
                        type: "string",
                        description: "The playerto eliminate.",
                        enum: livingPlayers,
                    },
                },
                required: [],
            }
        );
        if (result.player) {
            const shotPlayer: string = result.player;
            await send([{
                user: null,
                audiences: livingPlayers,
                content: `Player ${player} is a hunter, he/she choose to shoot ${result.player}.`,
            }]);

            return eliminationRound({
                player: result.player as string,
                livingPlayers: livingPlayers.filter(p => p !== shotPlayer),
                roles,
            }, callbacks);
        }
        await send([{
            user: null,
            audiences: livingPlayers,
            content: `Player ${player} is a hunter, he/she choose not to shoot.`,
        }]);
    }
    return livingPlayers;
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
                livingPlayers: users,
                roles: {},
                lastGuard: null,
                potionUsed: false,
                poisonUsed: false,
                round: 1,
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
        next: async (state, callbacks) => {
            const { chat, form, send } = callbacks;
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
            await send([
                {
                    user: null,
                    content: `Now is the ${numberTh(state.round)} night.`,
                    audiences: livingPlayers,
                },
            ]);

            // 1. Guardian round
            const guardedPlayer = await guardianRound(
                { livingGuardian, livingPlayers, lastGuard: state.lastGuard },
                callbacks
            );
            console.log(
                `${guardedPlayer} is guarded by ${livingGuardian.join(", ")}`
            );

            // 2. Werewolf round
            const killingPlayer = await werewolfRound(
                { livingPlayers, livingWerewolfs },
                callbacks
            );
            console.log(
                `${killingPlayer} is being killed by ${livingWerewolfs.join(
                    ", "
                )}`
            );

            // 3. Witch round
            const { healed, poisonedPlayer } = await witchRound(
                {
                    livingWitch,
                    killingPlayer,
                    livingPlayers,
                    potionUsed: state.potionUsed,
                    poisonUsed: state.poisonUsed,
                },
                callbacks
            );

            console.log(
                `${livingWitch} choose to ${
                    healed ? "heal" : "not heal"
                } ${killingPlayer}, and use poison on ${poisonedPlayer}`
            );

            // 4. Seer round
            await seerRound(
                { livingSeer, livingPlayers, livingWerewolfs },
                callbacks
            );

            // Day
            await send([
                {
                    user: null,
                    content: `Now is the ${numberTh(state.round)} day.`,
                    audiences: livingPlayers,
                },
            ]);

            const eliminatedPlayers = [];
            if (poisonedPlayer) {
                eliminatedPlayers.push(poisonedPlayer);
            }
            if (killingPlayer && !healed && guardedPlayer !== killingPlayer) {
                eliminatedPlayers.push(killingPlayer);
            }
            const shuffledEliminatedPlayers = shuffleArray(eliminatedPlayers);

            // 1. Announce the night phase result
            const livingPlayers1 = await announceRound(
                {
                    shuffledEliminatedPlayers,
                    livingPlayers,
                    roles: state.roles,
                },
                callbacks
            );

            // 2. Discuss round
            await discussRound({
                livingPlayers: livingPlayers1,
                shuffledEliminatedPlayers,
            }, callbacks);

            // 3. Vote round
            const livingPlayers2 = await voteRound({
                livingPlayers: livingPlayers1,
                roles: state.roles,
            }, callbacks);

            return {
                roles: state.roles,
                livingPlayers: livingPlayers2,
                lastGuard: guardedPlayer,
                poisonUsed: state.poisonUsed || poisonedPlayer !== null,
                potionUsed: state.potionUsed || healed,
                round: state.round + 1,
            };
        },
    };
}
