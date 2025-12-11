import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";
import { setGuildModel, setUserModel, getDefaultModel } from "../../db/index.ts";
import { nanogpt } from "../../api/nanogpt.ts";

export const data = new SlashCommandBuilder()
    .setName("setmodel")
    .setDescription("Set the default AI model")
    .addStringOption((option) =>
        option
            .setName("model")
            .setDescription("The model to use")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("scope")
            .setDescription("Apply to yourself or the entire server")
            .setRequired(false)
            .addChoices(
                { name: "Personal (just me)", value: "user" },
                { name: "Server (everyone)", value: "guild" }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const model = interaction.options.getString("model", true);
    const scope = interaction.options.getString("scope") || "user";

    const guildId = interaction.guildId || "dm";
    const userId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    try {
        // Validate the model exists
        const models = await nanogpt.getModels();
        const modelIds = models.map((m) => m.id || m.name || "");

        if (!modelIds.includes(model)) {
            // Try case-insensitive match
            const matchedModel = modelIds.find(
                (m) => m.toLowerCase() === model.toLowerCase()
            );

            if (!matchedModel) {
                await interaction.editReply({
                    content: `Model "${model}" not found. Use /models to see available models.`,
                });
                return;
            }

            // Use the correctly cased model name
            if (scope === "guild") {
                setGuildModel(guildId, matchedModel);
            } else {
                setUserModel(userId, matchedModel);
            }

            const embed = new EmbedBuilder()
                .setTitle("Default Model Updated")
                .setDescription(
                    scope === "guild"
                        ? `Server default model set to **${matchedModel}**`
                        : `Your personal default model set to **${matchedModel}**`
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Set the model
        if (scope === "guild") {
            setGuildModel(guildId, model);
        } else {
            setUserModel(userId, model);
        }

        const embed = new EmbedBuilder()
            .setTitle("Default Model Updated")
            .setDescription(
                scope === "guild"
                    ? `Server default model set to **${model}**`
                    : `Your personal default model set to **${model}**`
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("[SetModel] Error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        await interaction.editReply({
            content: `Failed to set model: ${errorMessage}`,
        });
    }
}
