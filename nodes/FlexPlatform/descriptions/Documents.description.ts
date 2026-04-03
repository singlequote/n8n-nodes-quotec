import { INodeProperties } from 'n8n-workflow';

export const documentsOperations: INodeProperties[] = [
    // ----------------------------------
    // MODEL SELECTOR
    // ----------------------------------
    {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['documents'],
            },
        },
        options: [
            { name: 'Document', value: 'documents' },
            { name: 'Document Type', value: 'document-types' },
        ],
        default: 'documents',
        description: 'Selecteer het type object',
    },

    // ----------------------------------
    // OPERATIONS
    // ----------------------------------
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['documents'],
            },
        },
        options: [
            {
                name: 'Get All (Index)',
                value: 'getAll',
                description: 'Haal een lijst op met filters',
            },
            {
                name: 'Get (Show)',
                value: 'get',
                description: 'Haal één item op via ID',
            },
            {
                name: 'Create (Post)',
                value: 'create',
                description: 'Maak een nieuw item aan',
            },
            {
                name: 'Update (Patch)',
                value: 'update',
                description: 'Wijzig een bestaand item',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Verwijder een item',
            },
        ],
        default: 'getAll',
    },
];

export const documentsFields: INodeProperties[] = [
    // ----------------------------------
    // ID VELD
    // ----------------------------------
    {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: ['documents'],
                operation: ['get', 'update', 'delete'],
            },
        },
        description: 'Het ID van het item',
    },

    // ----------------------------------
    // JSON PARAMETERS TOGGLE
    // ----------------------------------
    {
        displayName: 'JSON Parameters',
        name: 'jsonParameters',
        type: 'boolean',
        default: false,
        description: 'Schakel dit in om een ruwe JSON body te sturen',
        displayOptions: {
            show: {
                resource: ['documents'],
                operation: ['create', 'update'],
            },
        },
    },

    // ----------------------------------
    // DYNAMISCHE BODY (Name/Value)
    // ----------------------------------
    {
        displayName: 'Input Fields',
        name: 'inputFields',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                resource: ['documents'],
                operation: ['create', 'update'],
                jsonParameters: [false],
            },
        },
        options: [
            {
                displayName: 'Field',
                name: 'values',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: '',
                        description: 'Veldnaam (bijv. title, file_url, document_type_id)',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        description: 'De waarde',
                    },
                ],
            },
        ],
    },

    // ----------------------------------
    // RAW JSON BODY
    // ----------------------------------
    {
        displayName: 'Body JSON',
        name: 'bodyJson',
        type: 'json',
        default: '{}',
        description: 'Voer hier de volledige body in JSON formaat in',
        displayOptions: {
            show: {
                resource: ['documents'],
                operation: ['create', 'update'],
                jsonParameters: [true],
            },
        },
    },

    // ----------------------------------
    // OPTIONS (Limit, Page, JSON)
    // ----------------------------------
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
            show: {
                resource: ['documents'],
                operation: ['getAll', 'get'],
            },
        },
        options: [
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 50,
                description: 'Max aantal resultaten',
                displayOptions: {
                    show: {
                        '/operation': ['getAll'],
                    },
                },
            },
            {
                displayName: 'Page',
                name: 'page',
                type: 'number',
                default: 1,
                description: 'Pagina nummer',
                displayOptions: {
                    show: {
                        '/operation': ['getAll'],
                    },
                },
            },
            {
                displayName: 'Custom Filter JSON',
                name: 'customJson',
                type: 'json',
                default: '{}',
                description: 'Voeg ruwe JSON filters toe',
            },
        ],
    },

    // ----------------------------------
    // CUSTOM FILTERS
    // ----------------------------------
    {
        displayName: 'Custom Filters',
        name: 'customFilters',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        placeholder: 'Add Filter',
        default: {},
        displayOptions: {
            show: {
                resource: ['documents'],
                operation: ['getAll', 'get'],
            },
        },
        options: [
            {
                displayName: 'Filter',
                name: 'filter',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: '',
                        description: 'Naam van de filter (bijv. filter[status])',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        description: 'Waarde van de filter',
                    },
                ],
            },
        ],
    },
];