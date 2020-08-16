import {
	INodeProperties,
} from 'n8n-workflow';

export const draftOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new email draft',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a draft',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all drafts',
			}
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const draftFields = [
	{
		displayName: 'Draft ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'delete',
					'get',
				]
			},
		},
		placeholder: 'r-3254521568507167962',
		description: 'The ID of the draft to operate on.',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				]
			},
		},
		placeholder: 'Hello World!',
		description: 'The message subject.',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				]
			},
		},
		placeholder: 'Hello World!',
		description: 'The message body. This can be in HTML.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				]
			},
		},
		default: {},
		options: [
			{
				displayName: 'To Email',
				name: 'toList',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add To Email',
				},
				placeholder: 'info@example.com',
				description: 'The email addresses of the recipients.',
			},
			{
				displayName: 'CC Email',
				name: 'ccList',
				type: 'string',
				description: 'The email addresses of the copy recipients.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add CC Email',
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'BCC Email',
				name: 'bccList',
				type: 'string',
				description: 'The email addresses of the blind copy recipients.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add BCC Email',
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				placeholder: 'Add Attachments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachmentsBinary',
						displayName: 'Attachments Binary',
						values: [
							{
								displayName: 'Property',
								name: 'property',
								type: 'string',
								default: '',
								description: 'Name of the binary property containing the data to be added to the email as an attachment',
							},
						],
					},
				],
				default: '',
				description: 'Array of supported attachments to add to the message.',
			},
		],
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'Full',
				value: 'full',
				description: 'Returns the full email message data with body content parsed in the payload field',
			},
			{
				name: 'Metadata',
				value: 'metadata',
				description: 'Returns only email message ID, labels, and email headers.',
			},
			{
				name: 'Minimal',
				value: 'minimal',
				description: 'Returns only email message ID and labels; does not return the email headers, body, or payload',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used.'
			},
		],
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'draft',
				],
			},
		},
		default: 'full',
		description: 'The format to return the message in',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 draft:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
			},
		},
		default: true,
		description: 'By default the response only contain the IDs. If this option gets activated it<br />will resolve the data automatically.',
	},
	{
		displayName: 'Resolve Format',
		name: 'resolveFormat',
		type: 'options',
		options: [
			{
				name: 'Full',
				value: 'full',
				description: 'Returns the full email message data with body content parsed in the payload field',
			},
			{
				name: 'Metadata',
				value: 'metadata',
				description: 'Returns only email message ID, labels, and email headers.',
			},
			{
				name: 'Minimal',
				value: 'minimal',
				description: 'Returns only email message ID and labels; does not return the email headers, body, or payload',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used.'
			},
		],
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
				resolveData: [
					true,
				],
			},
		},
		default: 'full',
		description: 'The format use to return the message',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
			},
		},
		options: [
			{
				displayName: 'Include Spam Trash',
				name: 'includeSpamTrash',
				type: 'boolean',
				default: false,
				description: 'Include messages from SPAM and TRASH in the results.',
			},

		],
	},
] as INodeProperties[];
