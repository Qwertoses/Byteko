function getRndNum() {
	return Math.floor(Math.random() * (10000 - 1 + 1) ) + 1;
}

module.exports = { getRndNum };