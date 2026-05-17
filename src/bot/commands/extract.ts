import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson, splitCsv } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

const extractionEndpoint: Record<string, string> = {
    firecrawl: "/data-extraction/firecrawl",
    maps: "/data-extraction/google-maps",
    "maps-reviews": "/data-extraction/google-maps-reviews",
    "facebook-ads": "/data-extraction/facebook-ads",
    "instagram-profile": "/data-extraction/instagram-profile",
    "instagram-posts": "/data-extraction/instagram-posts",
    reddit: "/data-extraction/reddit",
    tiktok: "/data-extraction/tiktok",
};

export const data = new SlashCommandBuilder()
    .setName("extract")
    .setDescription("NanoGPT data extraction APIs")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("firecrawl")
            .setDescription("Run Firecrawl scrape/map/crawl")
            .addStringOption((option) => option.setName("url").setDescription("URL").setRequired(true))
            .addStringOption((option) => option.setName("mode").setDescription("Mode").setRequired(false).addChoices(
                { name: "scrape", value: "scrape" },
                { name: "map", value: "map" },
                { name: "crawl", value: "crawl" }
            ))
            .addIntegerOption((option) => option.setName("limit").setDescription("Result/page limit").setRequired(false).setMinValue(1))
            .addIntegerOption((option) => option.setName("wait").setDescription("waitForFinishSecs").setRequired(false).setMinValue(0))
            .addStringOption((option) => option.setName("json").setDescription("Advanced extraction JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("maps")
            .setDescription("Extract Google Maps places")
            .addIntegerOption((option) => option.setName("limit").setDescription("Result limit").setRequired(true).setMinValue(1))
            .addNumberOption((option) => option.setName("max_cost").setDescription("maxTotalChargeUsd").setRequired(true).setMinValue(0))
            .addStringOption((option) => option.setName("search").setDescription("Comma-separated search strings").setRequired(false))
            .addStringOption((option) => option.setName("urls").setDescription("Comma-separated Maps URLs").setRequired(false))
            .addStringOption((option) => option.setName("place_ids").setDescription("Comma-separated place IDs").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced extraction JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("maps-reviews")
            .setDescription("Extract Google Maps reviews")
            .addIntegerOption((option) => option.setName("max_reviews").setDescription("Maximum reviews").setRequired(true).setMinValue(1))
            .addNumberOption((option) => option.setName("max_cost").setDescription("maxTotalChargeUsd").setRequired(true).setMinValue(0))
            .addStringOption((option) => option.setName("urls").setDescription("Comma-separated Maps URLs").setRequired(false))
            .addStringOption((option) => option.setName("place_ids").setDescription("Comma-separated place IDs").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced extraction JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("facebook-ads").setDescription("Extract Facebook ads").addStringOption((option) => option.setName("json").setDescription("Request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("instagram-profile").setDescription("Extract Instagram profiles").addStringOption((option) => option.setName("json").setDescription("Request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("instagram-posts").setDescription("Extract Instagram posts").addStringOption((option) => option.setName("json").setDescription("Request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("reddit").setDescription("Extract Reddit data").addStringOption((option) => option.setName("json").setDescription("Request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("tiktok").setDescription("Extract TikTok data").addStringOption((option) => option.setName("json").setDescription("Request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("hunter")
            .setDescription("Use Hunter data extraction")
            .addStringOption((option) => option.setName("action").setDescription("Hunter action").setRequired(true).addChoices(
                { name: "domain-search", value: "domain-search" },
                { name: "email-finder", value: "email-finder" },
                { name: "email-verifier", value: "email-verifier" },
                { name: "discover", value: "discover" }
            ))
            .addStringOption((option) => option.setName("json").setDescription("Hunter request JSON").setRequired(true))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "PAYGO");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "hunter") {
            const result = await nanogpt.hunter(
                interaction.options.getString("action", true),
                parseJsonOption(interaction.options.getString("json"))
            );
            await replyJson(interaction, "Hunter Extraction", result, "nanogpt-hunter.json");
            return;
        }

        let body = parseJsonOption(interaction.options.getString("json"));
        if (subcommand === "firecrawl") {
            body = mergeDefined(body, {
                url: interaction.options.getString("url", true),
                mode: interaction.options.getString("mode") || "scrape",
                limit: interaction.options.getInteger("limit"),
                waitForFinishSecs: interaction.options.getInteger("wait"),
            });
        } else if (subcommand === "maps") {
            body = mergeDefined(body, {
                searchStringsArray: splitCsv(interaction.options.getString("search")),
                startUrls: splitCsv(interaction.options.getString("urls")),
                placeIds: splitCsv(interaction.options.getString("place_ids")),
                resultLimit: interaction.options.getInteger("limit", true),
                maxTotalChargeUsd: interaction.options.getNumber("max_cost", true),
            });
        } else if (subcommand === "maps-reviews") {
            body = mergeDefined(body, {
                startUrls: splitCsv(interaction.options.getString("urls")),
                placeIds: splitCsv(interaction.options.getString("place_ids")),
                maxReviews: interaction.options.getInteger("max_reviews", true),
                maxTotalChargeUsd: interaction.options.getNumber("max_cost", true),
            });
        }

        const result = await nanogpt.extract(extractionEndpoint[subcommand], body);
        await replyJson(interaction, "Data Extraction", result, `nanogpt-${subcommand}.json`);
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Extraction command failed." });
    }
}
