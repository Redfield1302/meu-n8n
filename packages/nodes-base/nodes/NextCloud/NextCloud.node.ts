import { URLSearchParams } from 'url';
import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { parseString } from 'xml2js';

import { wrapData } from '../../utils/utilities';
import { nextCloudApiRequest } from './GenericFunctions';

export class NextCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nextcloud',
		name: 'nextCloud',
		icon: 'file:nextcloud.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Nextcloud',
		defaults: {
			name: 'Nextcloud',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'nextCloudApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'nextCloudOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Deck',
						value: 'deck',
					},
					{
						name: 'Notes',
						value: 'notes',
					},
					{
						name: 'Tables',
						value: 'tables',
					},
					{
						name: 'Talk',
						value: 'talk',
					},
				],
				default: 'file',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			// Existing File Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a file',
						action: 'Copy a file',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file',
						action: 'Delete a file',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
						action: 'Download a file',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a file',
						action: 'Move a file',
					},
					{
						name: 'Share',
						value: 'share',
						description: 'Share a file',
						action: 'Share a file',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
						action: 'Upload a file',
					},
				],
				default: 'upload',
			},
			// Existing Folder Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['folder'],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a folder',
						action: 'Copy a folder',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a folder',
						action: 'Create a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a folder',
						action: 'Delete a folder',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Return the contents of a given folder',
						action: 'List a folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a folder',
						action: 'Move a folder',
					},
					{
						name: 'Share',
						value: 'share',
						description: 'Share a folder',
						action: 'Share a folder',
					},
				],
				default: 'create',
			},
			// Existing User Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Invite a user to a NextCloud organization',
						action: 'Create a user',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a user',
						action: 'Delete a user',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve information about a single user',
						action: 'Get a user',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Retrieve a list of users',
						action: 'Get many users',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Edit attributes related to a user',
						action: 'Update a user',
					},
				],
				default: 'create',
			},
			// Deck Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['deck'],
					},
				},
				options: [
					{
						name: 'Create Board',
						value: 'createBoard',
						description: 'Create a new Deck board',
					},
					{
						name: 'Get Boards',
						value: 'getBoards',
						description: 'Retrieve all Deck boards',
					},
					{
						name: 'Update Board',
						value: 'updateBoard',
						description: 'Update an existing Deck board',
					},
					{
						name: 'Delete Board',
						value: 'deleteBoard',
						description: 'Delete a Deck board',
					},
				],
				default: 'getBoards',
				description: 'The operation to perform.',
			},
			// Deck Fields
			{
				displayName: 'Board ID',
				name: 'boardId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['deck'],
						operation: ['updateBoard', 'deleteBoard'],
					},
				},
				placeholder: '12345',
				description: 'The ID of the Deck board',
			},
			{
				displayName: 'Board Name',
				name: 'boardName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['deck'],
						operation: ['createBoard', 'updateBoard'],
					},
				},
				placeholder: 'Project Management',
				description: 'Name of the Deck board',
			},
			// Notes Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['notes'],
					},
				},
				options: [
					{
						name: 'Create Note',
						value: 'createNote',
						description: 'Create a new Note',
					},
					{
						name: 'Get Notes',
						value: 'getNotes',
						description: 'Retrieve all Notes',
					},
					{
						name: 'Update Note',
						value: 'updateNote',
						description: 'Update an existing Note',
					},
					{
						name: 'Delete Note',
						value: 'deleteNote',
						description: 'Delete a Note',
					},
				],
				default: 'getNotes',
				description: 'The operation to perform.',
			},
			// Notes Fields
			{
				displayName: 'Note ID',
				name: 'noteId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['notes'],
						operation: ['updateNote', 'deleteNote'],
					},
				},
				placeholder: '67890',
				description: 'The ID of the Note',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['notes'],
						operation: ['createNote', 'updateNote'],
					},
				},
				placeholder: 'Meeting notes...',
				description: 'Content of the Note',
			},
			// Tables Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['tables'],
					},
				},
				options: [
					{
						name: 'Create Table',
						value: 'createTable',
						description: 'Create a new Table',
					},
					{
						name: 'Get Tables',
						value: 'getTables',
						description: 'Retrieve all Tables',
					},
					{
						name: 'Update Table',
						value: 'updateTable',
						description: 'Update an existing Table',
					},
					{
						name: 'Delete Table',
						value: 'deleteTable',
						description: 'Delete a Table',
					},
				],
				default: 'getTables',
				description: 'The operation to perform.',
			},
			// Tables Fields
			{
				displayName: 'Table ID',
				name: 'tableId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['tables'],
						operation: ['updateTable', 'deleteTable'],
					},
				},
				placeholder: 'ABCDE',
				description: 'The ID of the Table',
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['tables'],
						operation: ['createTable', 'updateTable'],
					},
				},
				placeholder: 'Project Tasks',
				description: 'Name of the Table',
			},
			// Talk Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['talk'],
					},
				},
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send a message in a conversation',
					},
					{
						name: 'Get Conversations',
						value: 'getConversations',
						description: 'Retrieve all Conversations',
					},
					{
						name: 'Create Conversation',
						value: 'createConversation',
						description: 'Create a new Conversation',
					},
					{
						name: 'Delete Conversation',
						value: 'deleteConversation',
						description: 'Delete a Conversation',
					},
				],
				default: 'getConversations',
				description: 'The operation to perform.',
			},
			// Talk Fields
			{
				displayName: 'Conversation ID',
				name: 'conversationId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['talk'],
						operation: ['sendMessage', 'deleteConversation'],
					},
				},
				placeholder: 'FGHIJ',
				description: 'The ID of the Conversation',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['talk'],
						operation: ['sendMessage'],
					},
				},
				placeholder: 'Hello team!',
				description: 'Message to send',
			},
			{
				displayName: 'Conversation Name',
				name: 'conversationName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['talk'],
						operation: ['createConversation'],
					},
				},
				placeholder: 'Team Chat',
				description: 'Name of the Conversation',
			},

			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file/folder:copy
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/original.txt',
				description: 'The path of file or folder to copy. The path should start with "/".',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder. The path should start with "/".',
			},

			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'Delete Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The path to delete. Can be a single file or a whole folder. The path should start with "/".',
			},

			// ----------------------------------
			//         file/folder:move
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/old_name.txt',
				description: 'The path of file or folder to move. The path should start with "/".',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder. The path should start with "/".',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The file path of the file to download. Has to contain the full path. The path should start with "/".',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				hint: 'The name of the output binary field to put the file in',
			},

			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The absolute file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.',
			},
			{
				displayName: 'Binary File',
				name: 'binaryDataUpload',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						binaryDataUpload: [false],
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '',
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						binaryDataUpload: [true],
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '',
				hint: 'The name of the input binary field containing the file to be uploaded',
			},

			// ----------------------------------
			//         file:share
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['share'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The file path of the file to share. Has to contain the full path. The path should start with "/".',
			},
			{
				displayName: 'Share Type',
				name: 'shareType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['share'],
						resource: ['file', 'folder'],
					},
				},
				options: [
					{
						name: 'Circle',
						value: 7,
					},
					{
						name: 'Email',
						value: 4,
					},
					{
						name: 'Group',
						value: 1,
					},
					{
						name: 'Public Link',
						value: 3,
					},
					{
						name: 'User',
						value: 0,
					},
				],
				default: 0,
				description: 'The share permissions to set',
			},
			{
				displayName: 'Circle ID',
				name: 'circleId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [7],
					},
				},
				default: '',
				description: 'The ID of the circle to share with',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [4],
					},
				},
				default: '',
				description: 'The Email address to share with',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [1],
					},
				},
				default: '',
				description: 'The ID of the group to share with',
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [0],
					},
				},
				default: '',
				description: 'The user to share with',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
					},
				},
				options: [
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: { password: true },
						displayOptions: {
							show: {
								'/resource': ['file', 'folder'],
								'/operation': ['share'],
								'/shareType': [3],
							},
						},
						default: '',
						description: 'Optional password for public link',
					},
					{
						displayName: 'Permissions',
						name: 'permissions',
						type: 'options',
						options: [
							{
								name: 'All',
								value: 31,
							},
							{
								name: 'Create',
								value: 4,
							},
							{
								name: 'Delete',
								value: 8,
							},
							{
								name: 'Read',
								value: 1,
							},
							{
								name: 'Update',
								value: 2,
							},
						],
						default: 1,
						description: 'The share permissions to set',
					},
				],
			},

			// ----------------------------------
			//         folder
			// ----------------------------------

			// ----------------------------------
			//         folder:create
			// ----------------------------------
			{
				displayName: 'Folder',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['folder'],
					},
				},
				placeholder: '/invoices/2019',
				description:
					'The folder to create. The parent folder has to exist. The path should start with "/".',
			},

			// ----------------------------------
			//         folder:list
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['folder'],
					},
				},
				placeholder: '/invoices/2019/',
				description: 'The path of which to list the content. The path should start with "/".',
			},

			// ----------------------------------
			//         user
			// ----------------------------------

			// ----------------------------------
			//         user:create
			// ----------------------------------
			{
				displayName: 'Username',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['create'],
					},
				},
				placeholder: 'john',
				description: 'Username the user will have',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['create'],
					},
				},
				placeholder: 'john@email.com',
				description: 'The email of the user to invite',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Display Name',
						name: 'displayName',
						type: 'string',
						default: '',
						description: 'The display name of the user to invite',
					},
				],
			},
			// ----------------------------------
			//         user:get/delete/update
			// ----------------------------------
			{
				displayName: 'Username',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['delete', 'get', 'update'],
					},
				},
				placeholder: 'john',
				description: 'Username the user will have',
			},
			// ----------------------------------
			//         user:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description: 'Optional search string',
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: '',
						description: 'Optional offset value',
					},
				],
			},
			// ----------------------------------
			//         user:update
			// ----------------------------------
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Fields',
						name: 'field',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'options',
								default: 'email',
								options: [
									{
										name: 'Address',
										value: 'address',
										description: 'The new address for the user',
									},
									{
										name: 'Display Name',
										value: 'displayname',
										description: 'The new display name for the user',
									},
									{
										name: 'Email',
										value: 'email',
										description: 'The new email for the user',
									},
									{
										name: 'Password',
										value: 'password',
										description: 'The new password for the user',
									},
									{
										name: 'Twitter',
										value: 'twitter',
										description: 'The new twitter handle for the user',
									},
									{
										name: 'Website',
										value: 'website',
										description: 'The new website for the user',
									},
								],
								description: 'Key of the updated attribute',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the updated attribute',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData().slice();
		const returnData: INodeExecutionData[] = [];

		const authenticationMethod = this.getNodeParameter('authentication', 0);
		let credentials;

		if (authenticationMethod === 'accessToken') {
			credentials = await this.getCredentials('nextCloudApi');
		} else {
			credentials = await this.getCredentials('nextCloudOAuth2Api');
		}

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let endpoint = '';
		let requestMethod: IHttpRequestMethods = 'GET';
		let responseData: any;

		let body: string | Buffer | IDataObject = '';
		const headers: IDataObject = {};
		let qs;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'file') {
					if (operation === 'download') {
						// ----------------------------------
						//         download
						// ----------------------------------

						requestMethod = 'GET';
						endpoint = this.getNodeParameter('path', i) as string;
					} else if (operation === 'upload') {
						// ----------------------------------
						//         upload
						// ----------------------------------

						requestMethod = 'PUT';
						endpoint = this.getNodeParameter('path', i) as string;

						if (this.getNodeParameter('binaryDataUpload', i) === true) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							this.helpers.assertBinaryData(i, binaryPropertyName);
							body = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						} else {
							// Is text file
							body = this.getNodeParameter('fileContent', i) as string;
						}
					}
				} else if (resource === 'folder') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'MKCOL' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
					} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						requestMethod = 'PROPFIND' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
					}
				}

				if (['file', 'folder'].includes(resource)) {
					if (operation === 'copy') {
						// ----------------------------------
						//         copy
						// ----------------------------------

						requestMethod = 'COPY' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
						const toPath = this.getNodeParameter('toPath', i) as string;
						headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						endpoint = this.getNodeParameter('path', i) as string;
					} else if (operation === 'move') {
						// ----------------------------------
						//         move
						// ----------------------------------

						requestMethod = 'MOVE' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
						const toPath = this.getNodeParameter('toPath', i) as string;
						headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;
					} else if (operation === 'share') {
						// ----------------------------------
						//         share
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = 'ocs/v2.php/apps/files_sharing/api/v1/shares';

						headers['OCS-APIRequest'] = 'true';
						headers['Content-Type'] = 'application/x-www-form-urlencoded';

						const bodyParameters = this.getNodeParameter('options', i) as IDataObject;

						bodyParameters.path = this.getNodeParameter('path', i) as string;
						bodyParameters.shareType = this.getNodeParameter('shareType', i) as number;

						if (bodyParameters.shareType === 0) {
							bodyParameters.shareWith = this.getNodeParameter('user', i) as string;
						} else if (bodyParameters.shareType === 7) {
							bodyParameters.shareWith = this.getNodeParameter('circleId', i) as string;
						} else if (bodyParameters.shareType === 4) {
							bodyParameters.shareWith = this.getNodeParameter('email', i) as string;
						} else if (bodyParameters.shareType === 1) {
							bodyParameters.shareWith = this.getNodeParameter('groupId', i) as string;
						}

						body = new URLSearchParams(bodyParameters as any).toString();
					}
				} else if (resource === 'user') {
					if (operation === 'create') {
						// ----------------------------------
						//         user:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = 'ocs/v1.php/cloud/users';

						headers['OCS-APIRequest'] = 'true';
						headers['Content-Type'] = 'application/x-www-form-urlencoded';

						const userid = this.getNodeParameter('userId', i) as string;
						const email = this.getNodeParameter('email', i) as string;

						body = `userid=${encodeURIComponent(userid)}&email=${encodeURIComponent(email)}`;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.displayName) {
							body += `&displayName=${encodeURIComponent(additionalFields.displayName as string)}`;
						}
					}
					if (operation === 'delete') {
						// ----------------------------------
						//         user:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const userid = this.getNodeParameter('userId', i) as string;
						endpoint = `ocs/v1.php/cloud/users/${encodeURIComponent(userid)}`;

						headers['OCS-APIRequest'] = 'true';
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
					if (operation === 'get') {
						// ----------------------------------
						//         user:get
						// ----------------------------------

						requestMethod = 'GET';

						const userid = this.getNodeParameter('userId', i) as string;
						endpoint = `ocs/v1.php/cloud/users/${encodeURIComponent(userid)}`;

						headers['OCS-APIRequest'] = 'true';
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
					if (operation === 'getAll') {
						// ----------------------------------
						//         user:getAll
						// ----------------------------------

						requestMethod = 'GET';
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}
						endpoint = 'ocs/v1.php/cloud/users';

						headers['OCS-APIRequest'] = 'true';
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
					if (operation === 'update') {
						// ----------------------------------
						//         user:update
						// ----------------------------------

						requestMethod = 'PUT';

						const userid = this.getNodeParameter('userId', i) as string;
						endpoint = `ocs/v1.php/cloud/users/${encodeURIComponent(userid)}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const updateParams = (updateFields.field as IDataObject);

						body = Object.entries(updateParams)
							.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
							.join('&');

						headers['OCS-APIRequest'] = 'true';
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
				} else if (resource === 'deck') {
					switch (operation) {
						case 'createBoard': {
							const boardName = this.getNodeParameter('boardName', i) as string;
							const deckBody = { name: boardName };
							const deckHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'POST',
								'ocs/v2.php/apps/deck/api/v1.0/boards',
								JSON.stringify(deckBody),
								deckHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'getBoards': {
							const deckHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'GET',
								'ocs/v2.php/apps/deck/api/v1.0/boards',
								'',
								deckHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'updateBoard': {
							const boardId = this.getNodeParameter('boardId', i) as string;
							const boardName = this.getNodeParameter('boardName', i) as string;
							const deckBody = { name: boardName };
							const deckHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'PUT',
								`ocs/v2.php/apps/deck/api/v1.0/boards/${encodeURIComponent(boardId)}`,
								JSON.stringify(deckBody),
								deckHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'deleteBoard': {
							const boardId = this.getNodeParameter('boardId', i) as string;
							const deckHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'DELETE',
								`ocs/v2.php/apps/deck/api/v1.0/boards/${encodeURIComponent(boardId)}`,
								'',
								deckHeaders,
							);
							returnData.push({ json: { success: responseData === '' } });
							break;
						}
						default:
							throw new NodeOperationError(this.getNode(), `Operation "${operation}" not implemented for resource "deck"`);
					}
				} else if (resource === 'notes') {
					switch (operation) {
						case 'createNote': {
							const content = this.getNodeParameter('content', i) as string;
							const notesBody = { content };
							const notesHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'POST',
								'ocs/v1.php/apps/notes/api/v1/notes',
								JSON.stringify(notesBody),
								notesHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'getNotes': {
							const notesHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'GET',
								'ocs/v1.php/apps/notes/api/v1/notes',
								'',
								notesHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'updateNote': {
							const noteId = this.getNodeParameter('noteId', i) as string;
							const content = this.getNodeParameter('content', i) as string;
							const notesBody = { content };
							const notesHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'PUT',
								`ocs/v1.php/apps/notes/api/v1/notes/${encodeURIComponent(noteId)}`,
								JSON.stringify(notesBody),
								notesHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'deleteNote': {
							const noteId = this.getNodeParameter('noteId', i) as string;
							const notesHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'DELETE',
								`ocs/v1.php/apps/notes/api/v1/notes/${encodeURIComponent(noteId)}`,
								'',
								notesHeaders,
							);
							returnData.push({ json: { success: responseData === '' } });
							break;
						}
						default:
							throw new NodeOperationError(this.getNode(), `Operation "${operation}" not implemented for resource "notes"`);
					}
				} else if (resource === 'tables') {
					switch (operation) {
						case 'createTable': {
							const tableName = this.getNodeParameter('tableName', i) as string;
							const tablesBody = { name: tableName };
							const tablesHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'POST',
								'ocs/v1.php/apps/tables/api/v1/tables',
								JSON.stringify(tablesBody),
								tablesHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'getTables': {
							const tablesHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'GET',
								'ocs/v1.php/apps/tables/api/v1/tables',
								'',
								tablesHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'updateTable': {
							const tableId = this.getNodeParameter('tableId', i) as string;
							const tableName = this.getNodeParameter('tableName', i) as string;
							const tablesBody = { name: tableName };
							const tablesHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'PUT',
								`ocs/v1.php/apps/tables/api/v1/tables/${encodeURIComponent(tableId)}`,
								JSON.stringify(tablesBody),
								tablesHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'deleteTable': {
							const tableId = this.getNodeParameter('tableId', i) as string;
							const tablesHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'DELETE',
								`ocs/v1.php/apps/tables/api/v1/tables/${encodeURIComponent(tableId)}`,
								'',
								tablesHeaders,
							);
							returnData.push({ json: { success: responseData === '' } });
							break;
						}
						default:
							throw new NodeOperationError(this.getNode(), `Operation "${operation}" not implemented for resource "tables"`);
					}
				} else if (resource === 'talk') {
					switch (operation) {
						case 'sendMessage': {
							const conversationId = this.getNodeParameter('conversationId', i) as string;
							const message = this.getNodeParameter('message', i) as string;
							const talkBody = { message };
							const talkHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'POST',
								`ocs/v1.php/apps/talk/api/v1/messages/${encodeURIComponent(conversationId)}`,
								JSON.stringify(talkBody),
								talkHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'getConversations': {
							const talkHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'GET',
								'ocs/v1.php/apps/talk/api/v1/conversations',
								'',
								talkHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'createConversation': {
							const conversationName = this.getNodeParameter('conversationName', i) as string;
							const talkBody = { name: conversationName };
							const talkHeaders = {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'POST',
								'ocs/v1.php/apps/talk/api/v1/conversations',
								JSON.stringify(talkBody),
								talkHeaders,
							);
							returnData.push(JSON.parse(responseData));
							break;
						}
						case 'deleteConversation': {
							const conversationId = this.getNodeParameter('conversationId', i) as string;
							const talkHeaders = {
								'OCS-APIRequest': 'true',
							};
							responseData = await nextCloudApiRequest.call(
								this,
								'DELETE',
								`ocs/v1.php/apps/talk/api/v1/conversations/${encodeURIComponent(conversationId)}`,
								'',
								talkHeaders,
							);
							returnData.push({ json: { success: responseData === '' } });
							break;
						}
						default:
							throw new NodeOperationError(this.getNode(), `Operation "${operation}" not implemented for resource "talk"`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				// Make sure that the webdav URL does never have a trailing slash because
				// one gets added always automatically
				let webDavUrl = credentials.webDavUrl as string;
				if (webDavUrl.slice(-1) === '/') {
					webDavUrl = webDavUrl.slice(0, -1);
				}

				let encoding = undefined;
				if (resource === 'file' && operation === 'download') {
					encoding = null;
				}

				try {
					responseData = await nextCloudApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						headers,
						encoding,
						qs,
					);
				} catch (error) {
					if (this.continueOnFail()) {
						if (resource === 'file' && operation === 'download') {
							items[i].json = { error: error.message };
						} else {
							returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
						}
						continue;
					}

					throw error;
				}

				if (resource === 'file' && operation === 'download') {
					const newItem: INodeExecutionData = {
						json: items[i].json,
						pairedItem: { item: i },
						binary: {},
					};

					if (items[i].binary !== undefined) {

						Object.assign(newItem.binary as IBinaryKeyData, items[i].binary);
					}

					items[i] = newItem;

					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

					items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(
						responseData as Buffer,
						endpoint,
					);
				} else if (['file', 'folder'].includes(resource) && operation === 'share') {

					const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
						parseString(responseData as string, { explicitArray: false }, (err, data) => {
							if (err) {
								return reject(err);
							}

							if (data.ocs.meta.status !== 'ok') {
								return reject(
									new NodeApiError(
										this.getNode(),
										(data.ocs.meta.message as JsonObject) || (data.ocs.meta.status as JsonObject),
									),
								);
							}

							resolve(data.ocs.data as IDataObject);
						});
					});

					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(jsonResponseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				} else if (resource === 'user') {
					if (operation !== 'getAll') {

						const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
							parseString(responseData as string, { explicitArray: false }, (err, data) => {
								if (err) {
									return reject(err);
								}

								if (data.ocs.meta.status !== 'ok') {
									return reject(
										new NodeApiError(
											this.getNode(),
											(data.ocs.meta.message || data.ocs.meta.status) as JsonObject,
										),
									);
								}

								if (operation === 'delete' || operation === 'update') {
									resolve(data.ocs.meta as IDataObject);
								} else {
									resolve(data.ocs.data as IDataObject);
								}
							});
						});

						const executionData = this.helpers.constructExecutionMetaData(
							wrapData(jsonResponseData),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} else {

						const jsonResponseData: IDataObject[] = await new Promise((resolve, reject) => {
							parseString(responseData as string, { explicitArray: false }, (err, data) => {
								if (err) {
									return reject(err);
								}

								if (data.ocs.meta.status !== 'ok') {
									return reject(
										new NodeApiError(this.getNode(), data.ocs.meta.message as JsonObject),
									);
								}

								if (typeof data.ocs.data.users.element === 'string') {
									resolve([data.ocs.data.users.element] as IDataObject[]);
								} else {
									resolve(data.ocs.data.users.element as IDataObject[]);
								}
							});
						});

						jsonResponseData.forEach((value) => {
							returnData.push({ json: { id: value }, pairedItem: { item: i } });
						});
					}
				} else if (resource === 'folder' && operation === 'list') {

					const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
						parseString(responseData as string, { explicitArray: false }, (err, data) => {
							if (err) {
								return reject(err);
							}
							resolve(data as IDataObject);
						});
					});

					const propNames: { [key: string]: string } = {
						'd:getlastmodified': 'lastModified',
						'd:getcontentlength': 'contentLength',
						'd:getcontenttype': 'contentType',
					};

					if (
						jsonResponseData['d:multistatus'] !== undefined &&
						jsonResponseData['d:multistatus'] !== null &&
						(jsonResponseData['d:multistatus'] as IDataObject)['d:response'] !== undefined &&
						(jsonResponseData['d:multistatus'] as IDataObject)['d:response'] !== null
					) {
						let skippedFirst = false;
						// @ts-ignore
						if (Array.isArray(jsonResponseData['d:multistatus']['d:response'])) {
							// @ts-ignore
							for (const item of jsonResponseData['d:multistatus']['d:response']) {
								if (!skippedFirst) {
									skippedFirst = true;
									continue;
								}
								const newItem: IDataObject = {};

								newItem.path = decodeURIComponent(item['d:href']).replace(/^\//, '');

								let props: IDataObject = {};
								if (Array.isArray(item['d:propstat'])) {
									props = item['d:propstat'][0]['d:prop'] as IDataObject;
								} else {
									props = item['d:propstat']['d:prop'] as IDataObject;
								}

								for (const propName of Object.keys(propNames)) {
									if (props[propName] !== undefined) {
										newItem[propNames[propName]] = props[propName];
									}
								}

								if (props['d:resourcetype'] === '') {
									newItem.type = 'file';
								} else {
									newItem.type = 'folder';
								}
								// @ts-ignore
								newItem.eTag = props['d:getetag'].slice(1, -1);

								returnData.push({ json: newItem, pairedItem: { item: i } });
							}
						}
					}
				} else {
					const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
						itemData: { item: i },
					});

					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'file' && operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					}
					continue;
				}
				throw error;
			}
		}

		if (resource === 'file' && operation === 'download') {
			return [items];
		} else {
			return [returnData];
		}
	}
}
