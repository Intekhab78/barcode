const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const bwipjs = require('bwip-js');
const path = require('path');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// A robust way to ensure we clear any old conflicting indexes
const dropConflictingIndexes = async () => {
    try {
        const indexes = await Item.collection.listIndexes().toArray();
        for (const idx of indexes) {
            // Drop any index that is unique but isn't our new compound one
            if (idx.unique && idx.name !== 'userId_1_upc_1' && idx.name !== '_id_') {
                console.log(`Dropping old unique index: ${idx.name}`);
                await Item.collection.dropIndex(idx.name);
            }
        }
    } catch (err) {
        console.warn('Index clean-up warning (this is usually fine):', err.message);
    }
};
dropConflictingIndexes();

router.post('/upload', auth, (req, res) => {
    upload.single('csv')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: 'File upload error: ' + err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().toLowerCase()
            }))
            .on('data', (data) => results.push(data))
            .on('error', (streamErr) => {
                console.error('CSV Stream Error:', streamErr);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(500).json({
                    message: 'Error processing CSV',
                    error: 'CSV Stream Error: ' + streamErr.message
                });
            })
            .on('end', async () => {
                try {
                    console.log('--- STARTING CSV PROCESSING ---');
                    console.log('Total rows received:', results.length);
                    console.log('Mongoose Item Schema Fields:', Object.keys(Item.schema.paths));

                    if (results.length === 0) {
                        throw new Error('CSV is empty or could not be parsed. Check your delimiters.');
                    }

                    // OVERWRITE LOGIC
                    const currentUserId = new mongoose.Types.ObjectId(req.user.id);
                    console.log(`!!! OVERWRITE START: Clearing all items for User: ${currentUserId} !!!`);

                    const deleteResult = await Item.deleteMany({ userId: currentUserId });
                    console.log(`Deleted ${deleteResult.deletedCount} old items.`);

                    const items = [];
                    for (let [index, row] of results.entries()) {
                        try {
                            const price = parseFloat(row.mrp || row.price || 0);
                            const offerPrice = (row.offer || row.offerprice) ? parseFloat(row.offer || row.offerprice) : null;

                            let size = row.size || '';
                            let color = row.color || '';

                            const sizeColor = row['size/color'];
                            if (sizeColor && !size && !color) {
                                const parts = sizeColor.split('/');
                                size = parts[0]?.trim() || '';
                                color = parts[1]?.trim() || '';
                            }

                            // Support 'ups' as seen in the user's screenshot
                            let upcStr = String(row.upc || row.ups || '').trim();

                            if (upcStr.toLowerCase().includes('e+')) {
                                const num = Number(upcStr);
                                if (!isNaN(num)) {
                                    upcStr = BigInt(Math.round(num)).toString();
                                }
                            }

                            if (!upcStr) {
                                console.warn(`Row ${index} has no UPC/UPS header, skipping.`);
                                continue;
                            }

                            // 1. Find Stock value with total flexibility
                            let stockCount = 1;
                            const stockKeys = ['stock', 'qty', 'quantity', 'stk', 'inventory'];
                            const actualKey = Object.keys(row).find(k => stockKeys.includes(k.toLowerCase().trim()));
                            if (actualKey) {
                                stockCount = parseInt(row[actualKey]) || 0;
                            }

                            console.log(`ROW ${index} -> UPC: ${upcStr} | CSV STOCK: ${row[actualKey]} | PARSED: ${stockCount}`);

                            items.push({
                                userId: currentUserId,
                                upc: upcStr,
                                description: row.description || row['item description'] || row.desc || 'No Description',
                                price,
                                offerPrice,
                                size,
                                color,
                                stock: stockCount,
                            });
                        } catch (rowErr) {
                            console.error(`Error mapping row ${index}:`, rowErr);
                        }
                    }

                    console.log(`Saving ${items.length} new items for userId: ${currentUserId}...`);
                    let savedCount = 0;

                    for (let itemData of items) {
                        try {
                            const barcodeFilename = `${itemData.upc.replace(/[^a-z0-9]/gi, '_')}.png`;
                            const barcodePath = path.join('uploads', 'barcodes', barcodeFilename);
                            const fullBarcodePath = path.join(__dirname, '..', barcodePath);
                            const fullBarcodeDir = path.dirname(fullBarcodePath);

                            if (!fs.existsSync(fullBarcodeDir)) {
                                fs.mkdirSync(fullBarcodeDir, { recursive: true });
                            }

                            const barcodeBuffer = await bwipjs.toBuffer({
                                bcid: 'code128',
                                text: itemData.upc,
                                scale: 4,
                                height: 10,
                                includetext: true,
                                textxalign: 'center',
                            });
                            fs.writeFileSync(fullBarcodePath, barcodeBuffer);
                            itemData.barcodePath = barcodePath.replace(/\\/g, '/');

                            // Create new item
                            const newItem = new Item(itemData);
                            await newItem.save();
                            savedCount++;
                        } catch (itemErr) {
                            console.error(`Failed to save item ${itemData.upc}:`, itemErr.message);
                        }
                    }

                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    console.log(`--- COMPLETE. Saved ${savedCount}/${items.length} items for ${currentUserId} ---`);

                    res.json({
                        message: `Successfully processed ${savedCount} items.`,
                        details: savedCount === 0 && items.length > 0 ? "Check server logs for possible unique index conflicts." : ""
                    });
                } catch (err) {
                    console.error('CRITICAL CSV PROCESSING ERROR:', err);
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    res.status(500).json({
                        message: 'Error processing CSV',
                        error: err.message
                    });
                }
            });
    });
});

router.get('/', auth, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        console.log(`Fetching items for UserID: ${userId}`);
        const items = await Item.find({ userId: userId });
        res.json(items);
    } catch (err) {
        console.error('Fetch items error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
