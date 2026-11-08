// MeoWGuard: instalar pelo navegador (WebUSB). Baseado no WebUSB do sphaira (tools/webusb),
// de ITotalJustice e colaboradores, licença GPLv3. Mudanças: textos em português.
// --- Constants ---
const MAGIC = 0x53504830;
const PACKET_SIZE = 24;

const CMD_QUIT = 0;
const CMD_OPEN = 1;
const CMD_EXPORT = 1;

const RESULT_OK = 0;
const RESULT_ERROR = 1;

const FLAG_NONE = 0;
const FLAG_STREAM = 1 << 0;

class UsbPacket {
    constructor(magic = MAGIC, arg2 = 0, arg3 = 0, arg4 = 0, arg5 = 0, crc32c = 0) {
        this.magic = magic;
        this.arg2 = arg2;
        this.arg3 = arg3;
        this.arg4 = arg4;
        this.arg5 = arg5;
        this.crc32c = crc32c;
    }

    toBuffer() {
        const buf = new ArrayBuffer(PACKET_SIZE);
        const view = new DataView(buf);

        view.setUint32(0, this.magic, true);
        view.setUint32(4, this.arg2, true);
        view.setUint32(8, this.arg3, true);
        view.setUint32(12, this.arg4, true);
        view.setUint32(16, this.arg5, true);
        view.setUint32(20, this.crc32c, true);

        return buf;
    }

    static fromBuffer(buf) {
        const view = new DataView(buf);

        return new this(
            view.getUint32(0, true),
            view.getUint32(4, true),
            view.getUint32(8, true),
            view.getUint32(12, true),
            view.getUint32(16, true),
            view.getUint32(20, true)
        );
    }

    calculateCrc32c() {
        // Get the full buffer (24 bytes), but only use the first 20 bytes for CRC32C
        const buf = this.toBuffer();
        const bytes = new Uint8Array(buf, 0, 20);
        return crc32c(0, bytes);
    }

    generateCrc32c() {
        this.crc32c = this.calculateCrc32c();
    }

    verify() {
        if (this.crc32c !== this.calculateCrc32c()) throw new Error("CRC32C mismatch");
        if (this.magic !== MAGIC) throw new Error("Bad magic");
        return true;
    }
}

class SendPacket extends UsbPacket {
    static build(cmd, arg3 = 0, arg4 = 0) {
        const packet = new SendPacket(MAGIC, cmd, arg3, arg4);
        packet.generateCrc32c();
        return packet;
    }

    getCmd() {
        return this.arg2;
    }
}

class ResultPacket extends UsbPacket {
    static build(result, arg3 = 0, arg4 = 0) {
        const packet = new ResultPacket(MAGIC, result, arg3, arg4);
        packet.generateCrc32c();
        return packet;
    }

    verify() {
        super.verify();
        if (this.arg2 !== RESULT_OK) throw new Error("Result not OK");
        return true;
    }
}

class SendDataPacket extends UsbPacket {
    static build(offset, size, crc32c) {
        const arg2 = Number((BigInt(offset) >> 32n) & 0xFFFFFFFFn);
        const arg3 = Number(BigInt(offset) & 0xFFFFFFFFn);
        const packet = new SendDataPacket(MAGIC, arg2, arg3, size, crc32c);
        packet.generateCrc32c();
        return packet;
    }

    getOffset() {
        return Number((BigInt(this.arg2) << 32n) | BigInt(this.arg3));
    }

    getSize() {
        return this.arg4;
    }

    getCrc32c() {
        return this.arg5;
    }
}

// --- CRC32C Helper ---
const crc32c = (() => {
    const POLY = 0x82f63b78;
    const table = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        }
        table[i] = crc >>> 0;
    }

    return function(crc, bytes) {
        crc ^= 0xffffffff;
        let i = 0;
        const len = bytes.length;

        for (; i < len - 3; i += 4) {
            crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
            crc = table[(crc ^ bytes[i + 1]) & 0xff] ^ (crc >>> 8);
            crc = table[(crc ^ bytes[i + 2]) & 0xff] ^ (crc >>> 8);
            crc = table[(crc ^ bytes[i + 3]) & 0xff] ^ (crc >>> 8);
        }

        for (; i < len; i++) {
            crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
        }

        return (crc ^ 0xffffffff) >>> 0;
    };
})();

// --- Main Class ---
class WebUSBFileTransfer {
    maybeStartDownloadLoop() {
        const mode = document.getElementById('modeSelect').value;
        if (mode === 'download' && this.isConnected && this.selectedDownloadDirHandle && !this.downloadLoopActive) {
            this.startDownloadLoop();
        }
    }

    // --- Download Mode: Command Loop ---
    async startDownloadLoop() {
        if (this.downloadLoopActive) return;

        this.downloadLoopActive = true;
        if (!this.selectedDownloadDirHandle) {
            this.showToast('Nenhuma pasta de destino escolhida.', 'error', 4000);
            this.downloadLoopActive = false;
            return;
        }

        if (!this.isConnected) {
            this.showToast('Switch não conectado.', 'error', 4000);
            this.downloadLoopActive = false;
            return;
        }

        this.log('Starting download command loop...');
        try {
            while (true) {
                const [cmd, arg3, arg4] = await this.get_send_header();
                if (cmd === CMD_QUIT) {
                    await this.send_result(RESULT_OK);
                    this.log('Received CMD_QUIT, exiting download loop.');
                    break;
                } else if (cmd === CMD_EXPORT) {
                    await this.send_result(RESULT_OK);
                    // Receive file name
                    const fileNameBytes = new Uint8Array(await this.read(arg3).then(r => r.data.buffer));
                    const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
                    this.log(`Receiving file: ${fileName}`);

                    // Create file in selected directory
                    const fileHandle = await this.createFileInDir(this.selectedDownloadDirHandle, fileName);
                    console.log(`Created file handle for: ${fileName}`);
                    await this.send_result(RESULT_OK);
                    console.log('Acknowledged file creation, starting data transfer...');
                    await this.downloadFileData(fileHandle);
                } else {
                    await this.send_result(RESULT_ERROR);
                    this.log(`Unknown command (${cmd}), exiting.`);
                    break;
                }
            }
        } catch (err) {
            this.log('Download loop error: ' + err.message);
            this.showToast('A cópia falhou: ' + err.message, 'error', 5000);
        } finally {
            this.downloadLoopActive = false;
        }
    }

    sanitizePathSegment(segment) {
        // Remove or replace invalid characters for directory/file names
        // Invalid: / ? < > \ : * | " . ..
        // We'll replace with _ and skip empty, ".", ".."
        if (!segment || segment === '.' || segment === '..') return null;
        return segment.replace(/[\\/:*?"<>|]/g, '_');
    }

    async createFileInDir(dirHandle, filePath) {
        this.log(`Creating file in directory: ${filePath}`);

        // filePath may include subfolders, so create them recursively
        const parts = filePath.split('/');
        let currentDir = dirHandle;

        for (let i = 0; i < parts.length - 1; i++) {
            this.log(`Creating/entering directory: ${parts[i]}`);
            const sanitized = this.sanitizePathSegment(parts[i]);
            if (!sanitized) {
                console.log(`Skipping invalid directory segment: ${parts[i]}`);
                continue;
            }

            console.log(`Processing directory segment: ${sanitized}`);
            currentDir = await currentDir.getDirectoryHandle(sanitized, { create: true });
            console.log(`Entered directory: ${sanitized}`);
        }

        console.log(`Finalizing file creation for: ${parts[parts.length - 1]}`);
        const fileName = this.sanitizePathSegment(parts[parts.length - 1]);
        if (!fileName) throw new Error('Invalid file name');

        console.log(`Creating file: ${fileName}`);
        return await currentDir.getFileHandle(fileName, { create: true });
    }

    async downloadFileData(fileHandle) {
        this.log('Starting file data transfer...');
        const writable = await fileHandle.createWritable();
        let expectedOffset = 0;
        let totalBytes = 0;
        let startTime = Date.now();
        let lastUpdate = startTime;
        let lastBytes = 0;
        let fileName = fileHandle.name || 'file';

        // Show spinner and file info in step 4 UI
        this.showDownloadSpinner(fileName, 0);

        while (true) {
            const [off, size, crc32cWant] = await this.get_send_data_header();
            await this.send_result(RESULT_OK); // acknowledge

            if (off === 0 && size === 0) break;

            const r = await this.read(size);
            const buf = new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength);
            const crc32cGot = crc32c(0, buf) >>> 0;

            if (crc32cWant !== crc32cGot) {
                this.log(`CRC32C mismatch at offset ${off}: want ${crc32cWant}, got ${crc32cGot}`);
                await this.send_result(RESULT_ERROR);
                continue;
            }

            // Hybrid: use fast streaming for sequential, random-access for others
            if (off === expectedOffset) {
                await writable.write(buf);
                expectedOffset += buf.length;
            } else {
                await writable.write({ type: 'write', position: off, data: buf });
                // expectedOffset does not change for random writes
            }

            totalBytes = Math.max(totalBytes, off + buf.length);
            // Update spinner with speed
            const now = Date.now();
            if (now - lastUpdate > 200) {
                const elapsed = (now - startTime) / 1000;
                const speed = elapsed > 0 ? (totalBytes / elapsed) : 0;
                this.updateDownloadSpinner(fileName, speed);
                lastUpdate = now;
                lastBytes = totalBytes;
            }

            await this.send_result(RESULT_OK);
        }

        // Show spinner: finishing write
        this.updateDownloadSpinner(fileName, 0, true);
        await writable.close();
        this.hideDownloadSpinner();
        this.log('File written successfully.');
    }

    // --- Download Spinner UI ---
    showDownloadSpinner(fileName, speed) {
        const spinner = document.getElementById('downloadSpinner');
        if (spinner) {
            this.updateDownloadSpinner(fileName, speed);
            spinner.style.display = 'flex';
        }
    }

    updateDownloadSpinner(fileName, speed, finishing = false) {
        const text = document.getElementById('downloadSpinnerText');
        const speedEl = document.getElementById('downloadSpinnerSpeed');
        if (!text) return;
        if (finishing) {
            text.textContent = `Terminando de gravar "${fileName}"`;
            text.scrollLeft = 0;
            if (speedEl) speedEl.textContent = '';
        } else {
            text.textContent = `Recebendo "${fileName}"`;
            if (speedEl) speedEl.textContent = speed > 0 ? `${this.formatFileSize(speed)}/s` : '';
        }
    }

    hideDownloadSpinner() {
        const spinner = document.getElementById('downloadSpinner');
        if (spinner) spinner.style.display = 'none';
    }

    // Optionally, trigger download loop after folder selection in download mode
    async handleDirectoryPicker() {
        if (!window.showDirectoryPicker) {
            this.showToast('Este navegador não permite escolher pastas.', 'error', 5000);
            return;
        }
        try {
            const dirHandle = await window.showDirectoryPicker();
            this.selectedDownloadDirHandle = dirHandle;
            document.getElementById('selectedFolderName').textContent = `Escolhida: ${dirHandle.name}`;
            this.log(`Selected download folder: ${dirHandle.name}`);
            this.maybeStartDownloadLoop();
        } catch (err) {
            if (err.name !== 'AbortError') {
                this.showToast('Não deu para escolher a pasta: ' + err.message, 'error', 5000);
            }
        }
    }
    constructor() {
        this.device = null;
        this.isConnected = false;
        this.endpointIn = null;
        this.endpointOut = null;
        this.fileQueue = [];
        this.authorizedDevices = [];
        this.toastTimeout = null;
        this.coverage = new Map();
        this.progressContext = {current:0,total:0};
        this.completedCount = 0;
        this.transferStartTime = null;
        this.lastUpdateTime = null;
        this.lastBytesTransferred = 0;
        this.currentSpeed = 0;
        this.speedSamples = [];
        this.averageSpeed = 0;
        this.setupEventListeners();
        this.checkWebUSBSupport();
    }

    // --- WebUSB Support & Device Management ---
    async checkWebUSBSupport() {
        if (!navigator.usb) {
            this.showUnsupportedSplash();
            return;
        }
        await this.loadAuthorizedDevices();
    }

    async loadAuthorizedDevices() {
        try {
            const devices = await navigator.usb.getDevices();
            this.authorizedDevices = devices.filter(device =>
                device.vendorId === 0x057e && device.productId === 0x3000
            );
            this.showAuthorizedDevices();
            if (this.authorizedDevices.length > 0) {
                this.log(`${this.authorizedDevices.length} aparelho(s) já autorizado(s) neste computador`);
                await this.tryAutoConnect();
            } else {
                this.log('Nenhum aparelho autorizado ainda');
            }
        } catch (error) {
            this.log(`Erro ao ler os aparelhos autorizados: ${error.message}`);
            this.authorizedDevices = [];
            this.showAuthorizedDevices();
        }
    }

    async tryAutoConnect() {
        if (this.authorizedDevices.length === 0) return;
        try {
            const device = this.authorizedDevices[0];
            this.log(`Reconectando a: ${device.productName || 'Aparelho desconhecido'}`);
            await this.connectToDevice(device);
        } catch (error) {
            this.log(`A reconexão falhou: ${error.message}`);
            this.showToast('Não deu para reconectar sozinho. Confira o cabo e clique em Conectar ao Switch.', 'info', 4000);
        }
    }

    // Add these methods to the class
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showAuthorizedDevices() {
        const container = document.getElementById('authorizedDevices');
        if (this.authorizedDevices.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        this.updateAuthorizedDevicesUI();
    }

    updateAuthorizedDevicesUI() {
        const listContainer = document.getElementById('deviceListContainer');
        let html = '';
        this.authorizedDevices.forEach((device, index) => {
            const deviceName = device.productName || 'Aparelho desconhecido';
            const deviceId = `${device.vendorId.toString(16).padStart(4, '0')}:${device.productId.toString(16).padStart(4, '0')}`;
            const isCurrentDevice = this.device && this.device === device && this.isConnected;
            html += `
                <div class="device-list-item">
                    <div class="device-name">${deviceName} ${device.serialNumber}</div>
                    <div class="device-id">${deviceId}</div>
                    <button class="btnf-add" data-device-index="${index}" ${isCurrentDevice ? 'disabled' : ''}>
                        ${isCurrentDevice ? 'Conectado' : 'Conectar'}
                    </button>
                </div>
            `;
        });

        listContainer.innerHTML = html;
        // Add event listeners to connect buttons
        const connectButtons = listContainer.querySelectorAll('button[data-device-index]:not([disabled])');
        connectButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceIndex = parseInt(e.target.getAttribute('data-device-index'));
                await this.connectToAuthorizedDevice(deviceIndex);
            });
        });
    }

    async connectToAuthorizedDevice(deviceIndex) {
        if (deviceIndex < 0 || deviceIndex >= this.authorizedDevices.length) {
            this.showStatus('Aparelho inválido', 'error');
            return;
        }

        const device = this.authorizedDevices[deviceIndex];
        this.log(`Conectando ao aparelho autorizado: ${device.productName || 'Aparelho desconhecido'}`);

        try {
            await this.connectToDevice(device);
        } catch (error) {
            this.log(`Não deu para conectar ao aparelho autorizado: ${error.message}`);
            this.showStatus(`Não deu para conectar: ${error.message}`, 'error');
        }
    }

    showUnsupportedSplash() {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="unsupported-splash">
                <h1>MeoWGuard</h1>
                <h2>⚠️ Este navegador não funciona aqui</h2>
                <p>Ele não tem o recurso WebUSB, que a página usa para falar com o Switch pelo cabo.</p>
                <p><strong>Abra esta página em um destes navegadores, no computador:</strong></p>
                <p>• Google Chrome<br>
                    • Microsoft Edge<br>
                    • Opera</p>
                <p>O Safari e o Firefox não têm esse recurso. No Mac, também dá para usar o app grátis OpenMTP.</p>
                <a href="https://developer.mozilla.org/pt-BR/docs/Web/API/WebUSB_API#compatibilidade_com_navegadores"
                    class="browser-link" target="_blank" rel="noopener noreferrer">
                    Ver quais navegadores funcionam
                </a>
            </div>
        `;
    }

    // --- UI Event Listeners ---
    setupEventListeners() {
        document.getElementById('connectBtn').addEventListener('click', () => this.connectDevice());
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnectDevice());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('sendBtn').addEventListener('click', () => this.sendFile());
        document.getElementById('clearLogBtn').addEventListener('click', () => this.clearLog());
        document.getElementById('copyLogBtn').addEventListener('click', () => this.copyLog());
        document.getElementById('addFilesBtn').addEventListener('click', () => this.triggerFileInput());
        document.getElementById('clearQueueBtn').addEventListener('click', () => this.clearFileQueue());
        document.getElementById('toastClose').addEventListener('click', () => this.hideConnectionToast());

        // Mode select dropdown
        document.getElementById('modeSelect').addEventListener('change', (e) => this.handleModeChange(e));

        // Folder picker for download mode (File System Access API)
        document.getElementById('pickFolderBtn').addEventListener('click', async () => {
            await this.handleDirectoryPicker();
        });
    }

    handleModeChange(e) {
        const mode = e.target.value;
        const uploadStep3 = document.getElementById('uploadStep3Section');
        const uploadStep4 = document.getElementById('uploadStep4Section');
        const downloadStep3 = document.getElementById('downloadStep3Section');
        const downloadStep4 = document.getElementById('downloadStep4Section');

        if (mode === 'upload') {
            uploadStep3.style.display = '';
            uploadStep4.style.display = '';
            downloadStep3.style.display = 'none';
            downloadStep4.style.display = 'none';
        } else {
            uploadStep3.style.display = 'none';
            uploadStep4.style.display = 'none';
            downloadStep3.style.display = '';
            downloadStep4.style.display = '';
        }
    }

    // --- File Queue Management ---
    triggerFileInput() {
        document.getElementById('fileInput').click();
    }

    clearFileQueue() {
        this.fileQueue = [];
        document.getElementById('fileInput').value = '';
        this.updateFileQueueUI();
        this.log('Lista de arquivos limpa');
        this.showToast('Lista de arquivos limpa', 'info', 2000);
    }

    handleFileSelect(event) {
        const newFiles = Array.from(event.target.files);
        const allowedExt = ['.nsp', '.xci', '.nsz', '.xcz', '.msp'];

        if (newFiles.length > 0) {
            let added = 0;
            for (const file of newFiles) {
                const lower = file.name.toLowerCase();
                if (!allowedExt.some(ext => lower.endsWith(ext))) {
                    this.log(`Arquivo ignorado (não é NSP, NSZ, XCI, XCZ ou MSP): ${file.name}`);
                    continue;
                }

                if (!this.fileQueue.some(f => f.name === file.name && f.size === file.size)) {
                    this.fileQueue.push(file);
                    added++;
                }
            }

            if (added > 0) {
                this.updateFileQueueUI();
                this.log(`${added} arquivo(s) na lista. Total: ${this.fileQueue.length}`);
                this.showToast(`${added} arquivo(s) na lista`, 'success', 2000);
            } else {
                this.showToast('Nenhum arquivo de jogo foi adicionado (use NSP, NSZ, XCI, XCZ ou MSP)', 'info', 2000);
            }
        }

        // Reset input so same files can be picked again
        event.target.value = '';
    }

    updateFileQueueUI() {
        const queueList = document.getElementById('fileQueueList');
        const fileCount = document.getElementById('fileCount');
        fileCount.textContent = `${this.fileQueue.length} arquivo${this.fileQueue.length !== 1 ? 's' : ''}`;
        if (this.fileQueue.length === 0) {
            queueList.innerHTML = '<div class="file-item vazio">Nenhum arquivo ainda. Clique em "Escolher arquivos".</div>';
            document.getElementById('clearQueueBtn').disabled = true;
            document.getElementById('sendBtn').disabled = true;
            return;
        }

        document.getElementById('clearQueueBtn').disabled = false;
        document.getElementById('sendBtn').disabled = !this.isConnected;
        let html = '';
        let totalSize = 0;

        for (let i = 0; i < this.fileQueue.length; i++) {
            const file = this.fileQueue[i];
            totalSize += file.size;
            html += `
                <div class="file-item">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                    <div class="file-actions">
                        <button class="btn-remove" data-index="${i}">Tirar</button>
                    </div>
                </div>
            `;
        }

        html += `
            <div class="file-item total">
                <div class="file-name">Total</div>
                <div class="file-size">${this.formatFileSize(totalSize)}</div>
                <div class="file-actions"></div>
            </div>
        `;
        queueList.innerHTML = html;

        // Add event listeners to remove buttons
        const removeButtons = queueList.querySelectorAll('.btn-remove');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeFileFromQueue(index);
            });
        });
    }

    removeFileFromQueue(index) {
        if (index >= 0 && index < this.fileQueue.length) {
            const removedFile = this.fileQueue[index];
            this.fileQueue.splice(index, 1);
            this.updateFileQueueUI();
            this.log(`"${removedFile.name}" saiu da lista`);
            this.showStatus(`"${removedFile.name}" saiu da lista`, 'info');
        }
    }

    // --- Device Connection ---
    async connectDevice() {
        try {
            this.log('Pedindo permissão para usar o cabo...');
            this.device = await navigator.usb.requestDevice({
                filters: [{ vendorId: 0x057e, productId: 0x3000 }]
            });

            await this.connectToDevice(this.device);
            await this.loadAuthorizedDevices();
        } catch (error) {
            this.log(`Erro ao conectar: ${error.message}`);
            this.showToast(`Não deu para conectar: ${error.message}`, 'error', 5000);
        }
    }

    async connectToDevice(device) {
        this.device = device;
        this.log(`Aparelho escolhido: ${this.device.productName || 'desconhecido'}`);

        await this.device.open();
        if (this.device.configuration === null) {
            await this.device.selectConfiguration(1);
            this.log('Configuração escolhida');
        }

        await this.device.claimInterface(0);
        this.log('Conexão reservada para esta página');
        const iface = this.device.configuration.interfaces[0].alternates[0];
        this.endpointIn  = iface.endpoints.find(e => e.direction === 'in' && e.type === 'bulk')?.endpointNumber;
        this.endpointOut = iface.endpoints.find(e => e.direction === 'out' && e.type === 'bulk')?.endpointNumber;
        if (this.endpointIn === undefined || this.endpointOut === undefined) {
            throw new Error("Bulk IN/OUT endpoints not found");
        }

        this.isConnected = true;
        this.updateUI();
        this.showToast(`Switch conectado!`, 'success', 3000);
        this.showConnectionToast(`Conectado: ${this.device.productName || 'Switch'}`, 'connect');
        this.maybeStartDownloadLoop();
    }

    async disconnectDevice() {
        try {
            if (this.device) {
                try {
                    if (this.isConnected) {
                        await this.device.close();
                    }
                } catch (closeErr) {
                    this.log(`Fechamento ignorado: ${closeErr.message}`);
                } finally {
                    this.device = null;
                    this.isConnected = false;
                    this.updateUI();
                    this.log('Desconectado');
                    this.showConnectionToast('Switch desconectado', 'disconnect');
                }
            }
        } catch (error) {
            this.log(`Erro ao desconectar: ${error.message}`);
            this.showToast(`Erro ao desconectar: ${error.message}`, 'error', 4000);
        }
    }

    // --- File Transfer ---
    async sendFile() {
        const files = this.fileQueue;
        let utf8Encode = new TextEncoder();
        if (!files.length || !this.isConnected) {
            this.showToast('Conecte o Switch e escolha os arquivos primeiro', 'error', 4000);
            return;
        }

        let names = files.map(f => f.name).join("\n") + "\n";
        const string_table = utf8Encode.encode(names);
        this.completedCount = 0;
        this.showTransferProgress(files.length);

        try {
            this.log(`Esperando o Switch começar...`);
            document.getElementById('sendBtn').disabled = true;
            await this.get_send_header();
            await this.send_result(RESULT_OK, string_table.length);
            await this.write(string_table);

            while (true) {
                try {
                    const [cmd, arg3, arg4] = await this.get_send_header();
                    if (cmd == CMD_QUIT) {
                        await this.send_result(RESULT_OK);
                        if (files.length > 0) {
                            this.log(`Todos os ${files.length} arquivos enviados`);
                            this.showToast(
                                `✅ Todos os ${files.length} arquivos foram enviados! Acompanhe a instalação no Switch.`,
                                'success', 5000
                            );
                            this.updateTransferProgress(files.length, files.length, 0, null, 100);
                        }
                        break;
                    } else if (cmd == CMD_OPEN) {
                        const file = files[arg3];
                        if (!file) {
                            await this.send_result(RESULT_ERROR);
                            this.showToast(`O Switch pediu um arquivo que não existe: ${arg3}`, 'error', 5000);
                            this.log(`❌ Envio parado: arquivo ${arg3} inválido (de ${files.length})`);
                            break;
                        }

                        const total = files.length;
                        const current = arg3 + 1;
                        this.progressContext = {current, total};

                        this.log(`Abrindo arquivo [${current}/${total}]: ${file.name} (${this.formatFileSize(file.size)})`);
                        this.showToast(`📤 Enviando ${current} de ${total}: ${file.name}`, 'info', 3000);
                        this.updateTransferProgress(this.completedCount, total, 0, file, 0);
                        this.coverage.delete(file.name);

                        await this.send_result(RESULT_OK);
                        await this.file_transfer_loop(file);

                        this.completedCount += 1;
                        this.showToast(`✅ ${current} de ${total} enviado`, 'success', 2000);
                        this.updateTransferProgress(this.completedCount, total, 0, null, 100);
                    } else {
                        await this.send_result(RESULT_ERROR);
                        this.log(`❌ Comando desconhecido (${cmd}) vindo do Switch`);
                        this.showToast(
                            `❌ O envio parou depois de ${this.completedCount} de ${files.length} arquivos (comando desconhecido)`,
                            'error', 5000
                        );
                        break;
                    }
                } catch (loopError) {
                    this.log(`❌ Erro: ${loopError.message}`);
                    this.showToast(
                        `❌ O envio parou depois de ${this.completedCount} de ${files.length} arquivos`,
                        'error', 5000
                    );
                    break;
                }
            }
        } catch (error) {
            this.log(`Erro no envio: ${error.message}`);
            this.showToast(`O envio falhou: ${error.message}`, 'error', 5000);
        } finally {
            document.getElementById('sendBtn').disabled = false;
            setTimeout(() => { this.hideTransferProgress(); }, 3000);
        }
    }

    async read(size) {
        const result = await this.device.transferIn(this.endpointIn, size);
        if (result.status && result.status !== 'ok') {
            throw new Error(`USB transferIn failed: ${result.status}`);
        }

        if (!result.data) {
            throw new Error('transferIn returned no data');
        }

        return result;
    }

    async write(buffer) {
        const result = await this.device.transferOut(this.endpointOut, buffer);
        if (result.status && result.status !== 'ok') {
            throw new Error(`USB transferOut failed: ${result.status}`);
        }

        return result;
    }

    // --- Protocol Helpers ---
    async get_send_header() {
        // Read a full SendPacket (24 bytes)
        const result = await this.read(PACKET_SIZE);
        const buf = result.data.buffer.slice(result.data.byteOffset, result.data.byteOffset + PACKET_SIZE);
        const packet = SendPacket.fromBuffer(buf);
        packet.verify();
        return [packet.getCmd(), packet.arg3, packet.arg4];
    }

    async get_send_data_header() {
        // Read a full SendDataPacket (24 bytes)
        const result = await this.read(PACKET_SIZE);
        const buf = result.data.buffer.slice(result.data.byteOffset, result.data.byteOffset + PACKET_SIZE);
        const packet = SendDataPacket.fromBuffer(buf);
        packet.verify();
        return [packet.getOffset(), packet.getSize(), packet.getCrc32c()];
    }

    async send_result(result, arg3 = 0, arg4 = 0) {
        // Build a ResultPacket and send it
        const packet = ResultPacket.build(result, arg3, arg4);
        await this.write(packet.toBuffer());
    }

    // --- File Transfer Loop ---
    // Modify the file_transfer_loop method to track progress
    async file_transfer_loop(file) {
        this.disableFileControls(true);

        // Reset progress tracking
        this.transferStartTime = Date.now();
        this.lastUpdateTime = null;
        this.lastBytesTransferred = 0;
        this.currentSpeed = 0;
        this.speedSamples = [];
        this.averageSpeed = 0;

        try {
            while (true) {
                const [off, size, _] = await this.get_send_data_header();

                if (off === 0 && size === 0) {
                    await this.send_result(RESULT_OK);
                    this.log("Envio concluído");
                    this.markCoverage(file, Math.max(0, file.size - 1), 1);
                    break;
                }

                const slice = file.slice(off, off + size);
                const buf   = new Uint8Array(await slice.arrayBuffer());
                const crc32c_got = crc32c(0, buf) >>> 0;

                // send result and data.
                await this.send_result(RESULT_OK, buf.length, crc32c_got);
                await this.write(buf);

                // Update progress tracking
                this.markCoverage(file, off, size);
            }
        } catch (err) {
            this.log(`Erro no arquivo: ${err.message}`);
            this.showToast(`Envio do arquivo cancelado: ${err.message}`, 'error', 4000);
        } finally {
            this.disableFileControls(false);
        }
    }

    disableFileControls(disable) {
        document.getElementById('addFilesBtn').disabled = disable || !this.isConnected;
        document.getElementById('clearQueueBtn').disabled = disable || this.fileQueue.length === 0;
        document.querySelectorAll('.btn-remove').forEach(btn => btn.disabled = disable);
    }

    // --- Coverage Tracking ---
    markCoverage(file, off, size) {
        const BLOCK = 65536;
        let set = this.coverage.get(file.name);
        if (!set) {
            set = new Set();
            this.coverage.set(file.name, set);
        }

        if (size > 0) {
            const start = Math.floor(off / BLOCK);
            const end = Math.floor((off + size - 1) / BLOCK);
            for (let b = start; b <= end; b++) set.add(b);
        }

        const coveredBytes = Math.min(set.size * BLOCK, file.size);
        const pct = file.size > 0 ? Math.min(100, Math.floor((coveredBytes / file.size) * 100)) : 100;

        if (this.progressContext.total > 0) {
            this.updateTransferProgress(this.completedCount, this.progressContext.total, coveredBytes, file, pct);
        }
        return pct;
    }

    // --- UI State ---
    updateUI() {
        document.getElementById('connectBtn').disabled = this.isConnected;
        document.getElementById('disconnectBtn').disabled = !this.isConnected;
        document.getElementById('addFilesBtn').disabled = !this.isConnected;
        document.getElementById('sendBtn').disabled = !this.isConnected || this.fileQueue.length === 0;

        if (this.authorizedDevices.length > 0) {
            this.updateAuthorizedDevicesUI();
        }
    }

    // --- Status & Logging ---
    showStatus(message, type) {
        this.log(`[${type.toUpperCase()}] ${message}`);
    }

    log(message) {
        const logDiv = document.getElementById('logDiv');
        const timestamp = new Date().toLocaleTimeString();
        logDiv.textContent += `[${timestamp}] ${message}\n`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    clearLog() {
        const logDiv = document.getElementById('logDiv');
        logDiv.textContent = '';
        this.log('Registro limpo');
    }

    copyLog() {
        const logDiv = document.getElementById('logDiv');
        navigator.clipboard.writeText(logDiv.textContent)
            .then(() => { this.log('Registro copiado'); })
            .catch(err => { this.log(`Não deu para copiar o registro: ${err}`); });
    }

    // --- Formatting ---
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

        // For speeds, we want to show one decimal place for MB/s and GB/s
        if (i >= 2 && value < 10) {
            return value.toFixed(1) + ' ' + sizes[i];
        }

        return value + ' ' + sizes[i];
    }

    // --- Toasts & Progress UI ---
    showConnectionToast(message, type = 'connect') {
        const toast = document.getElementById('connectionToast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = toast.querySelector('.toast-icon');
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        toastMessage.textContent = message;
        if (type === 'connect') {
            toastIcon.textContent = '🔗';
            toast.className = 'connection-toast';
        } else {
            toastIcon.textContent = '🔌';
            toast.className = 'connection-toast disconnect';
        }
        toast.classList.add('show');
        this.toastTimeout = setTimeout(() => { this.hideConnectionToast(); }, 4000);
    }

    hideConnectionToast() {
        const toast = document.getElementById('connectionToast');
        toast.classList.remove('show');
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        const toast = document.getElementById('connectionToast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = toast.querySelector('.toast-icon');
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        toastMessage.textContent = message;
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌',
            'connect': '🔗',
            'disconnect': '🔌'
        };
        toastIcon.textContent = icons[type] || 'ℹ️';
        toast.className = `connection-toast ${type}`;
        toast.classList.add('show');
        this.toastTimeout = setTimeout(() => { this.hideConnectionToast(); }, duration);
    }

    // --- Progress UI ---
    showTransferProgress(totalFiles) {
        const progressDiv = document.getElementById('transferProgress');
        progressDiv.style.display = 'block';
        this.updateTransferProgress(0, totalFiles, 0, null, 0);
    }

    updateTransferProgress(completed, total, offset, currentFile, fileProgress) {
        this.updateProgressStats(offset, currentFile);
        this.updateProgressUI(completed, total, offset, currentFile, fileProgress);
    }

    updateProgressStats(offset, currentFile) {
        const now = Date.now();
        let fileSize = 0;
        if (currentFile) {
            fileSize = currentFile.size;
        }

        // Calculate speed
        if (this.lastUpdateTime) {
            const timeDiff = (now - this.lastUpdateTime) / 1000; // in seconds
            if (timeDiff > 0.1) { // Update at most every 100ms
                const bytesDiff = offset - this.lastBytesTransferred;
                this.currentSpeed = bytesDiff / timeDiff; // bytes per second

                // Add to samples for averaging (keep last 10 samples)
                this.speedSamples.push(this.currentSpeed);
                if (this.speedSamples.length > 10) {
                    this.speedSamples.shift();
                }

                // Calculate average speed
                this.averageSpeed = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;

                this.lastUpdateTime = now;
                this.lastBytesTransferred = offset;
            }
        } else {
            this.lastUpdateTime = now;
            this.lastBytesTransferred = offset;
        }
    }

    updateProgressUI(completed, total, offset, currentFile, fileProgress) {
        // Update progress counter
        document.getElementById('progressCounter').textContent = `${completed} / ${total}`;

        // Update progress title based on state
        this.updateProgressTitle(completed, total, currentFile);

        // Update time and speed information
        this.updateTimeAndSpeedInfo(offset, currentFile);

        // Update progress bar
        this.updateProgressBar(fileProgress);

        // Update percentage display
        document.getElementById('progressPercentage').textContent = `${Math.round(fileProgress)}%`;
    }

    updateProgressTitle(completed, total, currentFile) {
        const progressTitle = document.getElementById('progressTitle');

        if (currentFile) {
            const truncatedName = currentFile.name.length > 100 ?
                currentFile.name.slice(0, 97) + '...' : currentFile.name;
            progressTitle.textContent = `📄 ${truncatedName}`;

            // Show progress bar when a file is being transferred
            document.getElementById('transferProgress').style.display = 'block';
        } else if (completed === total && total > 0) {
            progressTitle.textContent = '✅ Tudo enviado! Acompanhe a instalação no Switch.';

            // Hide progress details when all files are done
            setTimeout(() => {
                document.getElementById('transferProgress').style.display = 'none';
            }, 3000);
        } else {
            progressTitle.textContent = 'Esperando o próximo arquivo...';
        }
    }

    updateTimeAndSpeedInfo(offset, currentFile) {
        const now = Date.now();
        let fileSize = 0;
        if (currentFile) {
            fileSize = currentFile.size;
        }

        // Calculate time spent
        const timeSpent = (now - this.transferStartTime) / 1000;

        // Calculate time remaining
        let timeRemaining = 0;
        if (this.averageSpeed > 0) {
            const remainingBytes = fileSize - offset;
            timeRemaining = remainingBytes / this.averageSpeed;
        }

        // Update UI elements
        document.getElementById('timeSpent').textContent = this.formatTime(timeSpent);
        document.getElementById('timeRemaining').textContent = timeRemaining > 0 ? this.formatTime(timeRemaining) : '--:--';
        document.getElementById('dataTransferred').textContent = this.formatFileSize(offset);
        document.getElementById('currentSpeed').textContent = `${this.formatFileSize(this.averageSpeed)}/s`;
        document.getElementById('transferSpeed').textContent = `${this.formatFileSize(this.averageSpeed)}/s`;
    }

    updateProgressBar(fileProgress) {
        const progressBar = document.getElementById('fileProgressBar');
        if (progressBar) {
            progressBar.style.width = `${fileProgress}%`;
        }
    }

    hideTransferProgress() {
        const progressDiv = document.getElementById('transferProgress');
        progressDiv.style.display = 'none';
    }
}

// --- App Initialization ---
let app;
window.addEventListener('load', async () => {
    app = new WebUSBFileTransfer();
});

// --- Global USB Event Handlers ---
navigator.usb?.addEventListener('disconnect', async (event) => {
    console.log('USB device disconnected:', event.device);
    if (app?.device && event.device === app.device) {
        app.disconnectDevice();
        await app.loadAuthorizedDevices();
        await app.tryAutoConnect();
    }
});

navigator.usb?.addEventListener('connect', async (event) => {
    console.log('USB device connected:', event.device);
    if (app) {
        await app.loadAuthorizedDevices();
        await app.tryAutoConnect();
    }
});
