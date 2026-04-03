import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Import the separate description files
import { customApiOperations, customApiFields } from './descriptions/CustomApi.description';
import { invoicesOperations, invoicesFields } from './descriptions/Invoices.description';
import { assignmentsOperations, assignmentsFields } from './descriptions/Assignments.description';
import { clientsOperations, clientsFields } from './descriptions/Clients.description';
import { employeesOperations, employeesFields } from './descriptions/Employees.description';
import { freelanceOperations, freelanceFields } from './descriptions/Freelance.description';
import { contractsOperations, contractsFields } from './descriptions/Contracts.description';
import { documentsOperations, documentsFields } from './descriptions/Documents.description';
import { xplannerOperations, xplannerFields } from '../XPlanner/descriptions/XPlanner.description';

export class FlexPlatform implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Flex Platform',
        name: 'flexPlatform',
        icon: { light: 'file:flex-platform.svg', dark: 'file:flex-platform.svg' },
        group: ['transform'],
        version: 1,
        description: 'Interaction with Flex Platform API',
        defaults: {
            name: 'Flex Platform',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'flexPlatformApi',
                required: true,
            },
        ],
        properties: [
            // ----------------------------------
            // MAIN RESOURCE SELECTOR
            // ----------------------------------
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Custom API Call',
                        value: 'custom',
                    },
                    {
                        name: 'Employees',
                        value: 'employees',
                    },
                    {
                        name: 'Freelance',
                        value: 'freelance',
                    },
                    {
                        name: 'Assignments',
                        value: 'assignments',
                    },
                    {
                        name: 'Clients',
                        value: 'clients',
                    },
                    {
                        name: 'Invoices',
                        value: 'invoices',
                    },
                    {
                        name: 'Contracts',
                        value: 'contracts',
                    },
                    {
                        name: 'Documents',
                        value: 'documents',
                    },
                    {
                        name: 'XPlanner',
                        value: 'xplanner',
                    },
                ],
                default: 'assignments',
            },

            // ----------------------------------
            // IMPORT MODULES
            // ----------------------------------

            // Custom API
            ...customApiOperations,
            ...customApiFields,

            // Assignments
            ...assignmentsOperations,
            ...assignmentsFields,

            // Clients
            ...clientsOperations,
            ...clientsFields,

            // Employee
            ...employeesOperations,
            ...employeesFields,

            // Freelance
            ...freelanceOperations,
            ...freelanceFields,

            // Contracts
            ...contractsOperations,
            ...contractsFields,

            // Documents
            ...documentsOperations,
            ...documentsFields,

            // Invoices
            ...invoicesOperations,
            ...invoicesFields,

            // XPlanner
            ...xplannerOperations,
            ...xplannerFields,
        ],
    };

    // --- TOKEN CACHE ---
    private static tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

    // --- CUSTOM HELPER ---
    private static async getAccessToken(executeFunctions: IExecuteFunctions, credentials: any): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const baseUrl = credentials.baseUrl as string;
        const authType = credentials.authType as string; // <--- Fetch authType

        // 1. Determine unique cache key
        // For User Login we use email, for Client Creds we use the key
        const cacheKey = authType === 'user_login'
            ? `user_${credentials.email}`
            : `client_${credentials.clientKey}`;

        // 2. Check cache
        const cached = FlexPlatform.tokenCache.get(cacheKey);
        if (cached && cached.expiresAt > (now + 60)) {
            return cached.token;
        }

        let options: any = {
            method: 'POST',
            json: true,
        };

        // 3. Split logic based on Auth Type
        if (authType === 'user_login') {
            // --- SCENARIO: USER LOGIN ---
            // Adjust the URI to your specific login endpoint (e.g. /api/login or /sanctum/token)
            options.uri = `${baseUrl}/api/auth/request-token`;
            options.body = {
                email: credentials.email,
                password: credentials.password,
                device_name: 'n8n-workflow', // Often needed for Sanctum
            };
        } else {
            // --- SCENARIO: CLIENT CREDENTIALS ---
            options.uri = `${baseUrl}/api/auth/request-token`;
            options.body = {
                client_key: credentials.clientKey,
                client_secret: credentials.clientSecret,
            };
        }

        try {
            const response = await executeFunctions.helpers.request(options);

            // Note: With Sanctum user tokens you often don't get an 'expires_at' back (they are valid indefinitely or for a long time).
            // If expires_at is missing, we set a default (e.g. 1 hour or 24 hours for caching).
            let expiresAt = now + 3600; // Default 1 hour

            if (response.expires_at) {
                const expiresDate = new Date(response.expires_at);
                expiresAt = Math.floor(expiresDate.getTime() / 1000);
            }

            // Retrieve token (Sanctum often sends this as plain text or within an object)
            const token = typeof response === 'string' ? response : response.token;

            // Save in the Map
            FlexPlatform.tokenCache.set(cacheKey, {
                token: token,
                expiresAt: expiresAt,
            });

            return token;
        } catch (error: any) {
            throw new Error(`Could not retrieve access token (${authType}): ${error.message}`);
        }
    }

    // --- EXECUTE ---
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        
        const credentials = await this.getCredentials('flexPlatformApi');
        const baseUrl = credentials.baseUrl as string;
        const authType = credentials.authType as string;
        
        // Determine the cache key in case we need to clear it later on failure
        const cacheKey = authType === 'user_login'
            ? `user_${credentials.email}`
            : `client_${credentials.clientKey}`;
        
        let accessToken;
        
        if (credentials.otp) {
            accessToken = credentials.otp;
        } else {
            accessToken = await FlexPlatform.getAccessToken(this, credentials);
        }        

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const resource = this.getNodeParameter('resource', itemIndex) as string;
                const operation = this.getNodeParameter('operation', itemIndex) as string;

                let requestOptions: any = {
                    json: true,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    qsStringifyOptions: {
                        arrayFormat: 'brackets',
                    },
                };

                // ==================================================
                // 1. CUSTOM CALL
                // ==================================================
                if (resource === 'custom') {
                    const endpoint = this.getNodeParameter('endpoint', itemIndex) as string;
                    requestOptions.uri = `${baseUrl}${endpoint}`;

                    if (operation === 'get') requestOptions.method = 'GET';
                    else if (operation === 'post') {
                        requestOptions.method = 'POST';
                        requestOptions.body = this.getNodeParameter('jsonBody', itemIndex, {}) as JsonObject;
                    }
                }

                // ==================================================
                // 2. CRUD LOGIC (Generic for all modules)
                // ==================================================
                else {
                    const model = this.getNodeParameter('model', itemIndex) as string;
                    const modelName = resource === 'xplanner' ? 'schedules' : resource;
                    const baseEndpoint = `${baseUrl}/api/${modelName}/${model}`;

                    // --- GET ALL (Index) ---
                    if (operation === 'getAll') {
                        requestOptions.method = 'GET';
                        requestOptions.uri = baseEndpoint;
                        requestOptions.qs = {};

                        const options = this.getNodeParameter('options', itemIndex, {}) as any;
                        if (options.limit) requestOptions.qs.limit = options.limit;
                        if (options.page) requestOptions.qs.page = options.page;

                        if (options.customJson) {
                            try {
                                const jsonFilters = typeof options.customJson === 'string'
                                    ? JSON.parse(options.customJson)
                                    : options.customJson;
                                Object.assign(requestOptions.qs, jsonFilters);
                            } catch (e) {
                                throw new NodeOperationError(this.getNode(), 'Error in "Custom Filter JSON" (getAll).', { itemIndex });
                            }
                        }

                        const customFilters = this.getNodeParameter('customFilters', itemIndex, {}) as any;
                        if (customFilters.filter) {
                            for (const filter of customFilters.filter) {
                                requestOptions.qs[filter.name] = filter.value;
                            }
                        }
                    }

                    // --- GET (Show) ---
                    else if (operation === 'get') {
                        const id = this.getNodeParameter('id', itemIndex) as string;
                        requestOptions.method = 'GET';
                        requestOptions.uri = `${baseEndpoint}/${id}`;
                        requestOptions.qs = {};

                        const options = this.getNodeParameter('options', itemIndex, {}) as any;
                        if (options.customJson) {
                            try {
                                const jsonFilters = typeof options.customJson === 'string'
                                    ? JSON.parse(options.customJson)
                                    : options.customJson;
                                Object.assign(requestOptions.qs, jsonFilters);
                            } catch (e) {
                                throw new NodeOperationError(this.getNode(), 'Error in "Custom Filter JSON" (get).', { itemIndex });
                            }
                        }

                        const customFilters = this.getNodeParameter('customFilters', itemIndex, {}) as any;
                        if (customFilters.filter) {
                            for (const filter of customFilters.filter) {
                                requestOptions.qs[filter.name] = filter.value;
                            }
                        }
                    }

                    // --- CREATE (Store) ---
                    else if (operation === 'create') {
                        requestOptions.method = 'POST';
                        requestOptions.uri = baseEndpoint;

                        const jsonParameters = this.getNodeParameter('jsonParameters', itemIndex, false) as boolean;

                        if (jsonParameters) {
                            const bodyJson = this.getNodeParameter('bodyJson', itemIndex, '{}') as string;
                            if (typeof bodyJson === 'string') {
                                try {
                                    requestOptions.body = JSON.parse(bodyJson);
                                } catch (e) {
                                    throw new NodeOperationError(this.getNode(), 'Error in "Body JSON": Invalid JSON.', { itemIndex });
                                }
                            } else {
                                requestOptions.body = bodyJson;
                            }
                        } else {
                            const inputFields = this.getNodeParameter('inputFields', itemIndex, {}) as any;
                            const body: any = {};
                            if (inputFields.values) {
                                for (const field of inputFields.values) {
                                    body[field.name] = field.value;
                                }
                            }
                            requestOptions.body = body;
                        }
                    }

                    // --- UPDATE (Patch) ---
                    else if (operation === 'update') {
                        const id = this.getNodeParameter('id', itemIndex) as string;
                        requestOptions.method = 'PATCH';
                        requestOptions.uri = `${baseEndpoint}/${id}`;

                        const jsonParameters = this.getNodeParameter('jsonParameters', itemIndex, false) as boolean;

                        if (jsonParameters) {
                            const bodyJson = this.getNodeParameter('bodyJson', itemIndex, '{}') as string;
                            if (typeof bodyJson === 'string') {
                                try {
                                    requestOptions.body = JSON.parse(bodyJson);
                                } catch (e) {
                                    throw new NodeOperationError(this.getNode(), 'Error in "Body JSON": Invalid JSON.', { itemIndex });
                                }
                            } else {
                                requestOptions.body = bodyJson;
                            }
                        } else {
                            const inputFields = this.getNodeParameter('inputFields', itemIndex, {}) as any;
                            const body: any = {};
                            if (inputFields.values) {
                                for (const field of inputFields.values) {
                                    body[field.name] = field.value;
                                }
                            }
                            requestOptions.body = body;
                        }
                    }

                    // --- DELETE (Destroy) ---
                    else if (operation === 'delete') {
                        const id = this.getNodeParameter('id', itemIndex) as string;
                        requestOptions.method = 'DELETE';
                        requestOptions.uri = `${baseEndpoint}/${id}`;
                    }
                }

                let response;

                try {
                    // Try to execute the request
                    response = await this.helpers.request(requestOptions);
                } catch (apiError: any) {
                    // Clear the cache unconditionally if ANY error occurs, as requested
                    if (!credentials.otp) {
                        FlexPlatform.tokenCache.delete(cacheKey);
                    }

                    const statusCode = apiError?.httpCode || apiError?.response?.status || apiError?.statusCode;

                    // If it's a 401 or 403, we should fetch a new token and retry once
                    if (!credentials.otp && (statusCode === 401 || statusCode === 403)) {
                        // Request a fresh token
                        accessToken = await FlexPlatform.getAccessToken(this, credentials);
                        
                        // Update the headers with the new token
                        requestOptions.headers['Authorization'] = `Bearer ${accessToken}`;
                        
                        // Retry the request once
                        response = await this.helpers.request(requestOptions);
                    } else {
                        // For other errors (like 400 Bad Request, 500 Server Error)
                        // we throw the error so n8n can handle it, preventing infinite retries.
                        throw apiError;
                    }
                }

                returnData.push({
                    json: response,
                    pairedItem: { item: itemIndex },
                });

            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error, {
                    itemIndex,
                });
            }
        }

        return [returnData];
    }
}