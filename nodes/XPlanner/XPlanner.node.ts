import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    JsonObject,
    ILoadOptionsFunctions,
    INodePropertyOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Import the separate description files
import { customApiOperations, customApiFields } from './descriptions/CustomApi.description';
import { xplannerOperations, xplannerFields } from './descriptions/XPlanner.description';

export class XPlanner implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'XPlanner',
        name: 'xplanner',
        icon: { light: 'file:xplanner.svg', dark: 'file:xplanner.svg' },
        group: ['transform'],
        version: 1,
        description: 'Interaction with XPlanner API',
        defaults: {
            name: 'XPlanner',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'xplannerApi',
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
                        name: 'XPlanner',
                        value: 'xplanner',
                    }
                ],
                default: 'xplanner', // Changed from assignments to xplanner to match the resource options
            },

            // ----------------------------------
            // IMPORT MODULES
            // ----------------------------------

            // Custom API
            ...customApiOperations,
            ...customApiFields,

            // XPlanner operations and fields
            ...xplannerOperations,
            ...xplannerFields,
        ],
    };

    // ==========================================================
    // METHODS: For dynamic dropdowns
    // ==========================================================
    methods = {
        loadOptions: {
            // This name must exactly match the 'loadOptionsMethod' string in your description file
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const returnData: INodePropertyOptions[] = [];
                
                const credentials = await this.getCredentials('xplannerApi');
                const baseUrl = credentials.baseUrl as string;

                let accessToken;
                if (credentials.otp) {
                    accessToken = credentials.otp;
                } else {
                    // We cast `this` to `any` because getAccessToken expects IExecuteFunctions, 
                    // but ILoadOptionsFunctions also has the required `helpers.request` function.
                    accessToken = await XPlanner.getAccessToken(this as any, credentials);
                }

                const options: any = {
                    method: 'GET',
                    uri: `${baseUrl}/api/webhooks/events`,
                    json: true,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                    }
                };

                try {
                    const response = await this.helpers.request(options);
                    
                    if (response && response.data) {
                        // Use a Map to store unique models and their corresponding pluralized resource
                        const uniqueModels = new Map<string, string>();
                        
                        for (const item of response.data) {
                            if (item.model) {
                                // Use the plural 'resource' if available, otherwise fallback to 'model'
                                uniqueModels.set(item.model, item.resource || item.model);
                            }
                        }

                        // Convert Map keys to an array, sort alphabetically, and build options array
                        const sortedModels = Array.from(uniqueModels.keys()).sort();
                        for (const model of sortedModels) {
                            // Format the display name (e.g., "article attribute" -> "Article attribute")
                            const displayName = model.charAt(0).toUpperCase() + model.slice(1);
                            const resourceValue = uniqueModels.get(model) as string;
                            
                            returnData.push({
                                name: displayName,
                                value: resourceValue, // This is now the pluralized string (e.g., 'people')
                            });
                        }
                    }
                } catch (error: any) {
                    throw new Error(`Could not load models from API: ${error.message}`);
                }

                return returnData;
            },
        },
    };

    // --- TOKEN CACHE ---
    private static tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

    // --- CUSTOM HELPER ---
    private static async getAccessToken(executeFunctions: any, credentials: any): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const baseUrl = credentials.baseUrl as string;
        const authType = credentials.authType as string; // <--- Fetch authType

        // 1. Determine unique cache key
        // For User Login we use email, for Client Creds we use the key
        const cacheKey = authType === 'user_login'
            ? `user_${credentials.email}`
            : `client_${credentials.clientKey}`;

        // 2. Check cache
        const cached = XPlanner.tokenCache.get(cacheKey);
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
            XPlanner.tokenCache.set(cacheKey, {
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
        
        const credentials = await this.getCredentials('xplannerApi');
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
            accessToken = await XPlanner.getAccessToken(this, credentials);
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
                    // This now retrieves the pluralized 'resource' value from the dropdown
                    const selectedResource = this.getNodeParameter('model', itemIndex) as string;
                    
                    // Replace any spaces with dashes for the endpoint URL just in case
                    const endpointModel = selectedResource.replace(/\s+/g, '-');

                    const baseEndpoint = `${baseUrl}/api/${endpointModel}`;

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
                        XPlanner.tokenCache.delete(cacheKey);
                    }

                    const statusCode = apiError?.httpCode || apiError?.response?.status || apiError?.statusCode;

                    // If it's a 401 or 403, we should fetch a new token and retry once
                    if (!credentials.otp && (statusCode === 401 || statusCode === 403)) {
                        // Request a fresh token
                        accessToken = await XPlanner.getAccessToken(this as any, credentials);
                        
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