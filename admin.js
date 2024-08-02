const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Ganti dengan token bot Telegram Anda
const token = '7457743354:AAGn3FtGjHTflLwcolak5WViImS0gdhgJ-Y';
// Ganti dengan chat ID owner
const ownerChatId = '7425560108';

const bot = new TelegramBot(token, { polling: true });

const subscribers = new Set();
const fileNames = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Selamat datang! Anda dapat mengirim teks dengan format NAMA_KONTAK,NOMOR untuk diubah menjadi file VCF. Gunakan /filename [nama file] untuk mengatur nama file.');
});

bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === ownerChatId) {
        bot.sendMessage(chatId, 'Owner tidak perlu berlangganan.');
        return;
    }
    subscribers.add(chatId);
    bot.sendMessage(chatId, 'Anda telah berlangganan.');
});

bot.onText(/\/unsubscribe/, (msg) => {
    const chatId = msg.chat.id;
    subscribers.delete(chatId);
    bot.sendMessage(chatId, 'Anda telah berhenti berlangganan.');
});

bot.onText(/\/filename (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const fileName = match[1].trim();
    fileNames[chatId] = fileName;
    bot.sendMessage(chatId, `Nama file diatur ke: ${fileName}`);
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.text.startsWith('/') || chatId === ownerChatId || subscribers.has(chatId)) {
        const text = msg.text;
        const lines = text.split('\n');
        const contacts = lines.map(line => line.split(','));

        if (contacts.every(contact => contact.length === 2)) {
            const vcfContent = contacts.map(([name, number]) => 
                `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${number}
END:VCARD`).join('\n');

            const fileName = fileNames[chatId] ? `${fileNames[chatId]}.vcf` : `contacts_${chatId}.vcf`;
            fs.writeFileSync(fileName, vcfContent);

            bot.sendDocument(chatId, fileName)
                .then(() => fs.unlinkSync(fileName))
                .catch(err => console.error(err));
        } else {
            bot.sendMessage(chatId, 'Format pesan tidak valid. Harap gunakan format: NAMA_KONTAK,NOMOR');
        }
    } else {
        bot.sendMessage(chatId, 'Anda harus berlangganan untuk menggunakan bot ini. Gunakan perintah /subscribe untuk berlangganan.');
    }
});
