

var dynaflex = (function () {
	var context = null;
	var url = null;
	var hiddevice = null; 
	var websocket = null;
	
    function dynaflex(url, callback) {
		context = this;		
		context.url = url;
		this.eventCallback = callback;
		this.hiddevice = null; 
				
        this.PACKET_TYPE_SINGLE_DATA = 0; 
        this.PACKET_TYPE_START_DATA = 1;
        this.PACKET_TYPE_CONTINUE_DATA = 2;
        this.PACKET_TYPE_END_DATA = 3;
        this.PACKET_TYPE_CANCEL = 4;
        this.START_PAYLOAD_SIZE = 59;
        this.PACKET_CONTINUE_DATA_SIZE = 61;
        this.END_DATA_SIZE = 62; 
        this.SINGLE_DATA_SIZE = 62;
    };
	
	dynaflex.prototype.sendEvent = function(eventType, eventData) {
		this.eventCallback(eventType, eventData);
	};
	
	dynaflex.prototype.processData = function(data) {
		console.log('processData: ' + data);	
		context.sendEvent('data', data);  
	};
	 
	dynaflex.prototype.isWebSocket = function() {
		if (this.url != null)
		{
			if (this.url.startsWith('ws:') || this.url.startsWith('wss:')) 
				return true; 
		}
		
		return false;
	}; 
	
	dynaflex.prototype.open = async function () {
		if (this.isWebSocket()) 
			openWSDevice();
		else
			this.openHIDDevice();
	};
	
	async function openWSDevice() {
		context.websocket = new WebSocket(this.url);
		
    	context.websocket.onopen = function(evt) { context.onOpen(evt) };

    	context.websocket.onclose = function(evt) { context.onClose(evt) };

    	context.websocket.onerror = function(evt) { context.onError(evt) };		

    	context.websocket.onmessage = function(evt) { context.onMessage(evt) };
	};
	
	function onOpen(evt)
	{
		context.sendEvent('state', 'connected');
	};
	
	function onClose(evt)
	{
		context.sendEvent('state', 'disconnected');
	};
	
	function onError(evt)
	{
		context.sendEvent('error', evt);
	};	
	
	dynaflex.prototype.onMessage = function (evt)
	{
		this.processData(evt);
	};
	
	dynaflex.prototype.openHIDDevice = async function () {		
		var handleInputReport = function(e) {
			let responseValue = e.data;
			console.log('Device Response: ' + responseValue);
			console.log('Length: ' + responseValue.byteLength);
					 
			databuffer = new Uint8Array(responseValue.buffer); 
			data = byteToHexString(databuffer);
			console.log('Device Response: ' + data);	
			
			this.processData(data);
		};
	
		let deviceFilter = { vendorId: 0x0801, productId: 0x2020 };
		let requestParams  = { filters: [deviceFilter] };

		try {
			const devices = await navigator.hid.requestDevice(requestParams);
			this.hiddevice = devices[0];
		  } catch (error) {
			console.warn('No device access granted', error);
			return;
		  }
		 
        console.log(this.hiddevice.productId);		 
        console.log(this.hiddevice.productName);
		
	
		await this.hiddevice.open().then(() => {
			console.log('Opened HID device');
			context.sendEvent('state', 'connected');

			this.hiddevice.addEventListener('inputreport', function(e) {
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
         
        console.log('done');
    };
	
	dynaflex.prototype.close = async function () {
		if (this.isWebSocket())
			this.closeWSDevice();
		else
			this.closeHIDDevice();
	};
	
	dynaflex.prototype.closeWSDevice = async function () {
		
	};
	
	dynaflex.prototype.closeHIDDevice = function () {
		console.log('Closing HID device');
								
		if (this.hiddevice != null)
		{
			this.hiddevice.close();
			context.sendEvent('state', 'disconnected');
			console.log('Closed HID device');
		}
    };
	
    dynaflex.prototype.send = function (data) {
		console.log('sendData: ' + data);						
        var packets = this.getPackets(data);
        for (var i = 0; i < packets.length; i++) {
            {
                var packet = packets[i];
				console.log('sending packet: ' + packet);	
				this.hiddevice.sendReport(0x00, packet).then(() => {
					console.log('Packet sent');;	
				});
            }
            ;
        }
    };
	
    dynaflex.prototype.getPackets = function (data) { 
        if (data.length > this.SINGLE_DATA_SIZE) {
            return this.getMultiplePackets(data);
        }
        else {
            var result = ([]);
            /* add */ (result.push(this.getSinglePacket(data)) > 0);
            return result;
        }
    };
	
    dynaflex.prototype.getSinglePacket = function (data) {
        var len = 2;
        if (data != null) {
            len += data.length;
        }
        var result = (function (s) { var a = []; while (s-- > 0)
        a.push(0); return a; })(len);
		
		//Uint8Array result = new Uint8Array(len);
		
        result[0] = this.PACKET_TYPE_SINGLE_DATA;
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
	
    dynaflex.prototype.getMultiplePackets = function (data) {
        var result = ([]);
        var p0 = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(5 + this.START_PAYLOAD_SIZE);
        p0[0] = this.PACKET_TYPE_START_DATA;
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
        } })(data, 0, p0, 5, this.START_PAYLOAD_SIZE);
        /* add */ (result.push(new Uint8Array(p0)) > 0);
        var seq = 1;
        var i = this.START_PAYLOAD_SIZE;
        for (; i < data.length - this.END_DATA_SIZE; i += this.PACKET_CONTINUE_DATA_SIZE) {
            {
                var pi = (function (s) { var a = []; while (s-- > 0)
                    a.push(0); return a; })(3 + this.PACKET_CONTINUE_DATA_SIZE);
                var piLen = getLengthArray(2, seq);
                pi[0] = this.PACKET_TYPE_CONTINUE_DATA;
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
                } })(data, i, pi, 3, this.PACKET_CONTINUE_DATA_SIZE);
                /* add */ (result.push(new Uint8Array(pi)) > 0);
                seq++;
            }
            ;
        }
        var p1 = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(2 + data.length - i);
        p1[0] = this.PACKET_TYPE_END_DATA;
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