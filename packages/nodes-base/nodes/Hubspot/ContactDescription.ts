import {
	INodeProperties,
 } from 'n8n-workflow';

export const contactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create/Update',
				value: 'upsert',
				description: 'Create/Update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
			},
			{
				name: 'Get Recently Created/Updated',
				value: 'getRecentlyCreatedUpdated',
				description: 'Get recently created/updated contacts',
			},
		],
		default: 'upsert',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [

/* -------------------------------------------------------------------------- */
/*                                contact:upsert                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: true,
		description: 'By default the response only includes the ID. If this option gets activated it<br />will resolve the data automatically.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'upsert',
				],
			},
		},
		options: [
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Associated Company ID',
				name: 'associatedCompanyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:'getCompanies' ,
				},
				default: '',
				description: 'Companies associated with the ticket'
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Clicked Facebook Ad',
				name: 'clickedFacebookAd',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company Size',
				name: 'companySize',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact Owner',
				name: 'contactOwner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
			},
			{
				displayName: 'Country/Region',
				name: 'country',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Date of Birth',
				name: 'dateOfBirth',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Degree',
				name: 'degree',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Facebook Click ID',
				name: 'facebookClickId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax Number',
				name: 'faxNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Field Of Study',
				name: 'fieldOfStudy',
				type: 'string',
				default: '',
				description: `A contact's field of study. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`,
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: `A contact's first name`,
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Google Ad Click ID',
				name: 'googleAdClickId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Graduation Date',
				name: 'graduationDate',
				type: 'dateTime',
				default: '',
				description: `A contact's graduation date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`,
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The industry a contact is in',
			},
			{
				displayName: 'Job Function',
				name: 'jobFunction',
				type: 'string',
				default: '',
				description: `A contact's job function. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`,
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: `A contact's job title`,
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: `A contact's last name`,
			},
			{
				displayName: 'Lead Status',
				name: 'leadStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLeadStatuses',
				},
				default: '',
				description: `The contact's sales, prospecting or outreach status`,
			},
			{
				displayName: 'Legal Basic For Processing Contact Data',
				name: 'processingContactData',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLealBasics',
				},
				default: '',
				description: `Legal basis for processing contact's data; 'Not applicable' will exempt the contact from GDPR protections`,
			},
			{
				displayName: 'Lifecycle Stage',
				name: 'lifeCycleStage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLifeCycleStages'
				},
				default: '',
				description: `The qualification of contacts to sales readiness. It can be set through imports, forms, workflows, and manually on a per contact basis.`,
			},
			{
				displayName: 'Marital Status',
				name: 'maritalStatus',
				type: 'string',
				default: '',
				description: `A contact's marital status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`,
			},
			{
				displayName: 'Membership Note',
				name: 'membershipNote',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `The notes relating to the contact's content membership.`,
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'A default property to be used for any message or comments a contact may want to leave on a form.',
			},
			{
				displayName: 'Mobile Phone Number',
				name: 'mobilePhoneNumber',
				type: 'string',
				default: '',
				description: `A contact's mobile phone number`,
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactNumberOfEmployees',
				},
				default: '',
				description: 'The number of company employees',
			},
			{
				displayName: 'Original Source',
				name: 'originalSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactOriginalSources',
				},
				default: '',
				description: `The first known source through which a contact found your website. Source is automatically set by HubSpot, but may be updated manually.`,
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: `A contact's primary phone number`
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				displayOptions: {
					show: {
						'/resolveData': [
							true,
						],
					},
				},
				default: '',
				description: `Used to include specific company properties in the results.<br/>
				By default, the results will only include company ID and will not include the values for any properties for your companys.<br/>
				Including this parameter will include the data for the specified property in the results.<br/>
				You can include this parameter multiple times to request multiple properties separed by ,.`,
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: `The contact's zip code. This might be set via import, form, or integration.`
			},
			{
				displayName: 'Preffered Language',
				name: 'prefferedLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactPrefferedLanguages',
				},
				default: '',
				description: `Set your contact's preferred language for communications. This property can be changed from an import, form, or integration.`
			},
			{
				displayName: 'Relationship Status',
				name: 'relationshipStatus',
				type: 'string',
				default: '',
				description: `A contact's relationship status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
				description: `The title used to address a contact`
			},
			{
				displayName: 'School',
				name: 'school',
				type: 'string',
				default: '',
				description: `A contact's school. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`
			},
			{
				displayName: 'Seniority',
				name: 'seniority',
				type: 'string',
				default: '',
				description: `A contact's seniority. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: `A contact's start date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`
			},
			{
				displayName: 'State/Region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description: `The contact's state of residence. This might be set via import, form, or integration.`
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactStatuses',
				},
				default: '',
				description: `The status of the contact's content membership.`
			},
			{
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description: `A contact's street address, including apartment or unit #`
			},
			{
				displayName: 'Twitter Username',
				name: 'twitterUsername',
				type: 'string',
				default: '',
				description: `The contact's Twitter handle. This is set by HubSpot using the contact's email address.`
			},
			{
				displayName: 'Website URL',
				name: 'websiteUrl',
				type: 'string',
				default: '',
				description: `The contact's company website`
			},
			{
				displayName: 'Work Email',
				name: 'workEmail',
				type: 'string',
				default: '',
				description: `A contact's work email. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool`
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                  contact:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Form Submission Mode',
				name: 'formSubmissionMode',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Newest',
						value: 'newest',
					},
					{
						name: 'Oldest',
						value: 'oldest',
					},
				],
				default: 'all',
				description: `Specify which form submissions should be fetched.`,
			},
			{
				displayName: 'List Memberships',
				name: 'listMerberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact.',
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: '',
				description: `Used to include specific company properties in the results.<br/>
				By default, the results will only include company ID and will not include the values for any properties for your companys.<br/>
				Including this parameter will include the data for the specified property in the results.<br/>
				You can include this parameter multiple times to request multiple properties separed by ,.`,
			},
			{
				displayName: 'Property Mode',
				name: 'propertyMode',
				type: 'options',
				options: [
					{
						name: 'Value And History',
						value: 'valueAndHistory',
					},
					{
						name: 'Value Only',
						value: 'valueOnly',
					},
				],
				default: 'valueAndHistory',
				description: `Specify if the current value for a property should be fetched, or the value and all the historical values for that property.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 contact:getAll                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
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
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Form Submission Mode',
				name: 'formSubmissionMode',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Newest',
						value: 'newest',
					},
					{
						name: 'Oldest',
						value: 'oldest',
					},
				],
				default: 'all',
				description: `Specify which form submissions should be fetched.`,
			},
			{
				displayName: 'List Memberships',
				name: 'listMerberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact.',
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: '',
				description: `Used to include specific company properties in the results.<br/>
				By default, the results will only include company ID and will not include the values for any properties for your companys.<br/>
				Including this parameter will include the data for the specified property in the results.<br/>
				You can include this parameter multiple times to request multiple properties separed by ,.`,
			},
			{
				displayName: 'Property Mode',
				name: 'propertyMode',
				type: 'options',
				options: [
					{
						name: 'Value And History',
						value: 'valueAndHistory',
					},
					{
						name: 'Value Only',
						value: 'valueOnly',
					},
				],
				default: 'valueAndHistory',
				description: `Specify if the current value for a property should be fetched, or the value and all the historical values for that property.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 contact:delete                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
/* -------------------------------------------------------------------------- */
/*               contact:getRecentlyCreatedUpdated                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getRecentlyCreatedUpdated',
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
				resource: [
					'contact',
				],
				operation: [
					'getRecentlyCreatedUpdated',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getRecentlyCreatedUpdated',
				],
			},
		},
		options: [
			{
				displayName: 'Form Submission Mode',
				name: 'formSubmissionMode',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Newest',
						value: 'newest',
					},
					{
						name: 'Oldest',
						value: 'oldest',
					},
				],
				default: 'all',
				description: `Specify which form submissions should be fetched.`,
			},
			{
				displayName: 'List Memberships',
				name: 'listMerberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact.',
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: '',
				description: `Used to include specific company properties in the results.<br/>
				By default, the results will only include company ID and will not include the values for any properties for your companys.<br/>
				Including this parameter will include the data for the specified property in the results.<br/>
				You can include this parameter multiple times to request multiple properties separed by ,.`,
			},
			{
				displayName: 'Property Mode',
				name: 'propertyMode',
				type: 'options',
				options: [
					{
						name: 'Value And History',
						value: 'valueAndHistory',
					},
					{
						name: 'Value Only',
						value: 'valueOnly',
					},
				],
				default: 'valueAndHistory',
				description: `Specify if the current value for a property should be fetched, or the value and all the historical values for that property.`,
			},
		],
	},
] as INodeProperties[];
