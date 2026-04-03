import { INodeProperties } from 'n8n-workflow';

export const customApiOperations: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['custom'],
            },
        },
        options: [
            { name: 'GET', value: 'get' },
            { name: 'POST', value: 'post' },
        ],
        default: 'get',
    },
];

export const customApiFields: INodeProperties[] = [
    {
        displayName: 'API Endpoint',
        name: 'endpoint',
        type: 'string',
        default: '',
        placeholder: '/api/employees/employees',
        displayOptions: {
            show: { resource: ['custom'] },
        },
        required: true,
    },
    {
        displayName: 'JSON Body',
        name: 'jsonBody',
        type: 'json',
        default: '{}',
        displayOptions: {
            show: { resource: ['custom'], operation: ['post'] },
        },
    },
];