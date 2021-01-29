import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const userFields = [
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		description: 'Reddit ID of the user to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		required: true,
		default: 'about',
		description: 'Details of the user to retrieve.',
		options: [
			{
				name: 'About',
				value: 'about',
			},
			{
				name: 'Overview',
				value: 'overview',
			},
			{
				name: 'Submitted',
				value: 'submitted',
			},
			{
				name: 'Comments',
				value: 'comments',
			},
			{
				name: 'Gilded',
				value: 'gilded',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
				details: [
					'overview',
					'submitted',
					'comments',
					'gilded',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
				details: [
					'overview',
					'submitted',
					'comments',
					'gilded',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
