import {
    Attachment,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
} from "discord.js";
import type { JsonObject } from "../../api/nanogpt.ts";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
export const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/flac", "audio/mp4"];

export function parseJsonOption(value: string | null, optionName = "json"): JsonObject {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error(`${optionName} must be a JSON object.`);
        }
        return parsed as JsonObject;
    } catch (error) {
        if (error instanceof Error && error.message.includes("must be")) throw error;
        throw new Error(`Invalid ${optionName}: expected a JSON object.`);
    }
}

export function splitCsv(value: string | null): string[] {
    if (!value) return [];
    return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function attachmentToDataUrl(
    attachment: Attachment,
    validTypes: string[] = IMAGE_TYPES
): Promise<string> {
    const contentType = attachment.contentType || "";
    if (!validTypes.includes(contentType)) {
        throw new Error(`Unsupported attachment type "${contentType || "unknown"}".`);
    }
    const response = await fetch(attachment.url);
    if (!response.ok) {
        throw new Error(`Failed to download attachment (${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
}

const JSON_PAGE_SIZE = 3200;
const MAX_JSON_PAGES = 25;

function formatJsonPage(page: string): string {
    return `\`\`\`json\n${page}\n\`\`\``;
}

function paginateJson(value: unknown): { pages: string[]; truncated: boolean } {
    const json = JSON.stringify(value, null, 2);
    const pages: string[] = [];
    for (let i = 0; i < json.length && pages.length < MAX_JSON_PAGES; i += JSON_PAGE_SIZE) {
        pages.push(json.slice(i, i + JSON_PAGE_SIZE));
    }
    return {
        pages: pages.length > 0 ? pages : ["null"],
        truncated: json.length > JSON_PAGE_SIZE * MAX_JSON_PAGES,
    };
}

export function jsonAttachment(value: unknown, filename: string): AttachmentBuilder {
    return new AttachmentBuilder(Buffer.from(JSON.stringify(value, null, 2)), { name: filename });
}

export async function replyJson(
    interaction: ChatInputCommandInteraction,
    title: string,
    result: unknown,
    filename: string
) {
    const { pages, truncated } = paginateJson(result);
    let currentPage = 0;

    const createEmbed = () =>
        new EmbedBuilder()
            .setTitle(title)
            .setDescription(formatJsonPage(pages[currentPage]))
            .setFooter({
                text: `Page ${currentPage + 1}/${pages.length}${truncated ? " | Output truncated; full JSON attached" : ""}`,
            })
            .setTimestamp();

    const createButtons = () =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("json_prev")
                .setLabel("Previous")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId("json_next")
                .setLabel("Next")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === pages.length - 1)
        );

    const payload = {
        embeds: [createEmbed()],
        components: pages.length > 1 ? [createButtons()] : [],
        files: truncated ? [jsonAttachment(result, filename)] : [],
    };

    const message = await interaction.editReply(payload);

    if (pages.length <= 1) return;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000,
    });

    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: "Only the command author can use these buttons.",
                ephemeral: true,
            });
            return;
        }

        if (buttonInteraction.customId === "json_prev" && currentPage > 0) {
            currentPage--;
        } else if (buttonInteraction.customId === "json_next" && currentPage < pages.length - 1) {
            currentPage++;
        }

        await buttonInteraction.update({
            embeds: [createEmbed()],
            components: [createButtons()],
        });
    });

    collector.on("end", async () => {
        try {
            await interaction.editReply({
                embeds: [createEmbed()],
                components: [],
            });
        } catch {
            // Message may have been deleted.
        }
    });
}

export function compactJson(value: unknown, maxLength = 3200): string {
    const json = JSON.stringify(value, null, 2);
    if (json.length <= maxLength) return formatJsonPage(json);
    return formatJsonPage(`${json.slice(0, maxLength - 20)}\n... truncated`);
}

export function mergeDefined(base: JsonObject, values: JsonObject): JsonObject {
    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== null && value !== "") base[key] = value;
    }
    return base;
}
