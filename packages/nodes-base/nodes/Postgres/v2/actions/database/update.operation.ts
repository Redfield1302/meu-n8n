import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import type {
	PgpDatabase,
	QueriesRunner,
	QueryValues,
	QueryWithValues,
} from '../../helpers/interfaces';

import {
	addReturning,
	checkItemAgainstSchema,
	getTableSchema,
	prepareItem,
	replaceEmptyStringsByNulls,
} from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties names exactly match the table column names',
			},
			{
				name: 'Map Each Column Manually',
				value: 'defineBelow',
				description: 'Set the value for each destination column manually',
			},
		],
		default: 'autoMapInputData',
		description:
			'Whether to map node input properties and the table data automatically or manually',
		displayOptions: {
			show: {
				'@version': [2],
			},
		},
	},
	{
		displayName: `
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use a 'Set' node before this node to change the field names.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['autoMapInputData'],
				'@version': [2],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column to Match On',
		name: 'columnToMatchOn',
		type: 'options',
		required: true,
		description:
			'The column to compare when finding the rows to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['schema.value', 'table.value'],
		},
		default: '',
		hint: 'The column that identifies the row(s) to modify',
		displayOptions: {
			show: {
				'@version': [2],
			},
		},
	},
	{
		displayName: 'Value of Column to Match On',
		name: 'valueToMatchOn',
		type: 'string',
		default: '',
		description:
			'Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated',
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
				'@version': [2],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'valuesToSend',
		placeholder: 'Add Value',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Value',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
				'@version': [2],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getColumnsWithoutColumnToMatchOn',
							loadOptionsDependsOn: ['schema.value', 'table.value'],
						},
						default: [],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			values: {},
		},
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'add',
				fieldWords: {
					singular: 'column',
					plural: 'columns,',
				},
				addAllFields: true,
				noFieldsError: 'No columns found in the database',
				multiKeyMatch: true,
			},
		},
		displayOptions: {
			show: {
				'@version': [3],
			},
		},
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['update'],
	},
	hide: {
		table: [''],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: IDataObject,
	db: PgpDatabase,
): Promise<INodeExecutionData[]> {
	items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings as boolean);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const nodeVersion = this.getNode().typeVersion;
		const columnToMatchOn =
			nodeVersion === 2
				? (this.getNodeParameter('columnToMatchOn', i) as string)
				: (this.getNodeParameter('columns.match', i) as string);

		const dataMode =
			nodeVersion === 2
				? (this.getNodeParameter('dataMode', i) as string)
				: (this.getNodeParameter('columns.mappingMode', i) as string);

		let item: IDataObject = {};
		let valueToMatchOn: string | IDataObject = '';

		if (dataMode === 'autoMapInputData') {
			item = items[i].json;
			valueToMatchOn = item[columnToMatchOn] as string;
		}

		if (dataMode === 'defineBelow') {
			const valuesToSend =
				nodeVersion === 2
					? ((this.getNodeParameter('valuesToSend', i, []) as IDataObject).values as IDataObject[])
					: ((this.getNodeParameter('columns.values', i, []) as IDataObject)
							.values as IDataObject[]);

			item = prepareItem(valuesToSend);

			valueToMatchOn = this.getNodeParameter('valueToMatchOn', i) as string;
		}

		const tableSchema = await getTableSchema(db, schema, table);

		item = checkItemAgainstSchema(this.getNode(), item, tableSchema, i);

		let values: QueryValues = [schema, table];

		let valuesLength = values.length + 1;

		const condition = `$${valuesLength}:name = $${valuesLength + 1}`;
		valuesLength = valuesLength + 2;
		values.push(columnToMatchOn, valueToMatchOn);

		const updateColumns = Object.keys(item).filter((column) => column !== columnToMatchOn);

		const updates: string[] = [];

		for (const column of updateColumns) {
			updates.push(`$${valuesLength}:name = $${valuesLength + 1}`);
			valuesLength = valuesLength + 2;
			values.push(column, item[column] as string);
		}

		let query = `UPDATE $1:name.$2:name SET ${updates.join(', ')} WHERE ${condition}`;

		const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']) as string[];

		[query, values] = addReturning(query, outputColumns, values);

		queries.push({ query, values });
	}

	return runQueries(queries, items, nodeOptions);
}
