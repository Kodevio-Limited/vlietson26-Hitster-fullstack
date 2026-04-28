const axios = require('axios');

async function testUpdateProfile() {
    const email = 'abirjsr21@gmail.com';
    const password = 'PutkiAnik@12';
    const baseUrl = 'http://localhost:4021/api';

    try {
        console.log('Logging in...');
        const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
            email,
            password
        });
        
        const token = loginResponse.data.jwtToken;
        console.log('Login successful! Token acquired.');

        console.log('Updating profile...');
        const updateResponse = await axios.post(`${baseUrl}/auth/update-profile`, 
            {
                name: 'Updated Name',
                email: email, // keep same email to avoid notification complex issues for now
                imageUrl: 'https://example.com/image.png'
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log('Update successful!');
        console.log('Updated User:', updateResponse.data);
    } catch (error) {
        console.error('Task failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testUpdateProfile();
