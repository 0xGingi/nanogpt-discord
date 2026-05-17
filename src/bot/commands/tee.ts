import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { parseJsonOption, replyJson } from "./nanogpt-utils.ts";

export const data = new SlashCommandBuilder()
    .setName("tee")
    .setDescription("TEE verification metadata")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("attestation")
            .setDescription("Get TEE attestation for a model")
            .addStringOption((option) => option.setName("model").setDescription("Model").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("signature")
            .setDescription("Get or verify a TEE signature")
            .addStringOption((option) => option.setName("json").setDescription("Signature request JSON").setRequired(true))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const result = interaction.options.getSubcommand() === "attestation"
            ? await nanogpt.teeAttestation(interaction.options.getString("model", true))
            : await nanogpt.teeSignature(parseJsonOption(interaction.options.getString("json")));
        await replyJson(interaction, "TEE", result, "nanogpt-tee.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to fetch TEE metadata." });
    }
}
