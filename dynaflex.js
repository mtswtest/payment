

var dynaflex = (function () {
	
	const PACKET_TYPE_SINGLE_DATA = 0; 
    const PACKET_TYPE_START_DATA = 1;
    const PACKET_TYPE_CONTINUE_DATA = 2;
    const PACKET_TYPE_END_DATA = 3;
    const PACKET_TYPE_CANCEL = 4;
    const START_PAYLOAD_SIZE = 59;
    const PACKET_CONTINUE_DATA_SIZE = 61;
    const END_DATA_SIZE = 62; 
    const SINGLE_DATA_SIZE = 62;
	
	var context = null;
	
    function dynaflex(url, callback) {
		context = this;		
		
		context.url = url;
		context.eventCallback = callback;
		context.websocket = null;
		context.hiddevice = null; 
    };
	
	dynaflex.prototype.open = function () {
		if (isWebSocket()) 
			openWSDevice(); 
		else
			openHIDDevice();
	};
	 
	dynaflex.prototype.close = function () {
		if (isWebSocket())
			closeWSDevice();
		else
			closeHIDDevice();
	};
	    
	dynaflex.prototype.send = function (data) {
		if (isWebSocket())
			sendWSDevice(data);
		else
			sendHIDDevice(data);
    };
	
	dynaflex.prototype.startTransaction = function (data) {

		context.send(data);
    };
	
	function isWebSocket() {
		if (context.url != null)
		{
			if (context.url.startsWith('ws:') || context.url.startsWith('wss:')) 
				return true; 
		}
		
		return false;
	}; 
	
	function sendEvent(eventType, eventData) {
		context.eventCallback(eventType, eventData);
	};
	
	function processData(data) { 
		console.log('processData: ' + data);	
		sendEvent('data', data);  
	};
	
	function openWSDevice() { 
		if (context.websocket != null)
			return;
	
		console.log('Opening WS device');
		sendEvent('state', 'connecting');
		
		context.websocket = new WebSocket(context.url);
		context.websocket.binaryType = 'arraybuffer';
		
    	context.websocket.onopen = function(evt) { onOpen(evt) };

    	context.websocket.onclose = function(evt) { onClose(evt) };

    	context.websocket.onerror = function(evt) { onError(evt) };		

    	context.websocket.onmessage = function(evt) { onMessage(evt) };
	};
	
	function onOpen(evt)
	{
		console.log('Opened WS device');
		sendEvent('state', 'connected');
	};
	
	function onClose(evt)
	{
		context.websocket = null;
		
		console.log('Closed WS device');
		sendEvent('state', 'disconnected');
	};
	
	function onError(evt)
	{
		console.log('WS device Error');
		sendEvent('error', evt);
	};	
	
	function onMessage(evt)
	{
		console.log('WS device Message');
		processData(evt);
	};
	
	async function openHIDDevice() {		
		var handleInputReport = function(e) {
			let responseValue = e.data;
			console.log('Device Response: ' + responseValue);
			console.log('Length: ' + responseValue.byteLength);
					 
			databuffer = new Uint8Array(responseValue.buffer); 
			data = byteToHexString(databuffer);
			console.log('Device Response: ' + data);	
			
			processData(data);
		};
				
		let deviceFilter = { vendorId: 0x0801, productId: 0x2020 };
		let requestParams  = { filters: [deviceFilter] };

		try {
			const devices = await navigator.hid.requestDevice(requestParams);
			context.hiddevice = devices[0];
		  } catch (error) {
			console.warn('No device access granted', error);
			sendEvent('error', error);
			return;
		  }
		
		console.log('Opening HID device');		
		sendEvent('state', 'connecting');
				
        console.log(context.hiddevice.productId);		 
        console.log(context.hiddevice.productName);
		
	
		await context.hiddevice.open().then(() => {
			console.log('Opened HID device');
			sendEvent('state', 'connected');

			context.hiddevice.addEventListener('inputreport', function(e) {
					let responseValue = e.data;
					console.log('Device Response: ' + responseValue);
					console.log('Length: ' + responseValue.byteLength);

					databuffer = new Uint8Array(responseValue.buffer);
					data = byteToHexString(databuffer);
					console.log('Device Response: ' + data);
					
					handleInputReport(data);
			    }
			);
		});
    };
	
	function closeWSDevice() {
		if (context.websocket == null)
			return;
		
		console.log('Closing WS device');
		sendEvent('state', 'disconnecting');
		
		context.websocket.close();
	};
	
	function closeHIDDevice() {
		if (context.hiddevice == null)
			return;
		
		console.log('Closing HID device');
		sendEvent('state', 'disconnecting');
										
		context.hiddevice.close();
		
		context.hiddevice = null;

		console.log('Closed HID device');
		sendEvent('state', 'disconnected');
    };
		
	function sendWSDevice(data) {
		if (context.websocket == null)
			return;
		
		//console.log('send: ' + data);	
		
		context.websocket.send(data);
    };
	
	function sendHIDDevice(data) {
		console.log('send: ' + data);				
		
        var packets = this.getPackets(data);
        for (var i = 0; i < packets.length; i++) {
            {
                var packet = packets[i];
				console.log('sending packet: ' + packet);	
				context.hiddevice.sendReport(0x00, packet).then(() => {
					console.log('Packet sent');;	
				});
            }
            ;
        }
    };
	
    function getPackets(data) { 
        if (data.length > SINGLE_DATA_SIZE) {
            return getMultiplePackets(data);
        }
        else {
            var result = ([]);
            /* add */ (result.push(getSinglePacket(data)) > 0);
            return result;
        }
    };
	
    function getSinglePacket(data) {
        var len = 2;
        if (data != null) {
            len += data.length;
        }
        var result = (function (s) { var a = []; while (s-- > 0)
        a.push(0); return a; })(len);
		
		//Uint8Array result = new Uint8Array(len);
		
        result[0] = PACKET_TYPE_SINGLE_DATA;
        result[1] = (data.length | 0);
        /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
            while (--size >= 0)
                dstPts[dstOff++] = srcPts[srcOff++];
        }
        else {
            var tmp = srcPts.slice(srcOff, srcOff + size);
            for (var i = 0; i < size; i++)
                dstPts[dstOff++] = tmp[i];
        } })(data, 0, result, 2, data.length);
        //return result;
		return new Uint8Array(result);
    };
	
    function getMultiplePackets(data) {
        var result = ([]);
        var p0 = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(5 + START_PAYLOAD_SIZE);
        p0[0] = PACKET_TYPE_START_DATA;
        var p0Len = getLengthArray(4, data.length);
        p0[1] = p0Len[0];
        p0[2] = p0Len[1];
        p0[3] = p0Len[2];
        p0[4] = p0Len[3];
        /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
            while (--size >= 0)
                dstPts[dstOff++] = srcPts[srcOff++];
        }
        else {
            var tmp = srcPts.slice(srcOff, srcOff + size);
            for (var i_1 = 0; i_1 < size; i_1++)
                dstPts[dstOff++] = tmp[i_1];
        } })(data, 0, p0, 5, START_PAYLOAD_SIZE);
        /* add */ (result.push(new Uint8Array(p0)) > 0);
        var seq = 1;
        var i = START_PAYLOAD_SIZE;
        for (; i < data.length - END_DATA_SIZE; i += PACKET_CONTINUE_DATA_SIZE) {
            {
                var pi = (function (s) { var a = []; while (s-- > 0)
                    a.push(0); return a; })(3 + PACKET_CONTINUE_DATA_SIZE);
                var piLen = getLengthArray(2, seq);
                pi[0] = PACKET_TYPE_CONTINUE_DATA;
                pi[1] = piLen[0];
                pi[2] = piLen[1];
                /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
                    while (--size >= 0)
                        dstPts[dstOff++] = srcPts[srcOff++];
                }
                else {
                    var tmp = srcPts.slice(srcOff, srcOff + size);
                    for (var i_2 = 0; i_2 < size; i_2++)
                        dstPts[dstOff++] = tmp[i_2];
                } })(data, i, pi, 3, PACKET_CONTINUE_DATA_SIZE);
                /* add */ (result.push(new Uint8Array(pi)) > 0);
                seq++;
            }
            ;
        }
        var p1 = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(2 + data.length - i);
        p1[0] = PACKET_TYPE_END_DATA;
        p1[1] = ((data.length - i) | 0);
        /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
            while (--size >= 0)
                dstPts[dstOff++] = srcPts[srcOff++];
        }
        else {
            var tmp = srcPts.slice(srcOff, srcOff + size); 
                dstPts[dstOff++] = tmp[i_3];
        } })(data, i, p1, 2, data.length - i);
        /* add */ (result.push(new Uint8Array(p1)) > 0);
        return result;
    };

    return dynaflex; 
}());