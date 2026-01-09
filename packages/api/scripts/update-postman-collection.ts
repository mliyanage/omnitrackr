/**
 * Script to add authentication endpoints to Postman collection
 * Run with: npx tsx scripts/update-postman-collection.ts
 */

import fs from 'fs';
import path from 'path';

const collectionPath = path.join(__dirname, '../../../docs/postman/OmniTrackr-API.postman_collection.json');

// Read existing collection
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));

// Add access token variable
if (!collection.variable.find((v: any) => v.key === 'accessToken')) {
  collection.variable.push({
    key: 'accessToken',
    value: '',
    type: 'string'
  });
}

if (!collection.variable.find((v: any) => v.key === 'refreshToken')) {
  collection.variable.push({
    key: 'refreshToken',
    value: '',
    type: 'string'
  });
}

// Create Authentication folder
const authFolder = {
  name: 'Authentication',
  description: 'User authentication and session management endpoints',
  item: [
    {
      name: 'Login',
      event: [
        {
          listen: 'test',
          script: {
            exec: [
              'if (pm.response.code === 200) {',
              '    const jsonData = pm.response.json();',
              '    if (jsonData.success && jsonData.data.accessToken) {',
              '        pm.collectionVariables.set("accessToken", jsonData.data.accessToken);',
              '        pm.collectionVariables.set("refreshToken", jsonData.data.refreshToken);',
              '        console.log("✓ Tokens saved to collection variables");',
              '    }',
              '}'
            ],
            type: 'text/javascript'
          }
        }
      ],
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            email: 'test@acme.local',
            password: 'Test123!@#',
            deviceName: 'Postman'
          }, null, 2)
        },
        url: {
          raw: '{{baseUrl}}/api/auth/login',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'login']
        },
        description: 'Login with email and password. Returns access token (15min) and refresh token (30 days).'
      }
    },
    {
      name: 'Get Current User',
      request: {
        method: 'GET',
        header: [
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        url: {
          raw: '{{baseUrl}}/api/auth/me',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'me']
        },
        description: 'Get authenticated user details. Requires valid access token.'
      }
    },
    {
      name: 'Refresh Access Token',
      event: [
        {
          listen: 'test',
          script: {
            exec: [
              'if (pm.response.code === 200) {',
              '    const jsonData = pm.response.json();',
              '    if (jsonData.success && jsonData.data.accessToken) {',
              '        pm.collectionVariables.set("accessToken", jsonData.data.accessToken);',
              '        console.log("✓ Access token refreshed");',
              '    }',
              '}'
            ],
            type: 'text/javascript'
          }
        }
      ],
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            refreshToken: '{{refreshToken}}'
          }, null, 2)
        },
        url: {
          raw: '{{baseUrl}}/api/auth/refresh',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'refresh']
        },
        description: 'Get new access token using refresh token. Use when access token expires.'
      }
    },
    {
      name: 'Change Password',
      request: {
        method: 'POST',
        header: [
          { key: 'Authorization', value: 'Bearer {{accessToken}}' },
          { key: 'Content-Type', value: 'application/json' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            currentPassword: 'Test123!@#',
            newPassword: 'NewPassword123!@#'
          }, null, 2)
        },
        url: {
          raw: '{{baseUrl}}/api/auth/change-password',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'change-password']
        },
        description: 'Change password for authenticated user. Requires current password. Revokes all sessions.'
      }
    },
    {
      name: 'Logout',
      event: [
        {
          listen: 'test',
          script: {
            exec: [
              'if (pm.response.code === 200) {',
              '    pm.collectionVariables.set("accessToken", "");',
              '    pm.collectionVariables.set("refreshToken", "");',
              '    console.log("✓ Tokens cleared");',
              '}'
            ],
            type: 'text/javascript'
          }
        }
      ],
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            refreshToken: '{{refreshToken}}'
          }, null, 2)
        },
        url: {
          raw: '{{baseUrl}}/api/auth/logout',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'logout']
        },
        description: 'Logout from current session. Revokes the refresh token.'
      }
    },
    {
      name: 'Logout All Devices',
      request: {
        method: 'POST',
        header: [
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        url: {
          raw: '{{baseUrl}}/api/auth/logout-all',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'logout-all']
        },
        description: 'Logout from all devices. Revokes all refresh tokens for current user.'
      }
    },
    {
      name: 'Request Password Reset',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            email: 'test@acme.local'
          }, null, 2)
        },
        url: {
          raw: '{{baseUrl}}/api/auth/request-password-reset',
          host: ['{{baseUrl}}'],
          path: ['api', 'auth', 'request-password-reset']
        },
        description: 'Request password reset link via email. Rate limited to 3 requests per hour.'
      }
    }
  ]
};

// Remove existing Authentication folder if it exists
collection.item = collection.item.filter((item: any) => item.name !== 'Authentication');

// Add Authentication folder at the beginning
collection.item.unshift(authFolder);

// Update version
collection.info.version = '2.1.0';

// Write back to file
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));

console.log('✅ Postman collection updated successfully!');
console.log('📁 Location:', collectionPath);
console.log('📝 Added Authentication folder with 7 endpoints');
console.log('🔐 Test credentials: test@acme.local / Test123!@#');
