import {
    IHookFunctions,
    IWebhookFunctions,
    ILoadOptionsFunctions,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class SubsidieTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Subsidiemanager Trigger',
        name: 'subsidieTrigger',
        icon: { light: 'file:subsidie.svg', dark: 'file:subsidie.svg' },
        group: ['trigger'],
        version: 1,
        description: 'Start de workflow wanneer er iets gebeurt in Subsidie',
        defaults: {
            name: 'Subsidie Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'subsidieApi',
                required: true,
            },
        ],

        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'webhook',
            },
        ],
        // -------------------------------------------------------

        properties: [
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                default: '',
                description: 'Filter events op model',
                typeOptions: {
                    loadOptionsMethod: 'getModels',
                },
            },
            {
                displayName: 'Event',
                name: 'event',
                type: 'options',
                required: true,
                default: '',
                typeOptions: {
                    loadOptionsMethod: 'getEvents',
                    loadOptionsDependsOn: ['model'],
                },
                description: 'Kies het event waarop je wilt reageren',
            },
        ],
    };

    // --- AUTH HELPER ---
    private static async getAccessToken(
        context: IHookFunctions | ILoadOptionsFunctions,
        credentials: any,
    ): Promise<string> {
        const baseUrl = credentials.baseUrl as string;
        const clientKey = credentials.clientKey as string;
        const clientSecret = credentials.clientSecret as string;
        const userEmail = credentials.email as string;
        const userPassword = credentials.password as string;

        let body = {};

        if (credentials.authType === 'client_credentials') {
            body = {
                client_key: clientKey,
                client_secret: clientSecret,
            };
        }
        if (credentials.authType === 'user_login') {
            body = {
                email: userEmail,
                password: userPassword,
                device_name: 'n8n-workflow'
            };
        }

        const options = {
            method: 'POST' as const,
            uri: `${baseUrl}/api/auth/request-token`,
            body: body,
            json: true,
        };

        try {
            // @ts-ignore
            const response = await context.helpers.request(options);
            return response.token;
        } catch (error) {
            throw new Error(`Trigger kon niet inloggen: ${error.message}`);
        }
    }

    // --- METHODS VOOR DYNAMISCHE UI ---
    methods = {
        loadOptions: {
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('subsidieApi');
                const baseUrl = credentials.baseUrl as string;
                const accessToken = await SubsidieTrigger.getAccessToken(this, credentials);

                const options = {
                    method: 'GET' as const,
                    uri: `${baseUrl}/api/webhooks/events`,
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    json: true,
                };

                const response = await this.helpers.request(options);

                if (!response.data || !Array.isArray(response.data)) return [];

                const uniqueModels = new Set();
                const returnOptions: INodePropertyOptions[] = [];

                for (const event of response.data) {
                    if (event.model && !uniqueModels.has(event.model)) {
                        uniqueModels.add(event.model);
                        returnOptions.push({
                            name: event.model.charAt(0).toUpperCase() + event.model.slice(1),
                            value: event.model,
                        });
                    }
                }

                returnOptions.sort((a, b) => a.name.localeCompare(b.name));
                returnOptions.unshift({ name: '- Alle Models -', value: '' });

                return returnOptions;
            },

            async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('subsidieApi');
                const baseUrl = credentials.baseUrl as string;
                const accessToken = await SubsidieTrigger.getAccessToken(this, credentials);

                const selectedModel = this.getNodeParameter('model') as string;

                const options = {
                    method: 'GET' as const,
                    uri: `${baseUrl}/api/webhooks/events`,
                    qs: {} as any,
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    json: true,
                };

                if (selectedModel) {
                    options.qs['model'] = selectedModel;
                }
                
                const response = await this.helpers.request(options);
                                
                if (!response.data || !Array.isArray(response.data)) return [];

                return response.data.map((event: any) => ({
                    name: event.description,
                    value: event.id,
                }));
            },
        },
    };

    // --- WEBHOOK METHODS ---
    webhookMethods = {
        default: {
            async checkExists(this: IHookFunctions): Promise<boolean> {
                return false;
            },

            async create(this: IHookFunctions): Promise<boolean> {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const credentials = await this.getCredentials('subsidieApi');
                const event = this.getNodeParameter('event');
                const baseUrl = credentials.baseUrl as string;
                const accessToken = await SubsidieTrigger.getAccessToken(this, credentials);

                const options = {
                    method: 'POST' as const,
                    uri: `${baseUrl}/api/webhooks`,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                    },
                    body: {
                        end_point: webhookUrl,
                        event: event,
                        custom_fields: [],
                    },
                    json: true,
                };
                
                try {
                    const response = await this.helpers.request(options);

                    const webhookId = response.data ? response.data.id : response.id;
                    const webhookData = this.getWorkflowStaticData('node');
                    webhookData.webhookId = webhookId;

                    return true;

                } catch (error) {
                    throw error;
                }
            },

            async delete(this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData('node');

                if (webhookData.webhookId) {
                    const credentials = await this.getCredentials('subsidieApi');
                    const baseUrl = credentials.baseUrl as string;
                    const accessToken = await SubsidieTrigger.getAccessToken(this, credentials);

                    try {
                        const options = {
                            method: 'DELETE' as const,
                            uri: `${baseUrl}/api/webhooks/${webhookData.webhookId}`,
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Accept': 'application/json',
                            },
                            json: true,
                        };
                        await this.helpers.request(options);
                    } catch (error) {
                    }

                    delete webhookData.webhookId;
                }
                return true;
            }
        },
    };

    // --- PING FILTER WEBHOOK METHODE ---
    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const bodyData = this.getBodyData();

        const isEmpty = Object.keys(bodyData).length === 0;
        const isPing = isEmpty || (bodyData.event === 'ping');

        if (isPing) {
            return {
                webhookResponse: {
                    status: 200,
                    body: { message: 'Webhook verified' }
                }
            };
        }

        return {
            workflowData: [
                this.helpers.returnJsonArray(bodyData),
            ],
        };
    }
}