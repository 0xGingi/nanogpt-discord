import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";

export const data = new SlashCommandBuilder()
    .setName("models")
    .setDescription("List available AI models");

function createEmbed(page: string[], pageIndex: number, totalPages: number, totalModels: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("Available Models")
        .setDescription(page.map((name) => `- ${name}`).join("\n"))
        .setFooter({
            text: `Page ${pageIndex + 1}/${totalPages} | Total: ${totalModels} models`,
        })
        .setTimestamp();
}

function createButtons(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("models_prev")
            .setLabel("◀ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId("models_next")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages - 1)
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const models = await nanogpt.getModels();

        if (!models || models.length === 0) {
            await interaction.editReply({
                content: "No models available. Please check your API subscription.",
            });
            return;
        }

        // Group models into chunks for pagination
        const MODELS_PER_PAGE = 25;
        const modelNames = models.map((m) => m.id || m.name || "Unknown");
        const pages: string[][] = [];

        for (let i = 0; i < modelNames.length; i += MODELS_PER_PAGE) {
            pages.push(modelNames.slice(i, i + MODELS_PER_PAGE));
        }

        let currentPage = 0;

        // Send the first page with buttons
        const message = await interaction.editReply({
            embeds: [createEmbed(pages[currentPage], currentPage, pages.length, modelNames.length)],
            components: pages.length > 1 ? [createButtons(currentPage, pages.length)] : [],
        });

        // If only one page, no need for pagination
        if (pages.length <= 1) return;

        // Create a collector for button interactions
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 5 * 60 * 1000, // 5 minutes
        });

        collector.on("collect", async (buttonInteraction) => {
            // Only allow the original user to use the buttons
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: "Only the command author can use these buttons.",
                    ephemeral: true,
                });
                return;
            }

            if (buttonInteraction.customId === "models_prev" && currentPage > 0) {
                currentPage--;
            } else if (buttonInteraction.customId === "models_next" && currentPage < pages.length - 1) {
                currentPage++;
            }

            await buttonInteraction.update({
                embeds: [createEmbed(pages[currentPage], currentPage, pages.length, modelNames.length)],
                components: [createButtons(currentPage, pages.length)],
            });
        });

        collector.on("end", async () => {
            // Disable buttons after timeout
            try {
                await interaction.editReply({
                    embeds: [createEmbed(pages[currentPage], currentPage, pages.length, modelNames.length)],
                    components: [],
                });
            } catch {
                // Message may have been deleted
            }
        });
    } catch (error) {
        console.error("[Models] Error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        await interaction.editReply({
            content: `Failed to fetch models: ${errorMessage}`,
        });
    }
}
