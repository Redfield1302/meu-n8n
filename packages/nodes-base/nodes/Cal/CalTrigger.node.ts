import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	calApiRequest,
} from './GenericFunctions';

export class CalTrigger implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Cal Trigger',
			name: 'calTrigger',
			icon: 'file:cal.svg',
			group: ['trigger'],
			version: 1,
			subtitle: '={{$parameter["event"]}}',
			description: 'Handle Cal events via webhooks',
			defaults: {
					name: 'Cal Trigger',
					color: '#888',
			},
			inputs: [],
			outputs: ['main'],
			credentials: [
				{
					name: 'calApi',
					required: true,
				},
			],
			webhooks: [
					{
							name: 'default',
							httpMethod: 'POST',
							responseMode: 'onReceived',
							path: 'webhook',
					},
			],
			properties: [
				{
					displayName: 'Events',
					name: 'events',
					type: 'multiOptions',
					options: [
						{
							name: 'Booking Created',
							value: 'BOOKING_CREATED',
							description: 'Receive notifications when a new Cal event is created',
						},
						{
							name: 'Booking Cancelled',
							value: 'BOOKING_CANCELLED',
							description: 'Receive notifications when a Cal event is canceled',
						},
						{
							name: 'Booking Rescheduled',
							value: 'BOOKING_RESCHEDULED',
							description: 'Receive notifications when a Cal event is rescheduled',
						},
					],
					default: [],
					required: true,
				},
			],
	};
	
	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/hooks';
				const data = await calApiRequest.call(this, 'GET', endpoint, {});
				for (const webhook of data) {
					if (webhook.subscriberUrl === webhookUrl) {
						for (const event of events) {
							if (!webhook.eventTriggers.includes(event)) {
								return false;
							}
						}
						// Set webhook-id to be sure that it can be deleted
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriberUrl = this.getNodeWebhookUrl('default');
				const eventTriggers = this.getNodeParameter('events') as string;
				const active = true;

				const endpoint = '/hooks';

				const body = {
					subscriberUrl,
					eventTriggers,
					active,
				};

				const responseData = await calApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				console.log("webhookData=> ", webhookData);
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/hooks/${webhookData.webhookId}`;

					try {
						await calApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    return {
        workflowData: [
            this.helpers.returnJsonArray(req.body),
        ],
		};
	}
}
