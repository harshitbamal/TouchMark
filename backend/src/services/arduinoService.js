const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

class ArduinoService extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.connected = false;
    this.reconnectInterval = null;
  }

  // Initialize connection
  async connect() {
    try {
      const portPath = process.env.ARDUINO_PORT || 'COM3';
      const baudRate = parseInt(process.env.ARDUINO_BAUD_RATE) || 9600;
      if (!this.isConnected()) this.emit('connection-status', { state: 'reconnecting', ready: false });

      console.log(`🔌 Connecting to Arduino on ${portPath}...`);

      this.port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        autoOpen: false
      });

      // Open port
      this.port.open((err) => {
        if (err) {
          console.error('❌ Failed to open port:', err.message);
          this.connected = false;
          this.startReconnect();
          return;
        }

        console.log('✅ Port opened successfully');
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      this.port.on('open', () => {
        console.log(`✅ Arduino connected on ${portPath}`);
        this.connected = true;
        this.emit('connection-status', { state: 'connected', ready: true });
        this.emit('connected');
        this.stopReconnect();
      });

      this.port.on('close', () => {
        console.log('⚠️  Arduino disconnected');
        this.connected = false;
        this.emit('connection-status', { state: 'disconnected', ready: false });
        this.emit('disconnected');
        this.startReconnect();
      });

      this.port.on('error', (err) => {
        console.error('❌ Arduino error:', err.message);
        this.connected = false;
        this.emit('connection-status', { state: 'reconnecting', ready: false });
        this.emit('device-error', err);
        this.startReconnect();
      });

      // Listen for data
      this.parser.on('data', (data) => {
        this.handleArduinoData(data);
      });

    } catch (error) {
      console.error('❌ Failed to connect to Arduino:', error.message);
      this.connected = false;
      this.startReconnect();
    }
  }

  // Handle incoming data from Arduino
  handleArduinoData(data) {
    const message = data.toString().trim();
    console.log('📟 Arduino:', message);

    if (message.startsWith('SUCCESS:')) {
      const templateId = parseInt(message.split(':')[1]);
      this.emit('enrollment-success', templateId);
    } 
    else if (message.startsWith('FOUND:')) {
      const templateId = parseInt(message.split(':')[1]);
      this.emit('fingerprint-found', templateId);
    }
    else if (message.startsWith('ERROR:')) {
      const errorMsg = message.substring(6);
      this.emit('arduino-error', errorMsg);
    }
    else if (message.startsWith('STATUS:')) {
      const status = message.split(':')[1];
      this.emit('status', status);
    }
    else if (message.startsWith('COUNT:')) {
      const count = parseInt(message.split(':')[1]);
      this.emit('count', count);
    }
  }

  // Send command to Arduino
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.port || !this.port.isOpen) {
        return reject(new Error('Arduino not connected'));
      }

      console.log('📤 Sending command:', command);

      this.port.write(command + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Enroll fingerprint
  async enrollFingerprint(studentId) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Arduino not connected'));
      }

      const timeout = setTimeout(() => {
        this.removeAllListeners('enrollment-success');
        this.removeAllListeners('arduino-error');
        reject(new Error('Enrollment timeout - took too long'));
      }, 60000); // 60 second timeout

      const onSuccess = (templateId) => {
        clearTimeout(timeout);
        this.removeAllListeners('enrollment-success');
        this.removeAllListeners('arduino-error');
        resolve({ success: true, templateId });
      };

      const onError = (errorMsg) => {
        clearTimeout(timeout);
        this.removeAllListeners('enrollment-success');
        this.removeAllListeners('arduino-error');
        reject(new Error(errorMsg));
      };

      this.once('enrollment-success', onSuccess);
      this.once('arduino-error', onError);

      // Send enroll command
      this.sendCommand(`ENROLL:${studentId}`).catch(reject);
    });
  }

  // Verify fingerprint
  async verifyFingerprint() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Arduino not connected'));
      }

      const timeout = setTimeout(() => {
        this.removeAllListeners('fingerprint-found');
        this.removeAllListeners('arduino-error');
        reject(new Error('Verification timeout'));
      }, 15000); // 15 second timeout

      const onFound = (templateId) => {
        clearTimeout(timeout);
        this.removeAllListeners('fingerprint-found');
        this.removeAllListeners('arduino-error');
        resolve({ success: true, templateId });
      };

      const onError = (errorMsg) => {
        clearTimeout(timeout);
        this.removeAllListeners('fingerprint-found');
        this.removeAllListeners('arduino-error');
        reject(new Error(errorMsg));
      };

      this.once('fingerprint-found', onFound);
      this.once('arduino-error', onError);

      // Send verify command
      this.sendCommand('VERIFY').catch(reject);
    });
  }

  // Delete fingerprint
  async deleteFingerprint(templateId) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Arduino not connected'));
      }

      const timeout = setTimeout(() => {
        reject(new Error('Delete timeout'));
      }, 5000);

      this.once('arduino-error', (msg) => {
        clearTimeout(timeout);
        reject(new Error(msg));
      });

      this.sendCommand(`DELETE:${templateId}`)
        .then(() => {
          clearTimeout(timeout);
          resolve({ success: true });
        })
        .catch(reject);
    });
  }

  // Auto-reconnect logic
  startReconnect() {
    if (this.reconnectInterval) return;

    this.emit('connection-status', { state: 'reconnecting', ready: false });

    console.log('🔄 Starting auto-reconnect...');
    this.reconnectInterval = setInterval(() => {
      console.log('🔄 Attempting to reconnect to Arduino...');
      this.connect();
    }, 5000); // Try every 5 seconds
  }

  stopReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
      console.log('✋ Auto-reconnect stopped');
    }
  }

  // Check connection status
  isConnected() {
    return this.connected && this.port && this.port.isOpen;
  }

  // Close connection
  async disconnect() {
    this.stopReconnect();
    if (this.port && this.port.isOpen) {
      await this.port.close();
    }
    this.connected = false;
    console.log('👋 Arduino disconnected');
  }
}

// Singleton instance
const arduinoService = new ArduinoService();

// Cloud hosts do not have access to the local USB scanner. Auto-connect locally,
// or in production only when a hardware port was explicitly configured.
if (process.env.NODE_ENV !== 'production' || process.env.ARDUINO_PORT) {
  setTimeout(() => {
    arduinoService.connect();
  }, 1000);
}

module.exports = arduinoService;
