import { resolve } from "path";
import { readFile } from "fs/promises";
import { ExtMessage, GameRule } from "../chat-game";

export type GameState = {
    killed: Record<string, boolean>;
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

    console.log(strGameRules);
    console.log(strInstructionsWerewolf);
    console.log(strInstructionsSeer);
    console.log(strInstructionsWitch);
    console.log(strInstructionsHunter);
    console.log(strInstructionsGuardian);
    console.log(strInstructionsVillager);

    return {
        init(users: string[]) {
            const messages: ExtMessage[] = [];
            const state: GameState = { killed: {} };
            if (users.length !== 12) {
                throw Error("The must be 12 players in the game.");
            }

            return { state, messages };
        },
        next(state, chat, form) {
            return Promise.resolve({ state: null, messages: [] });
        },
    };
}
