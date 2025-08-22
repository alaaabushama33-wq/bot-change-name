require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

// إنشاء رسالة نموذج تغيير الاسم
client.on('messageCreate', async message => {
    if(message.content === '!setupname') {
        const embed = new EmbedBuilder()
            .setTitle('📝 تغيير الاسماء')
            .setDescription('رجاء الالتزام بالقوانين قبل تغيير الاسم.\nاضغط على الزر لفتح نموذج تغيير الاسم.')
            .setColor('Blue')
            .setFooter({ text: 'تم إنشاء الرسالة بواسطة البوت' })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('openNameModal')
            .setLabel('فتح نموذج تغيير الاسم')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// التعامل مع الضغط على الزر وارسال المودال
client.on('interactionCreate', async interaction => {
    if(interaction.isButton() && interaction.customId === 'openNameModal') {
        const modal = new ModalBuilder()
            .setCustomId('nameChangeModal')
            .setTitle('نموذج تغيير الاسم');

        const currentNameInput = new TextInputBuilder()
            .setCustomId('currentName')
            .setLabel("الاسم الحالي")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const newNameInput = new TextInputBuilder()
            .setCustomId('newName')
            .setLabel("الاسم الجديد")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(currentNameInput);
        const row2 = new ActionRowBuilder().addComponents(newNameInput);

        modal.addComponents(row1, row2);
        await interaction.showModal(modal);
    }

    // التعامل مع ارسال المودال
    if(interaction.type === InteractionType.ModalSubmit && interaction.customId === 'nameChangeModal') {
        const currentName = interaction.fields.getTextInputValue('currentName');
        const newName = interaction.fields.getTextInputValue('newName');
        const user = interaction.user;

        const forbiddenWords = ['سياسة', 'ديني', 'مخالف']; 
        const hasForbidden = forbiddenWords.some(word => newName.includes(word));

        const reportChannel = interaction.guild.channels.cache.get(REPORT_CHANNEL_ID);

        // إذا الاسم مخالف، إرسال Embed فشل مباشرة
        if(hasForbidden) {
            const forbiddenEmbed = new EmbedBuilder()
                .setTitle('❌ فشل تغيير الاسم')
                .setColor(0xFF0000)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'المستخدم', value: `<@${user.id}>`, inline: true },
                    { name: 'الاسم الحالي', value: currentName, inline: true },
                    { name: 'الاسم الجديد', value: newName, inline: true }
                )
                .setFooter({ text: 'تم رفض الاسم بسبب مخالفة القوانين' })
                .setTimestamp();

            await interaction.reply({ content: '❌ الاسم يحتوي على كلمات مخالفة!', ephemeral: true });
            if(reportChannel) await reportChannel.send({ embeds: [forbiddenEmbed] });
            return;
        }

        // التحقق من صلاحيات البوت قبل تغيير الاسم
        if(!interaction.guild.members.me.permissions.has('ManageNicknames')) {
            const permsEmbed = new EmbedBuilder()
                .setTitle('❌ فشل تغيير الاسم')
                .setColor(0xFF0000)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setDescription('❌ لا أستطيع تغيير الاسم لأن البوت لا يمتلك صلاحية Manage Nicknames.')
                .setTimestamp();
            await interaction.reply({ embeds: [permsEmbed], ephemeral: true });
            if(reportChannel) await reportChannel.send({ embeds: [permsEmbed] });
            return;
        }

        // محاولة تغيير الاسم داخل try/catch
        try {
            await interaction.member.setNickname(newName);
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ نجاح تغيير الاسم')
                .setColor(0x00FF00)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'المستخدم', value: `<@${user.id}>`, inline: true },
                    { name: 'الاسم الحالي', value: currentName, inline: true },
                    { name: 'الاسم الجديد', value: newName, inline: true }
                )
                .setFooter({ text: 'تم تغيير الاسم بنجاح' })
                .setTimestamp();

            await interaction.reply({ content: '✅ تم تغيير الاسم بنجاح!', ephemeral: true });
            if(reportChannel) await reportChannel.send({ embeds: [successEmbed] });

        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ فشل تغيير الاسم')
                .setColor(0xFF0000)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setDescription('❌ لا أستطيع تغيير الاسم. تأكد أن لدي صلاحيات لتغيير الأسماء وأن دوري أعلى من المستخدم.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            if(reportChannel) await reportChannel.send({ embeds: [errorEmbed] });
        }
    }
});

client.login(process.env.BOT_TOKEN);
