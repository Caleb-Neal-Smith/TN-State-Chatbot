require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Add JSON body parsing middleware
app.use(express.json());

// Add URL-encoded body parsing middleware (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Configure multer for file upload handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        // Create the uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Get the file extension
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        
        // Check if file already exists
        let finalName = file.originalname;
        let counter = 0;
        
        while (fs.existsSync(path.join('uploads', finalName))) {
            counter++;
            // If file exists, add timestamp to filename
            finalName = `${nameWithoutExt}_${Date.now()}${ext}`;
        }
        
        cb(null, finalName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // Limit each file size to 10MB
        files: parseInt(process.env.MAX_FILES) || 10 // Limit to 10 files per upload
    },
    fileFilter: function (req, file, cb) {
        // Define allowed file types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'));
        }
    }
});

// Handle multiple file upload POST request
app.post('/api/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Create response with files details
        const filesInfo = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path
        }));

        // Log upload success for monitoring
        console.log('Files uploaded successfully:', filesInfo);

        // Return success response
        res.status(200).json({
            message: `Successfully uploaded ${req.files.length} files`,
            files: filesInfo
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File size too large. Maximum size is 10MB per file'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files. Maximum is 10 files per upload'
            });
        }
    }
    res.status(400).json({
        error: error.message
    });
});

// Get list of files endpoint
app.get('/api/files', (req, res) => {
    const uploadDir = 'uploads';
    
    try {
        if (!fs.existsSync(uploadDir)) {
            return res.json({ files: [] });
        }

        const files = fs.readdirSync(uploadDir)
            .map(filename => {
                const filePath = path.join(uploadDir, filename);
                const stats = fs.statSync(filePath);
                return {
                    name: filename,
                    size: stats.size,
                    uploadDate: stats.mtime,
                    path: `/download/${filename}`
                };
            })
            .sort((a, b) => b.uploadDate - a.uploadDate); // Sort by date, newest first

        res.json({ files });
    } catch (error) {
        console.error('Error reading files:', error);
        res.status(500).json({ error: 'Failed to read files' });
    }
});

// Download file endpoint
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, filename);
});

// Delete file endpoint
app.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        fs.unlinkSync(filePath);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

app.post('/api/chat', async (req, res) => {
    console.log('Received chat request:', req.body); // Add logging to debug request body

    const { model, message } = req.body;
    if (!model || !message) {
        return res.status(400).json({ error: 'Missing required fields: model and message' });
    }

    const ollamaRequest = {
        hostname: process.env.OLLAMA_ADDRESS || 'localhost',
        port: parseInt(process.env.OLLAMA_PORT) || 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const ollamaReq = http.request(ollamaRequest, (ollamaRes) => {
        let data = '';

        ollamaRes.on('data', (chunk) => {
            data += chunk;
        });

        ollamaRes.on('end', () => {
            try {
                const response = JSON.parse(data);
                res.json({ response: response.response });
            } catch (error) {
                console.error('Error parsing Ollama response:', error);
                res.status(500).json({ error: 'Failed to parse Ollama response' });
            }
        });
    });

    ollamaReq.on('error', (error) => {
        console.error('Error communicating with Ollama:', error);
        res.status(500).json({ error: 'Failed to communicate with Ollama' });
    });

    ollamaReq.write(JSON.stringify({
        model: model,
        prompt: message,
        stream: false
    }));
    ollamaReq.end();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});