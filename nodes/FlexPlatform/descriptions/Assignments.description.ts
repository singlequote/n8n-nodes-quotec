import { INodeProperties } from 'n8n-workflow';

export const assignmentsOperations: INodeProperties[] = [
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
                resource: ['assignments'],
            },
        },
        options: [
            { name: 'Branch', value: 'branches' },
            { name: 'Cao', value: 'caos' },
            { name: 'Expense', value: 'expenses' },
            { name: 'Expense Type', value: 'expense-types' },
            { name: 'Holiday Unraveling', value: 'holiday-unravelings' },
            { name: 'Job Position', value: 'job-positions' },
            { name: 'Mediation Fee', value: 'mediation-fees' },
            { name: 'Payment Insurance', value: 'payment-insurances' },
            { name: 'Payment Term', value: 'payment-terms' },
            { name: 'Placement', value: 'placements' },
            { name: 'Placement Rate', value: 'placement-rates' },
            { name: 'Rate Bundle', value: 'rate-bundles' },
            { name: 'Rate Line', value: 'rate-lines' },
            { name: 'Rate Marge', value: 'rate-marges' },
            { name: 'Rate Type', value: 'rate-types' },
            { name: 'Status', value: 'statuses' },
            { name: 'Timesheet', value: 'timesheets' },
            { name: 'Timesheet Hour', value: 'timesheet-hours' },
            { name: 'Unraveling', value: 'unravelings' },
            { name: 'Unraveling Over Rule', value: 'unraveling-over-rules' },
            { name: 'Unraveling Rate Line', value: 'unraveling-rate-lines' },
        ],
        default: 'placements',
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
                resource: ['assignments'],
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

export const assignmentsFields: INodeProperties[] = [
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
                resource: ['assignments'],
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
                resource: ['assignments'],
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
                resource: ['assignments'],
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
                        description: 'Veldnaam (bijv. name, type, status)',
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
                resource: ['assignments'],
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
                resource: ['assignments'],
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
                resource: ['assignments'],
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