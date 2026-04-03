import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class PliegerApi implements ICredentialType {
    name = 'pliegerApi';
    displayName = 'Plieger API';
    documentationUrl = 'https://jouw-docs-url.com';

    properties: INodeProperties[] = [
        {
            displayName: 'API Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'http://plieger-sanitairkiezer.test',
            description: 'De basis URL van je Flex Platform instantie',
            required: true,
        },
        // 1. De Keuzeschakelaar
        {
            displayName: 'Authentication Type',
            name: 'authType',
            type: 'options',
            options: [
                {
                    name: 'Client Credentials (Key/Secret)',
                    value: 'client_credentials',
                },{
                    name: 'User Login (Email/Password)',
                    value: 'user_login',
                }
            ],
            default: 'client_credentials',
            description: 'Kies hoe je wilt authentiseren',
            required: true,
        },

        // --- SCENARIO A: Client Credentials ---
        {
            displayName: 'Client Key',
            name: 'clientKey',
            type: 'string',
            default: '',
            required: true,
            displayOptions: {
                show: {
                    authType: [
                        'client_credentials',
                    ],
                },
            },
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            displayOptions: {
                show: {
                    authType: [
                        'client_credentials',
                    ],
                },
            },
        },

        // --- SCENARIO B: User Login ---
        {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            placeholder: 'user@example.com',
            required: true,
            displayOptions: {
                show: {
                    authType: [
                        'user_login',
                    ],
                },
            },
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            displayOptions: {
                show: {
                    authType: [
                        'user_login',
                    ],
                },
            },
        }
    ];
}