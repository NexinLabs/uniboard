const mongoose = require('mongoose');
const Icon = require('./models/Icon');
const config = require('./config');

const defaultIcons = [
    { name: 'GitHub', category: 'brands', path: '/icons/brands/github.svg', tags: ['github', 'code', 'developer', 'social'], isDefault: true },
    { name: 'Twitter', category: 'brands', path: '/icons/brands/twitter.svg', tags: ['twitter', 'social', 'x'], isDefault: true },
    { name: 'Facebook', category: 'brands', path: '/icons/brands/facebook.svg', tags: ['facebook', 'social', 'meta'], isDefault: true },
];

async function seedIcons() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log('MongoDB connected');

        // Clear existing default icons
        await Icon.deleteMany({ isDefault: true });
        console.log('Cleared existing default icons');

        // Insert new default icons
        await Icon.insertMany(defaultIcons);
        console.log(`✅ Seeded ${defaultIcons.length} default icons`);

        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding icons:', err);
        process.exit(1);
    }
}

seedIcons();
