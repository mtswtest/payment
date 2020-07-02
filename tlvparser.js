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
  
  var hexStr = '', h = '0123456789abcdef';
  
  (new Uint8Array(uint8arr)).forEach((v) => { hexStr += h[v >> 4] + h[v & 15]; }); 
  
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
	
