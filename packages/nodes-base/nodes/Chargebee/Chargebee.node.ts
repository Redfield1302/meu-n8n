import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
	NodeParameterValue,
} from 'n8n-workflow';


interface CustomProperty {
	name: string;
	value: string;
}

interface FilterValue {
	operation: string;
	value: NodeParameterValue;
}
interface FilterValues {
	[key: string]: FilterValue[];
}


export class Chargebee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chargebee',
		name: 'chargebee',
		icon: 'file:chargebee.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Retrieve data from Chargebee API',
		defaults: {
			name: 'Chargebee',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'chargebeeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
				],
				default: 'invoice',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         customer
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'customer',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a customer',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         customer:create
			// ----------------------------------
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'customer',
						],
					},
				},
				default: {},
				description: 'Properties to set on the new user',
				placeholder: 'Add Property',
				options: [
					{
						displayName: 'User Id',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID for the new customer. If not given, this will be auto-generated.',
					},
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
						description: 'The first name of the customer',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
						type: 'string',
						default: '',
						description: 'The last name of the customer',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'The email address of the customer',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'The phone number of the customer',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
						description: 'The company of the customer',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set',
									},
								],
							},
						],
					},

				],
			},



			// ----------------------------------
			//         invoice
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				default: 'list',
				description: 'The operation to perform.',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'invoice',
						],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'Return the invoices',
					},
					{
						name: 'PDF Invoice URL',
						value: 'pdfUrl',
						description: 'Get URL for the invoice PDF',
					},
				],
			},

			// ----------------------------------
			//         invoice:list
			// ----------------------------------
			{
				displayName: 'Max results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 10,
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						resource: [
							'invoice',
						],
					},
				},
				description: 'Max. amount of results to return(< 100).',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter',
				description: 'Filter for invoices',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						resource: [
							'invoice',
						],
					},
				},
				options: [
					{
						name: 'date',
						displayName: 'Invoice Date',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'Is',
										value: 'is',
									},
									{
										name: 'Is Not',
										value: 'is_not',
									},
									{
										name: 'After',
										value: 'after',
									},
									{
										name: 'Before',
										value: 'before',
									},

								],
								default: 'after',
								description: 'Operation to decide where the the data should be mapped to',
							},
							{
								displayName: 'Date',
								name: 'value',
								type: 'dateTime',
								default: '',
								description: 'Query date',
							},
						],
					},
					{
						name: 'total',
						displayName: 'Invoice Amount',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'Is',
										value: 'is',
									},
									{
										name: 'Is Not',
										value: 'is_not',
									},
									{
										name: 'Greater than',
										value: 'gt',
									},
									{
										name: 'Greater equal than',
										value: 'gte',
									},
									{
										name: 'Less than',
										value: 'lt',
									},
									{
										name: 'Less equal than',
										value: 'lte',
									},
								],
								default: 'gt',
								description: 'Operation to decide where the the data should be mapped to',
							},
							{
								displayName: 'Amount',
								name: 'value',
								type: 'number',
								typeOptions: {
									numberPrecision: 2,
								},
								default: 0,
								description: 'Query amount',
							},
						],
					},
				],
			},

			// ----------------------------------
			//         invoice:pdfUrl
			// ----------------------------------
			{
				displayName: 'Invoice Id',
				name: 'invoiceId',
				description: 'The ID of the invoice to get',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'pdfUrl',
						],
						resource: [
							'invoice',
						],
					},
				},
			},



			// ----------------------------------
			//         subscription
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'subscription',
						],
					},
				},
				options: [
					{
						name: 'Cancel',
						value: 'cancel',
						description: 'Cancel a subscription',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a subscription',
					},
				],
				default: 'delete',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         subscription:cancel
			// ----------------------------------
			{
				displayName: 'Subscription Id',
				name: 'subscriptionId',
				description: 'The ID of the subscription to cancel',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'cancel',
						],
						resource: [
							'subscription',
						],
					},
				},
			},
			{
				displayName: 'Schedule end of Term',
				name: 'endOfTerm',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'cancel',
						],
						resource: [
							'subscription',
						],
					},
				},
				description: 'If set it will not cancel it directly in will instead schedule the cancelation for the end of the term',
			},

			// ----------------------------------
			//         subscription:delete
			// ----------------------------------
			{
				displayName: 'Subscription Id',
				name: 'subscriptionId',
				description: 'The ID of the subscription to delete',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'subscription',
						],
					},
				},
			},

		],
	};



	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let item: INodeExecutionData;

		const credentials = await this.getCredentials('chargebeeApi');

		const baseUrl = `https://${credentials.accountName}.chargebee.com/api/v2`;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			try {
				item = items[i];
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let requestMethod = 'GET';
				let endpoint = '';
				body = {};
				qs = {};
				if (resource === 'customer') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';

						const properties = this.getNodeParameter('properties', i, {}) as IDataObject;

						for (const key of Object.keys(properties)) {
							if (key === 'customProperties' && (properties.customProperties as IDataObject).property !== undefined) {
								for (const customProperty of (properties.customProperties as IDataObject)!.property! as CustomProperty[]) {
									qs[customProperty.name] = customProperty.value;
								}
							} else {
								qs[key] = properties[key];
							}
						}

						endpoint = `customers`;
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
					}

				} else if (resource === 'invoice') {
					if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						endpoint = 'invoices';
						// TODO: Make also sorting configurable
						qs['sort_by[desc]'] = 'date';

						qs.limit = this.getNodeParameter('maxResults', i, {});

						const setFilters: FilterValues = this.getNodeParameter('filters', i, {}) as unknown as FilterValues;

						let filter: FilterValue;
						let value: NodeParameterValue;

						for (const filterProperty of Object.keys(setFilters)) {
							for (filter of setFilters[filterProperty]) {
								value = filter.value;
								if (filterProperty === 'date') {
									value = Math.floor(new Date(value as string).getTime() / 1000);
								}
								qs[`${filterProperty}[${filter.operation}]`] = value;
							}
						}
					} else if (operation === 'pdfUrl') {
						// ----------------------------------
						//         pdfUrl
						// ----------------------------------

						requestMethod = 'POST';
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						endpoint = `invoices/${invoiceId.trim()}/pdf`;
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
					}

				} else if (resource === 'subscription') {
					if (operation === 'cancel') {
						// ----------------------------------
						//         cancel
						// ----------------------------------

						requestMethod = 'POST';

						const subscriptionId = this.getNodeParameter('subscriptionId', i, '') as string;
						body.end_of_term = this.getNodeParameter('endOfTerm', i, false) as boolean;

						endpoint = `subscriptions/${subscriptionId.trim()}/cancel`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'POST';

						const subscriptionId = this.getNodeParameter('subscriptionId', i, '') as string;

						endpoint = `subscriptions/${subscriptionId.trim()}/delete`;
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}

				const options = {
					method: requestMethod,
					body,
					qs,
					uri: `${baseUrl}/${endpoint}`,
					auth: {
						user: credentials.apiKey as string,
						pass: '',
					},
					json: true,
				};

				let responseData;

				try {
					responseData = await this.helpers.request!(options);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}

				if (resource === 'invoice' && operation === 'list') {
					responseData.list.forEach((data: IDataObject) => {
						returnData.push(data.invoice as IDataObject);
					});
				} else if (resource === 'invoice' && operation === 'pdfUrl') {
					const data: IDataObject = {};
					Object.assign(data, items[i].json);

					data.pdfUrl = responseData.download.download_url;
					returnData.push(data);
				} else {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
