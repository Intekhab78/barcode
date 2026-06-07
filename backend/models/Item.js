const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    upc: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number },
    size: { type: String },
    color: { type: String },
    stock: { type: Number, default: 1 },
    barcodePath: { type: String },
}, { timestamps: true });

ItemSchema.index({ userId: 1, upc: 1 }, { unique: true });

module.exports = mongoose.model('Item', ItemSchema);
