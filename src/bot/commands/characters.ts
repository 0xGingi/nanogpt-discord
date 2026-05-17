import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt, type QueryParams } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";

export const data = new SlashCommandBuilder()
    .setName("characters")
    .setDescription("NanoGPT character APIs")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("search")
            .setDescription("Search public characters")
            .addStringOption((option) => option.setName("query").setDescription("Search query").setRequired(false))
            .addIntegerOption((option) => option.setName("limit").setDescription("Result limit").setRequired(false).setMinValue(1).setMaxValue(100))
            .addStringOption((option) => option.setName("json").setDescription("Advanced query JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("mine")
            .setDescription("List your characters")
            .addStringOption((option) => option.setName("json").setDescription("Advanced query JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("view").setDescription("View a character").addStringOption((option) => option.setName("id").setDescription("Character ID or slug").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("create").setDescription("Create a character").addStringOption((option) => option.setName("json").setDescription("Character JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("edit")
            .setDescription("Edit a character")
            .addStringOption((option) => option.setName("id").setDescription("Character ID or slug").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Patch JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("delete").setDescription("Delete a character").addStringOption((option) => option.setName("id").setDescription("Character ID or slug").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("review")
            .setDescription("Review a character")
            .addStringOption((option) => option.setName("id").setDescription("Character ID or slug").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Review JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("report")
            .setDescription("Report a character")
            .addStringOption((option) => option.setName("id").setDescription("Character ID or slug").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Report JSON").setRequired(true))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const subcommand = interaction.options.getSubcommand();
        const id = interaction.options.getString("id");
        let result: unknown;
        if (subcommand === "search") {
            result = await nanogpt.listCharacters(mergeDefined(parseJsonOption(interaction.options.getString("json")), {
                q: interaction.options.getString("query"),
                limit: interaction.options.getInteger("limit"),
            }) as QueryParams);
        } else if (subcommand === "mine") {
            result = await nanogpt.myCharacters(parseJsonOption(interaction.options.getString("json")) as QueryParams);
        } else if (subcommand === "view" && id) {
            result = await nanogpt.getCharacter(id);
        } else if (subcommand === "create") {
            result = await nanogpt.createCharacter(parseJsonOption(interaction.options.getString("json")));
        } else if (subcommand === "edit" && id) {
            result = await nanogpt.patchCharacter(id, parseJsonOption(interaction.options.getString("json")));
        } else if (subcommand === "delete" && id) {
            result = await nanogpt.deleteCharacter(id);
        } else if (subcommand === "review" && id) {
            result = await nanogpt.reviewCharacter(id, parseJsonOption(interaction.options.getString("json")));
        } else if (subcommand === "report" && id) {
            result = await nanogpt.reportCharacter(id, parseJsonOption(interaction.options.getString("json")));
        } else {
            throw new Error("Invalid character command.");
        }
        await replyJson(interaction, "Characters", result, "nanogpt-characters.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Character command failed." });
    }
}
