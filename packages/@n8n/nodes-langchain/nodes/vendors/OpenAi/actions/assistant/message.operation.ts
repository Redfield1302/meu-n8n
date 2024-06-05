import { AgentExecutor } from 'langchain/agents';

import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import type { OpenAIToolType } from 'langchain/dist/experimental/openai_assistant/schema';
import { OpenAI as OpenAIClient } from 'openai';

import { NodeConnectionType, NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import type { BufferWindowMemory } from 'langchain/memory';
import omit from 'lodash/omit';
import type { BaseMessage } from '@langchain/core/messages';
import { formatToOpenAIAssistantTool } from '../../helpers/utils';
import { assistantRLC } from '../descriptions';

import { getConnectedTools } from '../../../../../utils/helpers';
import { getTracingConfig } from '../../../../../utils/tracing';

const properties: INodeProperties[] = [
	assistantRLC,
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'options',
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Take from previous node automatically',
				value: 'auto',
				description: 'Looks for an input field called chatInput',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Define below',
				value: 'define',
				description: 'Use an expression to reference data in previous nodes or enter static text',
			},
		],
		default: 'auto',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		placeholder: 'e.g. Hello, how can you help me?',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				prompt: ['define'],
			},
		},
	},
	{
		displayName: 'Connect your own custom n8n tools to this node on the canvas',
		name: 'noticeTools',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Base URL',
				name: 'baseURL',
				default: 'https://api.openai.com/v1',
				description: 'Override the default base URL for the API',
				type: 'string',
			},
			{
				displayName: 'Max Retries',
				name: 'maxRetries',
				default: 2,
				description: 'Maximum number of retries to attempt',
				type: 'number',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				default: 10000,
				description: 'Maximum amount of time a request is allowed to take in milliseconds',
				type: 'number',
			},
			{
				displayName: 'Preserve Original Tools',
				name: 'preserveOriginalTools',
				type: 'boolean',
				default: true,
				description:
					'Whether to preserve the original tools of the assistant after the execution of this node, otherwise the tools will be replaced with the connected tools, if any, default is true',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['assistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
const mapChatMessageToThreadMessage = (
	message: BaseMessage,
): OpenAIClient.Beta.Threads.ThreadCreateParams.Message => ({
	role: message._getType() === 'ai' ? 'assistant' : 'user',
	content: message.content.toString(),
});

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('openAiApi');
	const nodeVersion = this.getNode().typeVersion;

	const prompt = this.getNodeParameter('prompt', i) as string;

	let input;
	if (prompt === 'auto') {
		input = this.evaluateExpression('{{ $json["chatInput"] }}', i) as string;
	} else {
		input = this.getNodeParameter('text', i) as string;
	}

	if (input === undefined) {
		throw new NodeOperationError(this.getNode(), 'No prompt specified', {
			description:
				"Expected to find the prompt in an input field called 'chatInput' (this is what the chat trigger node outputs). To use something else, change the 'Prompt' parameter",
		});
	}

	const assistantId = this.getNodeParameter('assistantId', i, '', { extractValue: true }) as string;

	const options = this.getNodeParameter('options', i, {}) as {
		baseURL?: string;
		maxRetries: number;
		timeout: number;
		preserveOriginalTools?: boolean;
	};

	const client = new OpenAIClient({
		apiKey: credentials.apiKey as string,
		maxRetries: options.maxRetries ?? 2,
		timeout: options.timeout ?? 10000,
		baseURL: options.baseURL,
	});

	const agent = new OpenAIAssistantRunnable({ assistantId, client, asAgent: true });

	const tools = await getConnectedTools(this, nodeVersion > 1);
	let assistantTools;

	if (tools.length) {
		const transformedConnectedTools = tools?.map(formatToOpenAIAssistantTool) ?? [];
		const nativeToolsParsed: OpenAIToolType = [];

		assistantTools = (await client.beta.assistants.retrieve(assistantId)).tools;

		const useCodeInterpreter = assistantTools.some((tool) => tool.type === 'code_interpreter');
		if (useCodeInterpreter) {
			nativeToolsParsed.push({
				type: 'code_interpreter',
			});
		}

		const useRetrieval = assistantTools.some((tool) => tool.type === 'file_search');
		if (useRetrieval) {
			nativeToolsParsed.push({
				type: 'file_search',
			});
		}

		await client.beta.assistants.update(assistantId, {
			tools: [...nativeToolsParsed, ...transformedConnectedTools],
		});
	}

	const agentExecutor = AgentExecutor.fromAgentAndTools({
		agent,
		tools: tools ?? [],
	});

	const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
		| BufferWindowMemory
		| undefined;

	const chainValues: IDataObject = {
		content: input,
		signal: this.getExecutionCancelSignal(),
		timeout: options.timeout ?? 10000,
	};
	let thread: OpenAIClient.Beta.Threads.Thread;
	if (memory) {
		const chatMessages = await memory.chatHistory.getMessages();

		// Construct a new thread from the chat history to map the memory
		if (chatMessages.length) {
			const first32Messages = chatMessages.slice(0, 32);
			// There is a undocumented limit of 32 messages per thread when creating a thread with messages
			const mappedMessages: OpenAIClient.Beta.Threads.ThreadCreateParams.Message[] =
				first32Messages.map(mapChatMessageToThreadMessage);

			thread = await client.beta.threads.create({ messages: mappedMessages });
			const overLimitMessages = chatMessages.slice(32).map(mapChatMessageToThreadMessage);

			// Send the remaining messages that exceed the limit of 32 sequentially
			for (const message of overLimitMessages) {
				await client.beta.threads.messages.create(thread.id, message);
			}

			chainValues.threadId = thread.id;
		}
	}

	const response = await agentExecutor.withConfig(getTracingConfig(this)).invoke(chainValues);
	if (memory) {
		await memory.saveContext({ input }, { output: response.output });

		if (response.threadId && response.runId) {
			const threadRun = await client.beta.threads.runs.retrieve(response.threadId, response.runId);
			response.usage = threadRun.usage;
		}
	}

	if (
		options.preserveOriginalTools !== false &&
		nodeVersion >= 1.3 &&
		(assistantTools ?? [])?.length
	) {
		await client.beta.assistants.update(assistantId, {
			tools: assistantTools,
		});
	}
	const filteredResponse = omit(response, ['signal', 'timeout']);
	return [{ json: filteredResponse, pairedItem: { item: i } }];
}
