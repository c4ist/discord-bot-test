require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', () => {
    console.log(`${client.user.tag} is ready!`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!tempchannel') || !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

    const args = message.content.split(' ');
    if (args.length < 3) {
        return message.reply('Usage: !tempchannel <duration> <@buyer> [channel-name]');
    }

    const duration = args[1];
    const buyer = message.mentions.members.first();
    const channelName = args.slice(3).join('-') || `temp-${duration}-channel`;

    if (!duration.endsWith('w')) {
        return message.reply('Duration must be specified in weeks (e.g., 1w, 2w)');
    }

    const durationValue = parseInt(duration);
    if (isNaN(durationValue)) {
        return message.reply('Invalid duration format. Please use format like "1w" for 1 week.');
    }

    if (!buyer) {
        return message.reply('Please mention a buyer.');
    }

    try {
        const channel = await message.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: message.channel.parent,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.MentionEveryone],
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: buyer.id,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads]
                },
                {
                    id: client.user.id,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        const deletionDate = new Date(Date.now() + durationValue * 7 * 24 * 60 * 60 * 1000);
        await message.reply(`Created temporary channel ${channel} for ${buyer}. Channel will be deleted on ${deletionDate.toLocaleString()}`);

        setTimeout(async () => {
            try {
                await channel.delete();
                await message.channel.send(`Temporary channel ${channelName} has been deleted as scheduled.`);
            } catch (error) {
                console.error('Error deleting channel:', error);
            }
        }, durationValue * 7 * 24 * 60 * 60 * 1000);

    } catch (error) {
        console.error('Error:', error);
        await message.reply('An error occurred while creating the channel.');
    }
});

client.login(process.env.DISCORD_TOKEN);
