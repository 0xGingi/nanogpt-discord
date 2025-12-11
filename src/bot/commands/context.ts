import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Attachment,
    PermissionFlagsBits,
    GuildMember,
} from "discord.js";
import {
    addContext,
    getContext,
    getAllContexts,
    removeContext,
} from "../../db/index.ts";
import {
    downloadAndParse,
    isSupportedFile,
    getSupportedExtensions,
} from "../../utils/documents.ts";

const SCOPE_CHOICES = [
    { name: "User (personal)", value: "user" },
    { name: "Server (shared)", value: "server" },
] as const;

// Whitelist of user IDs allowed to manage server contexts (comma-separated in env)
const CONTEXT_ADMIN_USERS = (process.env.CONTEXT_ADMIN_USERS || "").split(",").filter(Boolean);

function canManageServerContext(interaction: ChatInputCommandInteraction): boolean {
    // Check if user is in whitelist
    if (CONTEXT_ADMIN_USERS.includes(interaction.user.id)) {
        return true;
    }

    // Check if user has Administrator permission
    const member = interaction.member as GuildMember | null;
    if (member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    return false;
}

export const data = new SlashCommandBuilder()
    .setName("context")
    .setDescription("Manage document contexts for AI conversations")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("add")
            .setDescription("Add a document as context")
            .addAttachmentOption((option) =>
                option
                    .setName("file")
                    .setDescription("The document to add (PDF, TXT, MD, etc.)")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription("A name for this context")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("scope")
                    .setDescription("Who can access this context (default: user)")
                    .setRequired(false)
                    .addChoices(...SCOPE_CHOICES)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("list")
            .setDescription("List all saved contexts")
            .addStringOption((option) =>
                option
                    .setName("scope")
                    .setDescription("Which contexts to list (default: user)")
                    .setRequired(false)
                    .addChoices(...SCOPE_CHOICES)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("view")
            .setDescription("View a context's content")
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription("The name of the context to view")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("scope")
                    .setDescription("Where to look for the context (default: user)")
                    .setRequired(false)
                    .addChoices(...SCOPE_CHOICES)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("remove")
            .setDescription("Remove a saved context")
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription("The name of the context to remove")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("scope")
                    .setDescription("Where to remove from (default: user)")
                    .setRequired(false)
                    .addChoices(...SCOPE_CHOICES)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId || "dm";
    const userId = interaction.user.id;
    const scope = interaction.options.getString("scope") || "user";

    switch (subcommand) {
        case "add":
            await handleAdd(interaction, guildId, userId, scope);
            break;
        case "list":
            await handleList(interaction, guildId, userId, scope);
            break;
        case "view":
            await handleView(interaction, guildId, userId, scope);
            break;
        case "remove":
            await handleRemove(interaction, guildId, userId, scope);
            break;
    }
}

async function handleAdd(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    userId: string,
    scope: string
) {
    const attachment = interaction.options.getAttachment("file", true);
    const name = interaction.options.getString("name", true);
    const isUserScope = scope === "user";

    // Check permission for server-scoped contexts
    if (!isUserScope && !canManageServerContext(interaction)) {
        await interaction.reply({
            content: "You don't have permission to add server-wide contexts. Only administrators or whitelisted users can do this.",
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Validate file type
    if (!isSupportedFile(attachment.name)) {
        await interaction.editReply({
            content: `Unsupported file type. Supported types: ${getSupportedExtensions().join(", ")}`,
        });
        return;
    }

    // Check if context name already exists
    const existing = getContext(guildId, name, isUserScope ? userId : undefined);
    if (existing) {
        await interaction.editReply({
            content: `A context named "${name}" already exists. Use /context remove to delete it first.`,
        });
        return;
    }

    try {
        // Download and parse the document
        const parsed = await downloadAndParse(attachment.url, attachment.name);

        // Limit content size
        const MAX_CONTENT_SIZE = 100000; // ~100KB of text
        let content = parsed.content;
        if (content.length > MAX_CONTENT_SIZE) {
            content = content.substring(0, MAX_CONTENT_SIZE);
            await interaction.followUp({
                content: `Note: Document was truncated to ${MAX_CONTENT_SIZE} characters due to size limits.`,
                ephemeral: true,
            });
        }

        // Save to database
        addContext(guildId, name, content, attachment.name, parsed.fileType, isUserScope ? userId : undefined);

        const embed = new EmbedBuilder()
            .setTitle("Context Added")
            .setDescription(`Successfully added context **${name}**`)
            .addFields(
                { name: "File", value: attachment.name, inline: true },
                { name: "Type", value: parsed.fileType.toUpperCase(), inline: true },
                { name: "Scope", value: isUserScope ? "Personal" : "Server", inline: true },
                {
                    name: "Size",
                    value: `${content.length.toLocaleString()} characters`,
                    inline: true,
                }
            )
            .setFooter({ text: `Use /chat context:${name} to include this in your prompts` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("[Context Add] Error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        await interaction.editReply({
            content: `Failed to process document: ${errorMessage}`,
        });
    }
}

async function handleList(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    userId: string,
    scope: string
) {
    await interaction.deferReply({ ephemeral: true });

    const isUserScope = scope === "user";
    const contexts = getAllContexts(guildId, isUserScope ? userId : undefined);

    if (!contexts || contexts.length === 0) {
        await interaction.editReply({
            content: `No ${isUserScope ? "personal" : "server"} contexts saved. Use /context add to add a document as context.`,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${isUserScope ? "Personal" : "Server"} Contexts`)
        .setDescription(
            contexts
                .map((ctx) => {
                    const date = new Date(ctx.created_at * 1000);
                    return `- **${ctx.name}** (${ctx.file_type}) - ${ctx.content.length.toLocaleString()} chars - ${ctx.source_filename}`;
                })
                .join("\n")
        )
        .setFooter({ text: `Total: ${contexts.length} context(s)` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleView(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    userId: string,
    scope: string
) {
    const name = interaction.options.getString("name", true);
    const isUserScope = scope === "user";

    await interaction.deferReply({ ephemeral: true });

    const context = getContext(guildId, name, isUserScope ? userId : undefined);

    if (!context) {
        await interaction.editReply({
            content: `Context "${name}" not found in ${isUserScope ? "personal" : "server"} contexts. Use /context list to see available contexts.`,
        });
        return;
    }

    // Truncate content for display
    const MAX_DISPLAY = 2000;
    let displayContent = context.content;
    let truncated = false;

    if (displayContent.length > MAX_DISPLAY) {
        displayContent = displayContent.substring(0, MAX_DISPLAY);
        truncated = true;
    }

    const embed = new EmbedBuilder()
        .setTitle(`Context: ${context.name}`)
        .setDescription(`\`\`\`\n${displayContent}\n\`\`\``)
        .addFields(
            { name: "Source", value: context.source_filename, inline: true },
            { name: "Type", value: context.file_type.toUpperCase(), inline: true },
            { name: "Scope", value: context.user_id ? "Personal" : "Server", inline: true },
            {
                name: "Total Size",
                value: `${context.content.length.toLocaleString()} characters`,
                inline: true,
            }
        )
        .setFooter({
            text: truncated
                ? `Showing first ${MAX_DISPLAY} characters`
                : "Full content shown",
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleRemove(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    userId: string,
    scope: string
) {
    const name = interaction.options.getString("name", true);
    const isUserScope = scope === "user";

    // Check permission for server-scoped contexts
    if (!isUserScope && !canManageServerContext(interaction)) {
        await interaction.reply({
            content: "You don't have permission to remove server-wide contexts. Only administrators or whitelisted users can do this.",
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const removed = removeContext(guildId, name, isUserScope ? userId : undefined);

    if (!removed) {
        await interaction.editReply({
            content: `Context "${name}" not found in ${isUserScope ? "personal" : "server"} contexts.`,
        });
        return;
    }

    await interaction.editReply({
        content: `Context **${name}** has been removed from ${isUserScope ? "personal" : "server"} contexts.`,
    });
}

