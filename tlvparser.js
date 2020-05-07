function hexStringToByte(str) {
  if (!str) {
	return new Uint8Array();
  }
  
  var a = [];
  for (var i = 0, len = str.length; i < len; i+=2) {
	a.push(parseInt(str.substr(i,2),16));
  }
  
  return new Uint8Array(a);
}

function byteToHexString(uint8arr) {
  if (!uint8arr) {
	return '';
  }
  
  var hexStr = '';
  for (var i = 0; i < uint8arr.length; i++) {
	var hex = (uint8arr[i] & 0xff).toString(16);
	hex = (hex.length === 1) ? '0' + hex : hex;
	hexStr += hex;
  }
  
  return hexStr.toUpperCase();
}

function getLengthArray(nBytes, len) {
	var lengthArray = (function (s) { var a = []; while (s-- > 0)
		a.push(0); return a; })(nBytes);
	var shift = nBytes;
	for (var i = 0; i < nBytes; i++) {
		{
			shift--;
			lengthArray[i] = (((len >> (shift * 8)) & (255)) | 0);
		}
		;
	}
	return lengthArray;
}
	
