import {
    Attachment,
    AttachmentBuilder,
    ChatInputCommandInteraction,
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

export function compactJson(value: unknown, maxLength = 3200): string {
    const json = JSON.stringify(value, null, 2);
    if (json.length <= maxLength) return `\`\`\`json\n${json}\n\`\`\``;
    return `\`\`\`json\n${json.slice(0, maxLength - 40)}\n... truncated; see attachment\n\`\`\``;
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
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(compactJson(result))
        .setTimestamp();

    await interaction.editReply({
        embeds: [embed],
        files: [jsonAttachment(result, filename)],
    });
}

export function mergeDefined(base: JsonObject, values: JsonObject): JsonObject {
    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== null && value !== "") base[key] = value;
    }
    return base;
}
