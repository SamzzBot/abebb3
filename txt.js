const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Gantilah dengan token bot Anda
const bot = new TelegramBot('7389356913:AAF17StPXB3U5NdLqFW6mtjWu_CNOSYGoOI', { polling: true });

// Gantilah dengan chat ID pemilik bot
const ownerChatId = '7365835326';

// Password yang dibutuhkan untuk mengakses bot
let BOT_PASSWORD = 'abeb2903';

// Daftar langganan premium
let premiumUsers = [];

// Mengonversi file VCF menjadi TXT dengan hanya nomor telepon
function convertVcfToTxt(vcfData) {
  let txtContent = '';
  // Ekstrak nomor telepon menggunakan regex
  const phoneNumbers = vcfData.match(/TEL;[^:]+:(\+?[0-9\s-]+)/g);

  if (phoneNumbers) {
    phoneNumbers.forEach(number => {
      // Ambil hanya nomor telepon dari string
      const phoneNumber = number.split(':')[1];
      txtContent += `${phoneNumber.trim()}\n`;
    });
  }

  return txtContent;
}

// Periksa password
function checkPassword(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && text.startsWith('/start')) {
    const password = text.split(' ')[1];
    if (password === BOT_PASSWORD || chatId.toString() === ownerChatId) {
      if (!premiumUsers.includes(chatId)) {
        premiumUsers.push(chatId);
      }
      bot.sendMessage(chatId, 'Password benar. Anda sekarang terdaftar sebagai pengguna premium.');
    } else {
      bot.sendMessage(chatId, 'PASSWORD YANG ANDA MASUKKAN SALAH, CHAT @boybeyy UNTUK MEMINTA PASSWORD');
    }
    return false;
  }

  if (!premiumUsers.includes(chatId) && chatId.toString() !== ownerChatId) {
    bot.sendMessage(chatId, 'Silahkan masukkan password untuk menggunakan bot ini. Untuk mendapatkan password, silahkan hubungi pemilik bot.');
    return false;
  }
  return true;
}

// Menangani perintah /listprem
bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === ownerChatId) {
    if (premiumUsers.length > 0) {
      const list = premiumUsers.map(id => `User ID: ${id}`).join('\n');
      bot.sendMessage(chatId, `Daftar pengguna premium:\n${list}`);
    } else {
      bot.sendMessage(chatId, 'Tidak ada pengguna premium.');
    }
  } else {
    bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk melihat daftar langganan.');
  }
});

// Menangani perintah /delprem
bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToRemove = match[1];

  if (chatId.toString() === ownerChatId) {
    const index = premiumUsers.indexOf(userIdToRemove);
    if (index > -1) {
      premiumUsers.splice(index, 1);
      bot.sendMessage(chatId, `Pengguna dengan ID ${userIdToRemove} telah dihapus dari daftar premium.`);
    } else {
      bot.sendMessage(chatId, `Pengguna dengan ID ${userIdToRemove} tidak ditemukan dalam daftar premium.`);
    }
  } else {
    bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk menghapus langganan.');
  }
});

// Menangani perintah /password untuk permintaan password
bot.onText(/\/password/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(ownerChatId, `Permintaan password dari user dengan ID: ${chatId}`);
  bot.sendMessage(chatId, `Permintaan password telah dikirimkan ke pemilik bot. Silahkan tunggu konfirmasi.`);
});

// Menangani perintah penggantian password
bot.onText(/KODECP, (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newPassword = match[1].trim();

  if (chatId.toString() === ownerChatId) {
    BOT_PASSWORD = newPassword;
    bot.sendMessage(chatId, `Password berhasil diubah menjadi: ${newPassword}`);
  } else {
    bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk mengubah password.');
  }
});

// Menangani pesan dan file
bot.on('message', async (msg) => {
  if (!checkPassword(msg)) return;

  const chatId = msg.chat.id;
  const fileId = msg.document ? msg.document.file_id : null;

  if (fileId) {
    try {
      const fileInfo = await bot.getFile(fileId);
      const filePath = await bot.downloadFile(fileId, './');

      if (filePath.endsWith('.vcf')) {
        // Simpan nama file
        const originalFileName = msg.document.file_name;
        const baseFileName = path.basename(originalFileName, '.vcf');
        const txtFileName = `${baseFileName}.txt`;

        let txtFilePath = path.join('./', txtFileName);
        let txtContent = '';

        if (fs.existsSync(txtFilePath)) {
          // File sudah ada, tambahkan konten
          txtContent = fs.readFileSync(txtFilePath, 'utf8');
        }

        // Gabungkan file VCF
        const vcfData = fs.readFileSync(filePath, 'utf8');
        txtContent += convertVcfToTxt(vcfData);

        // Simpan hasil akhir
        fs.writeFileSync(txtFilePath, txtContent);

        if (txtContent.trim().length > 0) { // Check if content is non-empty
          bot.sendDocument(chatId, txtFilePath).then(() => {
            // Cleanup
            fs.unlinkSync(filePath);
          }).catch(err => {
            console.error('Error sending document:', err);
          });
        } else {
          bot.sendMessage(chatId, 'Converted file is empty.');
          fs.unlinkSync(filePath);
          fs.unlinkSync(txtFilePath);
        }
      } else {
        bot.sendMessage(chatId, 'Please send a VCF file.');
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error processing file:', err);
    }
  }
});
