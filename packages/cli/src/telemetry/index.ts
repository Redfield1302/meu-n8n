/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type RudderStack from '@rudderstack/rudder-sdk-node';
import type { PostHogClient } from '../posthog';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import config from '@/config';
import type { IExecutionTrackProperties } from '@/Interfaces';
import { getLogger } from '@/Logger';
import { getLicense } from '@/License';
import { LicenseService } from '@/license/License.service';
import { N8N_VERSION } from '@/constants';

type ExecutionTrackDataKey = 'manual_error' | 'manual_success' | 'prod_error' | 'prod_success';

interface IExecutionTrackData {
	count: number;
	first: Date;
}

interface IExecutionsBuffer {
	[workflowId: string]: {
		manual_error?: IExecutionTrackData;
		manual_success?: IExecutionTrackData;
		prod_error?: IExecutionTrackData;
		prod_success?: IExecutionTrackData;
		user_id: string | undefined;
	};
}

export class Telemetry {
	private rudderStack?: RudderStack;

	private pulseIntervalReference: NodeJS.Timeout;

	private executionCountsBuffer: IExecutionsBuffer = {};

	constructor(private instanceId: string, private postHog: PostHogClient) {}

	async init() {
		const enabled = config.getEnv('diagnostics.enabled');
		if (enabled) {
			const conf = config.getEnv('diagnostics.config.backend');
			const [key, url] = conf.split(';');

			if (!key || !url) {
				const logger = getLogger();
				LoggerProxy.init(logger);
				logger.warn('Diagnostics backend config is invalid');
				return;
			}

			const logLevel = config.getEnv('logs.level');

			// eslint-disable-next-line @typescript-eslint/naming-convention
			const { default: RudderStack } = await import('@rudderstack/rudder-sdk-node');
			this.rudderStack = new RudderStack(key, url, { logLevel });

			this.startPulse();
		}
	}

	private startPulse() {
		this.pulseIntervalReference = setInterval(async () => {
			void this.pulse();
		}, 6 * 60 * 60 * 1000); // every 6 hours
	}

	private async pulse(): Promise<unknown> {
		if (!this.rudderStack) {
			return Promise.resolve();
		}

		const allPromises = Object.keys(this.executionCountsBuffer).map(async (workflowId) => {
			const promise = this.track(
				'Workflow execution count',
				{
					event_version: '2',
					workflow_id: workflowId,
					...this.executionCountsBuffer[workflowId],
				},
				{ withPostHog: true },
			);

			return promise;
		});

		this.executionCountsBuffer = {};

		// License info
		const pulsePacket = {
			plan_name_current: getLicense().getPlanName(),
			quota: getLicense().getTriggerLimit(),
			usage: await LicenseService.getActiveTriggerCount(),
		};
		allPromises.push(this.track('pulse', pulsePacket));
		return Promise.all(allPromises);
	}

	async trackWorkflowExecution(properties: IExecutionTrackProperties): Promise<void> {
		if (this.rudderStack) {
			const execTime = new Date();
			const workflowId = properties.workflow_id;

			this.executionCountsBuffer[workflowId] = this.executionCountsBuffer[workflowId] ?? {
				user_id: properties.user_id,
			};

			const key: ExecutionTrackDataKey = `${properties.is_manual ? 'manual' : 'prod'}_${
				properties.success ? 'success' : 'error'
			}`;

			if (!this.executionCountsBuffer[workflowId][key]) {
				this.executionCountsBuffer[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				this.executionCountsBuffer[workflowId][key]!.count++;
			}

			if (!properties.success && properties.error_node_type?.startsWith('n8n-nodes-base')) {
				void this.track('Workflow execution errored', properties);
			}
		}
	}

	async trackN8nStop(): Promise<void> {
		clearInterval(this.pulseIntervalReference);
		void this.track('User instance stopped');
		return new Promise<void>(async (resolve) => {
			await this.postHog.stop();

			if (this.rudderStack) {
				this.rudderStack.flush(resolve);
			} else {
				resolve();
			}
		});
	}

	async identify(traits?: {
		[key: string]: string | number | boolean | object | undefined | null;
	}): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.rudderStack) {
				this.rudderStack.identify(
					{
						userId: this.instanceId,
						traits: {
							...traits,
							instanceId: this.instanceId,
						},
					},
					resolve,
				);
			} else {
				resolve();
			}
		});
	}

	async track(
		eventName: string,
		properties: ITelemetryTrackProperties = {},
		{ withPostHog } = { withPostHog: false }, // whether to additionally track with PostHog
	): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.rudderStack) {
				const { user_id } = properties;
				const updatedProperties: ITelemetryTrackProperties = {
					...properties,
					instance_id: this.instanceId,
					version_cli: N8N_VERSION,
				};

				const payload = {
					userId: `${this.instanceId}${user_id ? `#${user_id}` : ''}`,
					event: eventName,
					properties: updatedProperties,
				};

				if (withPostHog) {
					this.postHog?.track(payload);
				}

				return this.rudderStack.track(payload, resolve);
			}

			return resolve();
		});
	}

	// test helpers
	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}
}
