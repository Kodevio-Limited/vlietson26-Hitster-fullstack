const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'abirjsr21@gmail.com',
            password: 'PutkiAnik@12'
        });
        console.log('Login successful!');
        console.log('Token:', response.data.jwtToken);
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
    }
}

testLogin();
