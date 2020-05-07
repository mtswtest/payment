// connection type definitions:
var connectionType = { WS: 0, HID: 1};

var dynaflex = (function () {
	var context = null;
	
    function dynaflex(callback) {
		context = this;		
		this.eventCallback = callback;
		this.device = null; 
				
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
		context.eventCallback(eventType, eventData);
	};
	
	dynaflex.prototype.processData = function(data) {
		console.log('processData: ' + data);	
		context.sendEvent('data', data);
	};
	 
	var handleInputReport = function(e) {
		let responseValue = e.data;
		console.log('Device Response: ' + responseValue);
		console.log('Length: ' + responseValue.byteLength);
				 
		databuffer = new Uint8Array(responseValue.buffer); 
		data = byteToHexString(databuffer);
		console.log('Device Response: ' + data);	
		
		this.processData(data);
	};
	
	dynaflex.prototype.open = async function () {
		let deviceFilter = { vendorId: 0x0801, productId: 0x2020 };
		let requestParams  = { filters: [deviceFilter] };

		try {
			const devices = await navigator.hid.requestDevice(requestParams);
			this.device = devices[0];
		  } catch (error) {
			console.warn('No device access granted', error);
			return;
		  }
		 
		console.log(this.device.productId);
        console.log(this.device.productName);
		
	
		await this.device.open().then(() => {
			console.log('Opened HID device');
			context.sendEvent('state', 'connected');

			this.device.addEventListener('inputreport', function(e) {
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
	
	dynaflex.prototype.close = function () {

    };
	
    dynaflex.prototype.send = function (data) {
		console.log('sendData: ' + data);						
        var packets = this.getPackets(data);
        for (var i = 0; i < packets.length; i++) {
            {
                var packet = packets[i];
				console.log('sending packet: ' + packet);	
				this.device.sendReport(0x00, packet).then(() => {
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