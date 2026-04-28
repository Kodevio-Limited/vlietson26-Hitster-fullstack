try {
    const bcrypt = require('bcrypt');
    console.log('Successfully loaded bcrypt');
} catch (e) {
    console.error('Failed to load bcrypt');
    console.error(e);
}
