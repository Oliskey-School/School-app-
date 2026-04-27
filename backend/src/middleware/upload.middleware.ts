import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const bucket = req.body.bucket || 'general';
        let bucketPath = path.join(uploadDir, bucket);
        
        // Handle subdirectories if path is provided in body
        // Note: Field order matters! bucket and path must come BEFORE file in FormData
        if (req.body.path) {
            const safePath = req.body.path.replace(/\.\./g, '');
            const subDir = path.dirname(safePath);
            if (subDir !== '.') {
                bucketPath = path.join(bucketPath, subDir);
            }
        }

        if (!fs.existsSync(bucketPath)) {
            fs.mkdirSync(bucketPath, { recursive: true });
        }
        
        cb(null, bucketPath);
    },
    filename: (req, file, cb) => {
        // Use provided path or generate unique name
        const customPath = req.body.path;
        if (customPath) {
            // Ensure no directory traversal
            const safePath = customPath.replace(/\.\./g, '');
            cb(null, path.basename(safePath));
        } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }
});

export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
