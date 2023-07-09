//Simple method for random messages, taken from config file
const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
function getRandomEmoji() {
    return emojiList[Math.floor(Math.random() * emojiList.length)];
}

module.exports = {getRandomEmoji
};