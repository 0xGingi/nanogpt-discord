import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";

const ADMIN_USERS = (process.env.CONTEXT_ADMIN_USERS || "").split(",").filter(Boolean);

export const data = new SlashCommandBuilder()
    .setName("usage")
    .setDescription("Check your NanoGPT API usage");

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    // Check if user is an admin
    if (!ADMIN_USERS.includes(interaction.user.id)) {
        await interaction.editReply({
            content: "you cannot run this command",
        });
        return;
    }

    try {
        const usage = await nanogpt.getUsage();

        const dailyResetDate = new Date(usage.daily.resetAt);
        const monthlyResetDate = new Date(usage.monthly.resetAt);

        const embed = new EmbedBuilder()
            .setTitle("NanoGPT API Usage")
            .setDescription(`Status: **${usage.state.toUpperCase()}**`)
            .addFields(
                {
                    name: "Daily Usage",
                    value: [
                        `Used: ${usage.daily.used} / ${usage.limits.daily}`,
                        `Remaining: ${usage.daily.remaining}`,
                        `Percent: ${(usage.daily.percentUsed * 100).toFixed(2)}%`,
                        `Resets: <t:${Math.floor(usage.daily.resetAt / 1000)}:R>`,
                    ].join("\n"),
                    inline: true,
                },
                {
                    name: "Monthly Usage",
                    value: [
                        `Used: ${usage.monthly.used} / ${usage.limits.monthly}`,
                        `Remaining: ${usage.monthly.remaining}`,
                        `Percent: ${(usage.monthly.percentUsed * 100).toFixed(2)}%`,
                        `Resets: <t:${Math.floor(usage.monthly.resetAt / 1000)}:R>`,
                    ].join("\n"),
                    inline: true,
                }
            )
            .setFooter({
                text: usage.enforceDailyLimit
                    ? "Daily limit enforced"
                    : "Only monthly limit enforced",
            })
            .setTimestamp();

        if (usage.graceUntil) {
            embed.addFields({
                name: "Grace Period",
                value: `Ends: ${usage.graceUntil}`,
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("[Usage] Error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        await interaction.editReply({
            content: `Failed to fetch usage: ${errorMessage}`,
        });
    }
}
