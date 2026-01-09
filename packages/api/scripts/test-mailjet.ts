import Mailjet from 'node-mailjet';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.development.local') });

const apiKey = process.env.MJ_APIKEY_PUBLIC || '';
const apiSecret = process.env.MJ_APIKEY_PRIVATE || '';
const fromEmail = process.env.FROM_EMAIL || 'noreply@omnitrackr.dev';
const fromName = process.env.FROM_NAME || 'OmniTrackr';

console.log('Testing Mailjet API Configuration:');
console.log('API Key (Public):', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
console.log('API Secret (Private):', apiSecret ? `${apiSecret.substring(0, 10)}...` : 'MISSING');
console.log('From Email:', fromEmail);
console.log('From Name:', fromName);
console.log('---');

if (!apiKey || !apiSecret) {
  console.error('ERROR: Missing Mailjet API credentials');
  process.exit(1);
}

const mailjet = new Mailjet({
  apiKey,
  apiSecret,
});

async function testMailjetConnection() {
  try {
    console.log('Testing Mailjet API connection...');

    // Test 1: Verify connection by checking sender list
    console.log('\n1. Verifying API connection...');
    const senderRequest = mailjet
      .get('sender', { version: 'v3' })
      .request();

    const senderResult = await senderRequest;
    console.log('✓ API connection successful');
    console.log('Authorized senders:', senderResult.body.Data.map((s: any) => s.Email).join(', '));

    // Test 2: Send a test email
    console.log('\n2. Sending test email to mliyanage@gmail.com...');
    const sendRequest = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: fromEmail,
              Name: fromName,
            },
            To: [
              {
                Email: 'mliyanage@gmail.com',
                Name: 'Manjula',
              },
            ],
            Subject: 'Mailjet API Test - OmniTrackr',
            HTMLPart: `
              <h3>Hello from OmniTrackr!</h3>
              <p>This is a test email to verify that the Mailjet API integration is working correctly.</p>
              <p>If you received this email, the configuration is successful!</p>
              <hr>
              <p style="font-size: 12px; color: #666;">
                From: ${fromEmail}<br>
                Sent via Mailjet REST API v3.1<br>
                Time: ${new Date().toISOString()}
              </p>
            `,
            TextPart: 'Hello from OmniTrackr! This is a test email to verify that the Mailjet API integration is working correctly.',
          },
        ],
      });

    const sendResult = await sendRequest;

    console.log('✓ Email sent successfully!');
    console.log('Response status:', sendResult.response.status);
    console.log('Response body:', JSON.stringify(sendResult.body, null, 2));

    process.exit(0);
  } catch (error: any) {
    console.error('\n✗ Error occurred:');
    console.error('Status Code:', error.statusCode);
    console.error('Error Message:', error.message);

    if (error.response) {
      console.error('Response:', error.response.text || error.response);
    }

    if (error.statusCode === 401) {
      console.error('\n⚠ Authentication failed. Please check:');
      console.error('  1. API keys are correct and not expired');
      console.error('  2. API keys are for the correct Mailjet account');
      console.error('  3. Get fresh keys from: https://app.mailjet.com/account/apikeys');
    }

    if (error.statusCode === 400) {
      console.error('\n⚠ Bad request. Please check:');
      console.error('  1. FROM_EMAIL domain is authorized in Mailjet');
      console.error('  2. Domain verification is complete');
      console.error('  3. Sender email is validated');
      console.error('  4. Check: https://app.mailjet.com/account/sender');
    }

    process.exit(1);
  }
}

testMailjetConnection();
