function pad_zeroes(number, length) {
	return number.toString().padStart(length, "0");
}

function timestamp(message) {
	const date = new Date();

	const year = pad_zeroes(date.getFullYear(), 2);
	const month = pad_zeroes(date.getMonth(), 2);
	const day = pad_zeroes(date.getDate(), 2);

	const hour = pad_zeroes(date.getHours(), 2);
	const minute = pad_zeroes(date.getMinutes(), 2);
	const second = pad_zeroes(date.getSeconds(), 2);

	const datestring = `[${year}-${month}-${day} ${hour}:${minute}:${second}]`;
	console.info(datestring, message);
}

module.exports = { timestamp };