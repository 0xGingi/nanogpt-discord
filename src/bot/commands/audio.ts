import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { attachmentToDataUrl, AUDIO_TYPES, mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("audio")
    .setDescription("NanoGPT audio APIs")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("speech")
            .setDescription("Generate speech/audio")
            .addStringOption((option) => option.setName("input").setDescription("Input text").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Speech model").setRequired(false))
            .addStringOption((option) => option.setName("voice").setDescription("Voice").setRequired(false))
            .addStringOption((option) => option.setName("format").setDescription("Response format").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced speech JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("tts")
            .setDescription("Start legacy async TTS/music")
            .addStringOption((option) => option.setName("text").setDescription("Text or prompt").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Advanced TTS JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("tts-status")
            .setDescription("Check legacy TTS status")
            .addStringOption((option) => option.setName("id").setDescription("TTS ID").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("transcribe")
            .setDescription("Transcribe audio")
            .addAttachmentOption((option) => option.setName("audio").setDescription("Audio file").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Transcription model").setRequired(false))
            .addStringOption((option) => option.setName("language").setDescription("Language").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced transcription JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("transcribe-status")
            .setDescription("Check transcription status")
            .addStringOption((option) => option.setName("id").setDescription("Transcription ID").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("voice-clone")
            .setDescription("Create a voice clone")
            .addAttachmentOption((option) => option.setName("audio").setDescription("Voice sample").setRequired(true))
            .addStringOption((option) => option.setName("name").setDescription("Voice name").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced voice clone JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "AUDIO");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }
    const paygoCheck = canUseFeature(interaction, "PAYGO");
    if (!paygoCheck.allowed) {
        await interaction.reply({ content: paygoCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "speech") {
            const format = interaction.options.getString("format") || "mp3";
            const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
                input: interaction.options.getString("input", true),
                model: interaction.options.getString("model") || "tts-1",
                voice: interaction.options.getString("voice") || "alloy",
                response_format: format,
            });
            const result = await nanogpt.audioSpeech(body);
            await interaction.editReply({
                files: [new AttachmentBuilder(result.data, { name: result.filename })],
                content: `Generated audio (${result.contentType}).`,
            });
            return;
        }
        if (subcommand === "tts") {
            const result = await nanogpt.tts(mergeDefined(parseJsonOption(interaction.options.getString("json")), {
                text: interaction.options.getString("text", true),
            }));
            await replyJson(interaction, "TTS", result, "nanogpt-tts.json");
            return;
        }
        if (subcommand === "tts-status") {
            await replyJson(interaction, "TTS Status", await nanogpt.ttsStatus(interaction.options.getString("id", true)), "nanogpt-tts-status.json");
            return;
        }
        if (subcommand === "transcribe") {
            const audio = interaction.options.getAttachment("audio", true);
            const result = await nanogpt.transcribe(mergeDefined(parseJsonOption(interaction.options.getString("json")), {
                file: await attachmentToDataUrl(audio, AUDIO_TYPES),
                model: interaction.options.getString("model"),
                language: interaction.options.getString("language"),
            }));
            await replyJson(interaction, "Transcription", result, "nanogpt-transcription.json");
            return;
        }
        if (subcommand === "transcribe-status") {
            await replyJson(interaction, "Transcription Status", await nanogpt.transcribeStatus(interaction.options.getString("id", true)), "nanogpt-transcription-status.json");
            return;
        }
        const audio = interaction.options.getAttachment("audio", true);
        const result = await nanogpt.voiceClone(mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            audio: await attachmentToDataUrl(audio, AUDIO_TYPES),
            name: interaction.options.getString("name"),
        }));
        await replyJson(interaction, "Voice Clone", result, "nanogpt-voice-clone.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Audio command failed." });
    }
}
