import { Collection, ChatInputCommandInteraction, SlashCommandBuilder, AutocompleteInteraction } from "discord.js";

import * as chat from "./chat.ts";
import * as models from "./models.ts";
import * as setmodel from "./setmodel.ts";
import * as usage from "./usage.ts";
import * as context from "./context.ts";
import * as help from "./help.ts";
import * as imagine from "./imagine.ts";
import * as memory from "./memory.ts";
import * as scrape from "./scrape.ts";
import * as responses from "./responses.ts";
import * as messages from "./messages.ts";
import * as completion from "./completion.ts";
import * as extract from "./extract.ts";
import * as image from "./image.ts";
import * as video from "./video.ts";
import * as audio from "./audio.ts";
import * as search from "./search.ts";
import * as embed from "./embed.ts";
import * as detect from "./detect.ts";
import * as youtube from "./youtube.ts";
import * as tokens from "./tokens.ts";
import * as tee from "./tee.ts";
import * as characters from "./characters.ts";

export interface Command {
    data: Pick<SlashCommandBuilder, "name" | "toJSON">;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export const commands = new Collection<string, Command>();

// Register all commands
const commandModules = [
    chat,
    models,
    setmodel,
    usage,
    context,
    help,
    imagine,
    memory,
    scrape,
    responses,
    messages,
    completion,
    extract,
    image,
    video,
    audio,
    search,
    embed,
    detect,
    youtube,
    tokens,
    tee,
    characters,
];

for (const command of commandModules) {
    commands.set(command.data.name, command as Command);
}

// Export command data for registration
export function getCommandsJSON() {
    return commandModules.map((cmd) => cmd.data.toJSON());
}
